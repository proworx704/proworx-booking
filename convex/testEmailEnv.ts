import { query } from "./_generated/server";

export const checkEmailConfig = query({
  args: {},
  handler: async () => {
    const apiUrl = (process as any).env.VIKTOR_SPACES_API_URL;
    const projectName = (process as any).env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = (process as any).env.VIKTOR_SPACES_PROJECT_SECRET;
    return {
      hasApiUrl: !!apiUrl,
      hasProjectName: !!projectName,
      hasProjectSecret: !!projectSecret,
      apiUrlPrefix: apiUrl ? apiUrl.substring(0, 30) + "..." : "NOT SET",
      projectName: projectName || "NOT SET",
    };
  },
});
