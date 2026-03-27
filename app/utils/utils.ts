import { getRuntimeConfig } from "./runtime-config";

export function generatePageTitle(title: string) {
  return `${title} | ${getRuntimeConfig("VITE_ORDERLY_BROKER_NAME")}`;
}

export function formatSymbol(symbol: string, format = "base-type") {
  const arr = symbol.split("_");
  const type = arr[0];
  const base = arr[1];
  const quote = arr[2];

  return format
    .replace("type", type)
    .replace("base", base)
    .replace("quote", quote);
}
