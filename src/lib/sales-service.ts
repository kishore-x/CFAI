import "server-only";

// Reusable sales-CRM calculations, mirroring the pattern in services.ts —
// keep math out of pages so the dashboard, reports, and targets pages agree.

export type OpportunityLike = { stage: string; estimatedValue: number };

/** Sum of estimated value for opportunities still in play (not WON/LOST). */
export function pipelineValue(opportunities: OpportunityLike[]): number {
  return opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST").reduce((sum, o) => sum + o.estimatedValue, 0);
}

/** Sum of estimated value for WON opportunities — counts as revenue won. */
export function revenueWon(opportunities: OpportunityLike[]): number {
  return opportunities.filter((o) => o.stage === "WON").reduce((sum, o) => sum + o.estimatedValue, 0);
}

export function dealsWon(opportunities: OpportunityLike[]): number {
  return opportunities.filter((o) => o.stage === "WON").length;
}

export function dealsLost(opportunities: OpportunityLike[]): number {
  return opportunities.filter((o) => o.stage === "LOST").length;
}

/** Won / (Won + Lost), as a whole-number percentage. 0 when there's no closed history yet. */
export function conversionRate(opportunities: OpportunityLike[]): number {
  const won = dealsWon(opportunities);
  const lost = dealsLost(opportunities);
  const closed = won + lost;
  return closed > 0 ? Math.round((won / closed) * 100) : 0;
}

export function achievementPercent(achieved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((achieved / target) * 100);
}

export function currentMonthRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { year, month: month + 1, start, end };
}

export function fmtCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
