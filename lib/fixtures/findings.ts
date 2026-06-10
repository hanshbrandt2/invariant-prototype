import type { PublishedFinding } from "@/lib/types";

/**
 * Seeded published findings — what the registry looks like before you publish
 * anything yourself. One previously-published finding from the crude-oil
 * workspace, so the dashboard Findings shelf is populated and the read-only
 * permalink resolves. Real, contract-shaped values (the bt_2024_06_meanrev
 * result). At-runtime publishes are added client-side (see lib/findings-store).
 */
export const seededFindings: PublishedFinding[] = [
  {
    id: "finding:result:bt_2024_06_meanrev:v1",
    resultId: "result:bt_2024_06_meanrev:v1",
    workspaceId: "crude-oil-research",
    workspaceName: "crude-oil-research",
    friendlyName: "WTI front-month mean-reversion · 2024",
    metrics: { sharpe: 1.42, hit_rate: 0.561, max_drawdown: -0.083, turnover: 0.34, ann_return: 0.187 },
    lineageHash: "sha256:21b8…6d04",
    asOf: "2024-06-28",
    publishedBy: "h.brandt",
    publishedAt: "2026-06-08",
    sealOk: true,
  },
];
