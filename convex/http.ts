import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();
auth.addHttpRoutes(http);

// Temporary migration endpoint — remove after running
http.route({
  path: "/migrate-tiers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    if (body.secret !== "proworx-tier-migrate-20260401") {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await ctx.runMutation(internal.catalog.runAddBundleTiers);
    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// July 2026 price update migration — remove after running
http.route({
  path: "/migrate-july2026-prices",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    if (body.secret !== "proworx-july2026-price-update") {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await ctx.runMutation(internal.catalog.runJuly2026PriceUpdate);
    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Public API: site settings (review count, etc.) ──────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

http.route({
  path: "/api/site-settings",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const reviewCount = await ctx.runQuery(
      internal.siteConfig.getPublic,
      { key: "reviewCount" },
    );
    return new Response(
      JSON.stringify({
        reviewCount: reviewCount ?? "63",
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }),
});

http.route({
  path: "/api/site-settings",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// One-time admin fix endpoint — remove after running
http.route({
  path: "/api/admin-fix-accounts",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const results = await ctx.runMutation(
      // @ts-ignore - temporary one-time fix
      "adminFixAccounts:fixExistingAccounts" as any,
      {}
    );
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/admin-diagnose",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const results = await ctx.runMutation(
      // @ts-ignore - temporary diagnostic
      "adminFixAccounts:diagnose" as any,
      {}
    );
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Cleanup unassigned users
http.route({
  path: "/api/admin-cleanup-users",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const results = await ctx.runMutation(internal.adminFixAccounts.cleanupUnassignedUsers);
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Temporary diagnostic endpoint for Square sync debugging
http.route({
  path: "/api/square-diagnose",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const results = await ctx.runAction(internal.squareInboundSync.diagnoseSync);
    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
