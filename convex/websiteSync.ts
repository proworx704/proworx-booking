import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };
const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL!;
const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME!;
const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET!;

/**
 * Mapping from service slug to the category-level booking URL key
 * on the website. When a widget URL is saved, we also update the
 * category-level key for backward compatibility with pages that
 * still use category-level booking URLs instead of per-tier URLs.
 */
const SLUG_TO_CATEGORY_KEY: Record<string, string> = {
  "standard-inside-out": "bookingUrlFullDetail",
  "premium-io-interior": "bookingUrlFullDetail",
  "premium-io-exterior": "bookingUrlFullDetail",
  "elite-inside-out": "bookingUrlFullDetail",
  "standard-interior": "bookingUrlInterior",
  "premium-interior": "bookingUrlInterior",
  "elite-interior": "bookingUrlInterior",
  "standard-exterior": "bookingUrlExterior",
  "premium-exterior": "bookingUrlExterior",
  "elite-exterior": "bookingUrlExterior",
  "1-step-enhancement-polish": "bookingUrlPaintCorrection",
  "2-step-paint-correction": "bookingUrlPaintCorrection",
  "multi-stage-correction": "bookingUrlPaintCorrection",
};

/**
 * Syncs a widget URL from the booking app to the website's CMS (siteConfig).
 * This allows widget URLs set in the booking dashboard to automatically
 * update the corresponding "Book Now" links on the website.
 *
 * Pushes two keys per save:
 * 1. `widgetUrl:{slug}` — per-tier URL used by ServicesPage & PaintCorrectionPage
 * 2. Category-level key (e.g. `bookingUrlFullDetail`) — backward compat fallback
 */
export const pushWidgetUrl = action({
  args: {
    slug: v.string(),
    url: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { slug, url }): Promise<{ success: boolean; error?: string }> => {
    // Get website Convex credentials from systemSettings
    const websiteUrl: string | null = await ctx.runQuery(
      internal.systemSettings.getInternal,
      { key: "website_convex_url" }
    );
    const deployKey: string | null = await ctx.runQuery(
      internal.systemSettings.getInternal,
      { key: "website_convex_deploy_key" }
    );

    if (!websiteUrl) {
      console.error("Website Convex URL not configured in systemSettings");
      return { success: false, error: "Website URL not configured" };
    }

    try {
      // Push to website's CMS siteConfig table
      const cmsKey = `widgetUrl:${slug}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (deployKey) headers.Authorization = `Convex ${deployKey}`;
      const response: Response = await fetch(`${websiteUrl}/api/mutation`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          path: "cms:setConfig",
          args: { key: cmsKey, value: url },
          format: "json",
        }),
      });

      if (!response.ok) {
        const errText: string = await response.text();
        console.error("Website sync failed:", errText);
        return { success: false, error: errText };
      }

      console.log(`Synced widget URL to website: ${cmsKey} = ${url}`);

      // Also update the category-level booking URL for backward compat
      const categoryKey = SLUG_TO_CATEGORY_KEY[slug];
      if (categoryKey) {
        try {
          const catHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (deployKey) catHeaders.Authorization = `Convex ${deployKey}`;
          const catResponse: Response = await fetch(`${websiteUrl}/api/mutation`, {
            method: "POST",
            headers: catHeaders,
            body: JSON.stringify({
              path: "cms:setConfig",
              args: { key: categoryKey, value: url },
              format: "json",
            }),
          });
          if (catResponse.ok) {
            console.log(`Synced category URL to website: ${categoryKey} = ${url}`);
          } else {
            console.warn(`Category sync failed for ${categoryKey}: ${await catResponse.text()}`);
          }
        } catch (catErr: unknown) {
          console.warn("Category sync error (non-blocking):", catErr instanceof Error ? catErr.message : String(catErr));
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Website sync error:", msg);
      return { success: false, error: msg };
    }
  },
});

/**
 * Push review count to the website's CMS AND trigger a git update
 * for hardcoded references in the website source code.
 */
export const pushReviewCount = action({
  args: {
    oldCount: v.string(),
    newCount: v.string(),
    rating: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    cmsUpdated: v.boolean(),
    gitTriggered: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { oldCount, newCount, rating }): Promise<{
    success: boolean;
    cmsUpdated: boolean;
    gitTriggered: boolean;
    error?: string;
  }> => {
    let cmsUpdated = false;
    let gitTriggered = false;

    // 1. Push to website CMS (instant update for Convex-powered pages)
    const websiteUrl: string | null = await ctx.runQuery(
      internal.systemSettings.getInternal,
      { key: "website_convex_url" }
    );
    const deployKey: string | null = await ctx.runQuery(
      internal.systemSettings.getInternal,
      { key: "website_convex_deploy_key" }
    );

    if (websiteUrl) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (deployKey) headers.Authorization = `Convex ${deployKey}`;

        // Update reviewCount
        const resp1 = await fetch(`${websiteUrl}/api/mutation`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            path: "cms:setConfig",
            args: { key: "reviewCount", value: newCount },
            format: "json",
          }),
        });
        if (resp1.ok) {
          console.log(`CMS updated: reviewCount = ${newCount}`);
          cmsUpdated = true;
        }

        // Update reviewRating if provided
        if (rating) {
          await fetch(`${websiteUrl}/api/mutation`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              path: "cms:setConfig",
              args: { key: "reviewRating", value: rating },
              format: "json",
            }),
          });
        }
      } catch (err: unknown) {
        console.error("CMS push error:", err instanceof Error ? err.message : String(err));
      }
    }

    // 2. Trigger git update via Viktor tool gateway (updates hardcoded refs in source)
    if (VIKTOR_API_URL && PROJECT_NAME && PROJECT_SECRET) {
      try {
        // Send a Slack message to Viktor requesting the update
        const resp = await fetch(`${VIKTOR_API_URL}/api/viktor-spaces/tools/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: PROJECT_NAME,
            project_secret: PROJECT_SECRET,
            role: "coworker_send_slack_message",
            arguments: {
              channel_id: "U0AMD5SSZLJ",
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `🔄 *Review count updated to ${newCount}* (from ${oldCount}) via the booking app.\n\nWebsite CMS updated instantly. I'll update the static pages now.`,
                  },
                },
              ],
              do_send: true,
            },
          }),
        });

        if (resp.ok) {
          console.log("Slack notification sent");
          gitTriggered = true;
        }
      } catch (err: unknown) {
        console.error("Slack notify error:", err instanceof Error ? err.message : String(err));
      }
    }

    return { success: cmsUpdated || gitTriggered, cmsUpdated, gitTriggered };
  },
});
