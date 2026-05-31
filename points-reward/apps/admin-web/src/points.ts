import { numberValue } from "./utils";

export function calculateVantaPoints(totalVantaPoints: string | undefined, allocationPercentage: string) {
  const pool = numberValue(totalVantaPoints ?? "0");
  const allocation = numberValue(allocationPercentage);

  return trimDecimal((pool * allocation) / 100);
}

export function trimDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return String(Number(value.toFixed(8)));
}
