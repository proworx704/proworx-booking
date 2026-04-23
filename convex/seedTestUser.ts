import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const TEST_USER = {
  email: "agent-8ee2b7c6@test.local",
  password: "190pIXS_TdU8ZnjbTLXQUvTxS21rtfq-",
  name: "Test Agent",
} as const;

export const seedTestUser = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async ctx => {
    try {
      await retrieveAccount(ctx, {
        provider: "test",
        account: { id: TEST_USER.email },
      });
      return { success: true, message: "Test user already exists" };
    } catch {
      // User doesn't exist, create them
    }

    try {
      // Pass raw password - createAccount will hash it via the provider's crypto
      await createAccount(ctx, {
        provider: "test",
        account: {
          id: TEST_USER.email,
          secret: TEST_USER.password,
        },
        profile: {
          email: TEST_USER.email,
          name: TEST_USER.name,
          emailVerificationTime: Date.now(),
        },
        shouldLinkViaEmail: false,
      });
      return { success: true, message: "Test user created successfully" };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create test user: ${error}`,
      };
    }
  },
});
