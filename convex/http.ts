import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

// Temporary migration endpoint - remove after running
http.route({
  path: "/api/migrate-tiers",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runMutation(api.migrateAddTiers.run);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
