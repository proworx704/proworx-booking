import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
