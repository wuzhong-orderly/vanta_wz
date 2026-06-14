// Re-export the official SDK trading package as the base implementation.
// This keeps local imports stable while avoiding drift from upstream v3.1.0.
export * from "@orderly.network/trading";

// Override TradingPage with the local customized implementation.
export { TradingPage } from "./pages/trading";

// Keep project-specific hooks that are not part of the public SDK exports.
export { useFirstTimeDeposit } from "./pages/trading/hooks/useFirstTimeDeposit";
