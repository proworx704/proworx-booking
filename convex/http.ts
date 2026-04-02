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

export default http;
