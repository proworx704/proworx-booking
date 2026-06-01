/**
 * One-time admin fix: find existing users who matched pending invites
 * but weren't properly onboarded. Creates staff + payroll records for them.
 * 
 * Run via: npx convex run adminFixAccounts:fixExistingAccounts
 */
import { internalMutation } from "./_generated/server";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

export const fixExistingAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];

    // Get all pending invites
    const pendingInvites = await ctx.db
      .query("teamInvites")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    results.push(`Found ${pendingInvites.length} pending invites`);

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const allStaff = await ctx.db.query("staff").collect();
    const allWorkers = await ctx.db.query("payrollWorkers").collect();

    for (const invite of pendingInvites) {
      const inviteEmail = (invite.email ?? "").toLowerCase();
      const invitePhone = (invite.phone ?? "").replace(/\D/g, "");

      // Find matching user by email or phone
      const matchedUser = allUsers.find((u) => {
        const userEmail = ((u as any).email ?? "").toLowerCase();
        const userPhone = ((u as any).phone ?? "").replace(/\D/g, "");
        if (inviteEmail && userEmail === inviteEmail) return true;
        if (invitePhone.length >= 10 && userPhone.length >= 10) {
          return invitePhone.endsWith(userPhone.slice(-10)) || userPhone.endsWith(invitePhone.slice(-10));
        }
        return false;
      });

      if (!matchedUser) {
        results.push(`❌ No user found for invite: ${invite.name} (${inviteEmail || invitePhone})`);
        continue;
      }

      results.push(`✅ Matched user for ${invite.name}: ${(matchedUser as any).email || matchedUser._id}`);

      // Check/create profile
      let profile = allProfiles.find((p) => p.userId === matchedUser._id);
      const displayName = invite.name || (matchedUser as any).name || inviteEmail.split("@")[0] || "Team Member";
      const staffRole = invite.role === "admin" ? "manager" as const : "technician" as const;

      if (profile) {
        // Update role from client → employee/admin
        if (profile.role === "client" || profile.role !== invite.role) {
          await ctx.db.patch(profile._id, { role: invite.role, displayName });
          results.push(`  → Updated profile role to ${invite.role}`);
        }
      } else {
        // Create profile
        const profileId = await ctx.db.insert("userProfiles", {
          userId: matchedUser._id,
          role: invite.role,
          displayName,
        });
        profile = await ctx.db.get(profileId) as any;
        results.push(`  → Created profile as ${invite.role}`);
      }

      // Check/create payroll worker
      let worker = allWorkers.find(
        (w) => (w.email ?? "").toLowerCase() === inviteEmail && inviteEmail !== ""
      );
      if (!worker) {
        const workerId = await ctx.db.insert("payrollWorkers", {
          name: displayName,
          hourlyRate: invite.hourlyRate ?? 0,
          email: inviteEmail || undefined,
          phone: invite.phone || undefined,
          isActive: true,
        });
        await ctx.db.patch(profile!._id, { payrollWorkerId: workerId });
        results.push(`  → Created payroll worker (rate: $${invite.hourlyRate ?? 0}/hr)`);
      } else {
        await ctx.db.patch(profile!._id, { payrollWorkerId: worker._id });
        results.push(`  → Linked existing payroll worker`);
      }

      // Check/create staff record
      let staffMember = allStaff.find(
        (s) => ((s as any).email ?? "").toLowerCase() === inviteEmail && inviteEmail !== ""
      );
      if (!staffMember) {
        const colorIdx = allStaff.length % COLORS.length;
        const staffId = await ctx.db.insert("staff", {
          name: displayName,
          email: inviteEmail || undefined,
          phone: invite.phone || undefined,
          role: staffRole,
          isActive: true,
          color: COLORS[allStaff.length % COLORS.length],
        });
        await ctx.db.patch(profile!._id, { staffId });
        // Push to allStaff so next iteration gets a different color
        allStaff.push({ _id: staffId, name: displayName, role: staffRole, isActive: true, color: COLORS[colorIdx], _creationTime: Date.now() } as any);
        results.push(`  → Created staff record as ${staffRole}`);
      } else {
        await ctx.db.patch(profile!._id, { staffId: staffMember._id });
        results.push(`  → Linked existing staff record`);
      }

      // Mark invite as accepted
      await ctx.db.patch(invite._id, {
        status: "accepted" as const,
        acceptedBy: matchedUser._id,
        acceptedAt: Date.now(),
      });
      results.push(`  → Marked invite as accepted`);
    }

    return results;
  },
});
