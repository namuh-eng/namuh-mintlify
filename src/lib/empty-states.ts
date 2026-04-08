/** Empty state configurations for dashboard pages */

export interface EmptyStateConfig {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
}

export const analyticsEmptyState: EmptyStateConfig = {
  title: "No data yet",
  description:
    "Share your docs URL to start collecting analytics. Once visitors arrive, you'll see traffic, page views, and engagement data here.",
  ctaLabel: "Share your docs URL",
  ctaHref: "/settings",
};

export const agentEmptyState: EmptyStateConfig = {
  title: "Connect integrations",
  description:
    "Connect Slack or Linear to let the agent keep your docs up-to-date automatically. Set up integrations to get started.",
  ctaLabel: "Connect Slack or Linear",
  ctaHref: "/settings/integrations",
};

export const editorEmptyState: EmptyStateConfig = {
  title: "Start writing your docs",
  description:
    "Create your first page to get started. Use MDX with built-in components like callouts, cards, tabs, and code blocks.",
  ctaLabel: "Create a page",
};
