import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Syncs a widget URL from the booking app to the website's CMS (siteConfig).
 * This allows widget URLs set in the booking dashboard to automatically
 * update the corresponding "Book Now" links on the website.
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

    if (!websiteUrl || !deployKey) {
      console.error("Website Convex credentials not configured in systemSettings");
      return { success: false, error: "Website credentials not configured" };
    }

    try {
      // Push to website's CMS siteConfig table
      const cmsKey = `widgetUrl:${slug}`;
      const response: Response = await fetch(`${websiteUrl}/api/mutation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Convex ${deployKey}`,
        },
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
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Website sync error:", msg);
      return { success: false, error: msg };
    }
  },
});
