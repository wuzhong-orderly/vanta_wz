export function canUseEmbeddedWallet(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return !!(window.crypto && window.crypto.subtle);
}
