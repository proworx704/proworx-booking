import { mutation } from "./_generated/server";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

/** Diagnostic: show all invites, profiles, staff, workers, AND all users */
export const diagnose = mutation({
  args: {},
  handler: async (ctx) => {
    const invites = await ctx.db.query("teamInvites").collect();
    const profiles = await ctx.db.query("userProfiles").collect();
    const staff = await ctx.db.query("staff").collect();
    const workers = await ctx.db.query("payrollWorkers").collect();
    const users = await ctx.db.query("users").collect();

    // Also check authAccounts for phone-based signups
    const authAccounts = await ctx.db.query("authAccounts").collect();

    return {
      invites: invites.map((i) => ({
        name: i.name,
        email: i.email,
        phone: i.phone,
        role: i.role,
        status: i.status,
        hourlyRate: (i as any).hourlyRate,
        acceptedBy: i.acceptedBy,
      })),
      allUsers: users.map((u) => {
        const profile = profiles.find((p) => p.userId === u._id);
        const accounts = authAccounts.filter((a: any) => a.userId === u._id);
        return {
          id: u._id,
          email: (u as any).email,
          name: (u as any).name,
          phone: (u as any).phone,
          hasProfile: !!profile,
          profileRole: profile?.role,
          profileDisplayName: profile?.displayName,
          staffId: profile?.staffId,
          payrollWorkerId: profile?.payrollWorkerId,
          authProviders: accounts.map((a: any) => a.provider),
        };
      }),
      profiles: profiles.map((p) => {
        const user = users.find((u) => u._id === p.userId);
        return {
          id: p._id,
          displayName: p.displayName,
          role: p.role,
          email: (user as any)?.email,
          staffId: p.staffId,
          payrollWorkerId: p.payrollWorkerId,
          customerId: (p as any).customerId,
        };
      }),
      staff: staff.map((s) => ({ id: s._id, name: s.name, email: (s as any).email, phone: (s as any).phone, role: s.role, isActive: s.isActive })),
      workers: workers.map((w) => ({ id: w._id, name: w.name, email: w.email, phone: (w as any).phone, rate: w.hourlyRate, isActive: w.isActive })),
    };
  },
});

/** Fix accounts: upgrade clients to employees if they match invites */
export const fixExistingAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const results: string[] = [];
    const allInvites = await ctx.db.query("teamInvites").collect();
    const allUsers = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const allStaff = await ctx.db.query("staff").collect();
    const allWorkers = await ctx.db.query("payrollWorkers").collect();

    // Process ALL invites (pending or accepted) that have a matching user
    // but whose user profile is still "client" or missing staff/payroll links
    for (const invite of allInvites) {
      if (invite.status === "cancelled" || invite.status === "expired") continue;

      const inviteEmail = (invite.email ?? "").toLowerCase();
      const invitePhone = (invite.phone ?? "").replace(/\D/g, "");

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
        results.push(`⏭ No user account for ${invite.name} (${inviteEmail || invitePhone}) — skipped`);
        continue;
      }

      const profile = allProfiles.find((p) => p.userId === matchedUser._id);
      const displayName = invite.name || (matchedUser as any).name || inviteEmail.split("@")[0];
      const staffRole = invite.role === "admin" ? "manager" as const : "technician" as const;
      let needsFix = false;

      if (!profile) {
        results.push(`❌ ${invite.name}: No profile at all — creating`);
        needsFix = true;
      } else if (profile.role === "client") {
        results.push(`🔄 ${invite.name}: Has profile as "client" — upgrading to ${invite.role}`);
        needsFix = true;
      } else if (!profile.staffId || !profile.payrollWorkerId) {
        results.push(`🔗 ${invite.name}: Missing staff/payroll links — fixing`);
        needsFix = true;
      } else {
        results.push(`✅ ${invite.name}: Already set up correctly`);
        continue;
      }

      if (!needsFix) continue;

      // Create or update profile
      let profileId = profile?._id;
      if (!profile) {
        profileId = await ctx.db.insert("userProfiles", {
          userId: matchedUser._id,
          role: invite.role,
          displayName,
        });
      } else {
        await ctx.db.patch(profile._id, { role: invite.role, displayName });
      }

      // Payroll worker
      let worker = allWorkers.find(
        (w) => (w.email ?? "").toLowerCase() === inviteEmail && inviteEmail !== ""
      );
      if (!worker) {
        const wId = await ctx.db.insert("payrollWorkers", {
          name: displayName,
          hourlyRate: (invite as any).hourlyRate ?? 0,
          email: inviteEmail || undefined,
          phone: invite.phone || undefined,
          isActive: true,
        });
        await ctx.db.patch(profileId!, { payrollWorkerId: wId });
        results.push(`  → Created payroll worker`);
      } else if (!profile?.payrollWorkerId) {
        await ctx.db.patch(profileId!, { payrollWorkerId: worker._id });
        results.push(`  → Linked payroll worker`);
      }

      // Staff record
      let staffMember = allStaff.find(
        (s) => ((s as any).email ?? "").toLowerCase() === inviteEmail && inviteEmail !== ""
      );
      if (!staffMember) {
        const colorIdx = allStaff.length % COLORS.length;
        const sId = await ctx.db.insert("staff", {
          name: displayName,
          email: inviteEmail || undefined,
          phone: invite.phone || undefined,
          role: staffRole,
          isActive: true,
          color: COLORS[colorIdx],
        });
        await ctx.db.patch(profileId!, { staffId: sId });
        allStaff.push({ _id: sId, name: displayName, role: staffRole, isActive: true, color: COLORS[colorIdx], _creationTime: Date.now() } as any);
        results.push(`  → Created staff record`);
      } else if (!profile?.staffId) {
        await ctx.db.patch(profileId!, { staffId: staffMember._id });
        results.push(`  → Linked staff record`);
      }

      // Mark invite accepted
      if (invite.status === "pending") {
        await ctx.db.patch(invite._id, {
          status: "accepted" as const,
          acceptedBy: matchedUser._id,
          acceptedAt: Date.now(),
        });
        results.push(`  → Marked invite accepted`);
      }
    }

    return results;
  },
});
