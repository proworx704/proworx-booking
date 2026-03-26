/**
 * Ad Sync — Pulls live campaign metrics from Google Ads & Meta Ads APIs
 *
 * Fully self-contained: runs inside Convex actions, no external dependencies.
 * Credentials stored in systemSettings table:
 *   - google_ads_refresh_token, google_ads_client_id, google_ads_client_secret,
 *     google_ads_developer_token, google_ads_customer_id
 *   - meta_ads_access_token, meta_ads_account_id
 */
import { v } from "convex/values";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE ADS — REST API via OAuth2
// ═══════════════════════════════════════════════════════════════════════════

async function getGoogleAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google OAuth failed: ${err}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function runGoogleAdsQuery(
  accessToken: string,
  developerToken: string,
  customerId: string,
  gaqlQuery: string,
): Promise<any[]> {
  const resp = await fetch(
    `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
      },
      body: JSON.stringify({ query: gaqlQuery }),
    },
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Ads API error: ${err}`);
  }
  const data = await resp.json();
  // searchStream returns array of batches
  const results: any[] = [];
  for (const batch of data) {
    if (batch.results) results.push(...batch.results);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// META ADS — Graph API
// ═══════════════════════════════════════════════════════════════════════════

async function fetchMetaCampaignInsights(
  accessToken: string,
  adAccountId: string,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const fields = "campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,actions,cost_per_action_type";
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const url =
    `https://graph.facebook.com/v21.0/${adAccountId}/insights` +
    `?fields=${fields}` +
    `&time_range=${encodeURIComponent(timeRange)}` +
    `&time_increment=1` +  // daily breakdown
    `&level=campaign` +
    `&limit=500` +
    `&access_token=${accessToken}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }
  const data = await resp.json();
  return data.data || [];
}

async function fetchMetaCampaigns(
  accessToken: string,
  adAccountId: string,
): Promise<Record<string, string>> {
  const url =
    `https://graph.facebook.com/v21.0/${adAccountId}/campaigns` +
    `?fields=id,name,status&limit=100&access_token=${accessToken}`;
  const resp = await fetch(url);
  if (!resp.ok) return {};
  const data = await resp.json();
  const statusMap: Record<string, string> = {};
  for (const c of data.data || []) {
    statusMap[c.id] = c.status;
  }
  return statusMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC ACTIONS — Called from the dashboard "Sync" button
// ═══════════════════════════════════════════════════════════════════════════

// Internal query to get settings
const getSetting = async (ctx: any, key: string): Promise<string | null> => {
  const row = await ctx.runQuery(internal.systemSettings.getInternal, { key });
  return row ?? null;
};

/**
 * Sync Google Ads campaign data for a date range
 */
export const syncGoogleAds = internalAction({
  args: {
    startDate: v.optional(v.string()), // YYYY-MM-DD, defaults to 30 days ago
    endDate: v.optional(v.string()),   // YYYY-MM-DD, defaults to today
  },
  handler: async (ctx, args) => {
    // Load credentials from systemSettings
    const [clientId, clientSecret, refreshToken, developerToken, customerId] =
      await Promise.all([
        getSetting(ctx, "google_ads_client_id"),
        getSetting(ctx, "google_ads_client_secret"),
        getSetting(ctx, "google_ads_refresh_token"),
        getSetting(ctx, "google_ads_developer_token"),
        getSetting(ctx, "google_ads_customer_id"),
      ]);

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      return {
        success: false,
        error: "Google Ads credentials not configured. Go to Settings → Ad Integrations to set up.",
        missing: [
          !clientId && "google_ads_client_id",
          !clientSecret && "google_ads_client_secret",
          !refreshToken && "google_ads_refresh_token",
          !developerToken && "google_ads_developer_token",
          !customerId && "google_ads_customer_id",
        ].filter(Boolean),
      };
    }

    try {
      // Get access token
      const accessToken = await getGoogleAccessToken(clientId, clientSecret, refreshToken);

      // Calculate date range
      const end = args.endDate || new Date().toISOString().slice(0, 10);
      const start =
        args.startDate ||
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      // Query campaign performance with daily breakdown
      const gaql = `
        SELECT
          campaign.id, campaign.name, campaign.status,
          segments.date,
          metrics.impressions, metrics.clicks, metrics.ctr,
          metrics.average_cpc, metrics.cost_micros,
          metrics.conversions, metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date BETWEEN '${start}' AND '${end}'
          AND campaign.status != 'REMOVED'
        ORDER BY segments.date ASC
      `;

      const results = await runGoogleAdsQuery(accessToken, developerToken, customerId, gaql);

      // Transform to our format
      const metrics = results.map((r: any) => ({
        platform: "google_ads" as const,
        campaignId: `google_${r.campaign.id}`,
        campaignName: r.campaign.name,
        campaignStatus: r.campaign.status,
        date: r.segments.date,
        impressions: parseInt(r.metrics.impressions || "0"),
        clicks: parseInt(r.metrics.clicks || "0"),
        cost: Math.round((parseInt(r.metrics.costMicros || "0") / 1000000) * 100), // micros → cents
        conversions: Math.round(r.metrics.conversions || 0),
        ctr: r.metrics.ctr || 0,
        avgCpc: Math.round((parseInt(r.metrics.averageCpc || "0") / 1000000) * 100),
        costPerConversion: Math.round(
          ((r.metrics.costPerConversion || 0) / 1000000) * 100,
        ),
      }));

      // Save to database
      if (metrics.length > 0) {
        // Batch in chunks of 50 to avoid hitting limits
        for (let i = 0; i < metrics.length; i += 50) {
          const chunk = metrics.slice(i, i + 50);
          await ctx.runMutation(internal.adSync.bulkUpsertMetrics, { metrics: chunk });
        }

        // Auto-update monthly ad spend
        const months = [...new Set(metrics.map((m) => m.date.substring(0, 7)))];
        for (const month of months) {
          await ctx.runMutation(internal.adSync.recalcMonthlySpend, { month });
        }
      }

      return {
        success: true,
        synced: metrics.length,
        dateRange: { start, end },
        campaigns: [...new Set(metrics.map((m) => m.campaignName))],
      };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  },
});

/**
 * Sync Meta (Facebook/Instagram) Ads campaign data
 */
export const syncMetaAds = internalAction({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [accessToken, adAccountId] = await Promise.all([
      getSetting(ctx, "meta_ads_access_token"),
      getSetting(ctx, "meta_ads_account_id"),
    ]);

    if (!accessToken || !adAccountId) {
      return {
        success: false,
        error: "Meta Ads credentials not configured. Go to Settings → Ad Integrations to set up.",
        missing: [
          !accessToken && "meta_ads_access_token",
          !adAccountId && "meta_ads_account_id",
        ].filter(Boolean),
      };
    }

    try {
      const end = args.endDate || new Date().toISOString().slice(0, 10);
      const start =
        args.startDate ||
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      // Get campaign statuses
      const accountPrefix = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
      const campaignStatuses = await fetchMetaCampaigns(accessToken, accountPrefix);

      // Get daily insights
      const insights = await fetchMetaCampaignInsights(
        accessToken,
        accountPrefix,
        start,
        end,
      );

      // Transform to our format
      const metrics = insights.map((row: any) => {
        const conversions = (row.actions || []).find(
          (a: any) => a.action_type === "offsite_conversion.fb_pixel_lead" ||
            a.action_type === "lead" ||
            a.action_type === "onsite_conversion.messaging_conversation_started_7d",
        );
        const costPerConv = (row.cost_per_action_type || []).find(
          (a: any) => a.action_type === "lead",
        );

        return {
          platform: "meta_ads" as const,
          campaignId: `meta_${row.campaign_id}`,
          campaignName: row.campaign_name,
          campaignStatus: campaignStatuses[row.campaign_id] || "UNKNOWN",
          date: row.date_start,
          impressions: parseInt(row.impressions || "0"),
          clicks: parseInt(row.clicks || "0"),
          cost: Math.round(parseFloat(row.spend || "0") * 100), // dollars → cents
          conversions: parseInt(conversions?.value || "0"),
          ctr: parseFloat(row.ctr || "0") / 100, // Meta returns as percentage
          avgCpc: Math.round(parseFloat(row.cpc || "0") * 100),
          costPerConversion: Math.round(parseFloat(costPerConv?.value || "0") * 100),
        };
      });

      if (metrics.length > 0) {
        for (let i = 0; i < metrics.length; i += 50) {
          const chunk = metrics.slice(i, i + 50);
          await ctx.runMutation(internal.adSync.bulkUpsertMetrics, { metrics: chunk });
        }
        const months = [...new Set(metrics.map((m) => m.date.substring(0, 7)))];
        for (const month of months) {
          await ctx.runMutation(internal.adSync.recalcMonthlySpend, { month });
        }
      }

      return {
        success: true,
        synced: metrics.length,
        dateRange: { start, end },
        campaigns: [...new Set(metrics.map((m) => m.campaignName))],
      };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  },
});

/**
 * Sync all connected ad platforms at once
 */
export const syncAll = action({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, any> = {};

    // Check which platforms have credentials
    const googleConfigured = await getSetting(ctx, "google_ads_customer_id");
    const metaConfigured = await getSetting(ctx, "meta_ads_access_token");

    if (googleConfigured) {
      results.google_ads = await ctx.runAction(internal.adSync.syncGoogleAds, {
        startDate: args.startDate,
        endDate: args.endDate,
      });
    }

    if (metaConfigured) {
      results.meta_ads = await ctx.runAction(internal.adSync.syncMetaAds, {
        startDate: args.startDate,
        endDate: args.endDate,
      });
    }

    if (!googleConfigured && !metaConfigured) {
      return {
        success: false,
        error: "No ad platforms configured. Go to Settings → Ad Integrations.",
      };
    }

    return { success: true, results };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS — Called by sync actions
// ═══════════════════════════════════════════════════════════════════════════

const PLATFORM_VALIDATOR = v.union(
  v.literal("google_ads"),
  v.literal("meta_ads"),
);

export const bulkUpsertMetrics = internalMutation({
  args: {
    metrics: v.array(
      v.object({
        platform: PLATFORM_VALIDATOR,
        campaignId: v.string(),
        campaignName: v.string(),
        campaignStatus: v.string(),
        date: v.string(),
        impressions: v.number(),
        clicks: v.number(),
        cost: v.number(),
        conversions: v.number(),
        ctr: v.number(),
        avgCpc: v.number(),
        costPerConversion: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query("adCampaignMetrics")
        .withIndex("by_campaign_date", (q) =>
          q.eq("campaignId", m.campaignId).eq("date", m.date),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...m, lastSyncedAt: now });
      } else {
        await ctx.db.insert("adCampaignMetrics", { ...m, lastSyncedAt: now });
      }
      count++;
    }
    return count;
  },
});

export const recalcMonthlySpend = internalMutation({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const allMetrics = await ctx.db.query("adCampaignMetrics").collect();
    const monthMetrics = allMetrics.filter((m) => m.date.startsWith(args.month));

    // Aggregate spend by channel
    const channelSpend: Record<string, number> = {};
    for (const m of monthMetrics) {
      let channel: string;
      if (m.platform === "google_ads") {
        channel = m.campaignName.toLowerCase().includes("localservices")
          ? "google_local"
          : "google_ads";
      } else {
        channel = "facebook_ads";
      }
      channelSpend[channel] = (channelSpend[channel] || 0) + m.cost;
    }

    const validChannels = [
      "google_ads", "google_local", "facebook_ads",
      "instagram_ads", "yelp", "other",
    ] as const;

    for (const ch of validChannels) {
      const spend = channelSpend[ch];
      if (!spend) continue;
      const existing = await ctx.db
        .query("adSpend")
        .withIndex("by_channel_month", (q) =>
          q.eq("channel", ch).eq("month", args.month),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          spend,
          notes: "Auto-synced from API",
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("adSpend", {
          channel: ch,
          month: args.month,
          spend,
          notes: "Auto-synced from API",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES — For the dashboard
// ═══════════════════════════════════════════════════════════════════════════

export const liveCampaignPerformance = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    platform: v.optional(PLATFORM_VALIDATOR),
  },
  handler: async (ctx, args) => {
    let metrics = await ctx.db.query("adCampaignMetrics").collect();

    if (args.startDate) metrics = metrics.filter((m) => m.date >= args.startDate!);
    if (args.endDate) metrics = metrics.filter((m) => m.date <= args.endDate!);
    if (args.platform) metrics = metrics.filter((m) => m.platform === args.platform);

    // Aggregate by campaign
    const campaignMap: Record<string, {
      platform: string;
      campaignId: string;
      campaignName: string;
      campaignStatus: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      days: number;
    }> = {};

    for (const m of metrics) {
      if (!campaignMap[m.campaignId]) {
        campaignMap[m.campaignId] = {
          platform: m.platform,
          campaignId: m.campaignId,
          campaignName: m.campaignName,
          campaignStatus: m.campaignStatus,
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          days: 0,
        };
      }
      const c = campaignMap[m.campaignId];
      c.impressions += m.impressions;
      c.clicks += m.clicks;
      c.cost += m.cost;
      c.conversions += m.conversions;
      c.days++;
    }

    const campaigns = Object.values(campaignMap).map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
      avgCpc: c.clicks > 0 ? Math.round(c.cost / c.clicks) : 0,
      costPerConversion: c.conversions > 0 ? Math.round(c.cost / c.conversions) : 0,
      dailyAvgSpend: c.days > 0 ? Math.round(c.cost / c.days) : 0,
    }));

    const totals = {
      totalSpend: campaigns.reduce((s, c) => s + c.cost, 0),
      totalClicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      totalImpressions: campaigns.reduce((s, c) => s + c.impressions, 0),
      totalConversions: campaigns.reduce((s, c) => s + c.conversions, 0),
    };

    const lastSync = metrics.length > 0
      ? Math.max(...metrics.map((m) => m.lastSyncedAt))
      : null;

    return {
      campaigns: campaigns.sort((a, b) => b.cost - a.cost),
      totals,
      lastSync,
      daysOfData: new Set(metrics.map((m) => m.date)).size,
    };
  },
});

export const dailyAdTrend = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    campaignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let metrics = await ctx.db.query("adCampaignMetrics").collect();

    if (args.startDate) metrics = metrics.filter((m) => m.date >= args.startDate!);
    if (args.endDate) metrics = metrics.filter((m) => m.date <= args.endDate!);
    if (args.campaignId) metrics = metrics.filter((m) => m.campaignId === args.campaignId);

    const dayMap: Record<string, { date: string; spend: number; clicks: number; impressions: number; conversions: number }> = {};
    for (const m of metrics) {
      if (!dayMap[m.date]) {
        dayMap[m.date] = { date: m.date, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      }
      dayMap[m.date].spend += m.cost;
      dayMap[m.date].clicks += m.clicks;
      dayMap[m.date].impressions += m.impressions;
      dayMap[m.date].conversions += m.conversions;
    }

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  },
});

// ─── Connection status check ─────────────────────────────────────────────────
export const getConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("systemSettings").collect();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    return {
      googleAds: {
        configured: !!(
          settingsMap["google_ads_client_id"] &&
          settingsMap["google_ads_refresh_token"] &&
          settingsMap["google_ads_developer_token"] &&
          settingsMap["google_ads_customer_id"]
        ),
        customerId: settingsMap["google_ads_customer_id"] || null,
      },
      metaAds: {
        configured: !!(
          settingsMap["meta_ads_access_token"] &&
          settingsMap["meta_ads_account_id"]
        ),
        accountId: settingsMap["meta_ads_account_id"] || null,
      },
    };
  },
});
