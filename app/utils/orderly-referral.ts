const REFERRAL_CODE_STORAGE_KEY = "referral_code";
const verifiedOrderlyRefCodes = new Map<string, boolean>();

export function getUrlOrderlyRefCode(url: URL) {
  return url.searchParams.get("ref")?.trim() || url.searchParams.get("referral_code")?.trim();
}

export function getStoredOrderlyRefCode() {
  return localStorage.getItem(REFERRAL_CODE_STORAGE_KEY)?.trim();
}

export function markInvalidOrderlyRefCode(url: URL, refCode: string) {
  clearPendingOrderlyRefCode(url);
  url.searchParams.set("re", refCode);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function clearPendingOrderlyRefCode(url: URL) {
  localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
  url.searchParams.delete("ref");
  url.searchParams.delete("referral_code");
}

export async function verifyOrderlyRefCode(refCode: string) {
  const normalizedRefCode = refCode.trim();

  if (!normalizedRefCode) {
    return false;
  }

  const cachedResult = verifiedOrderlyRefCodes.get(normalizedRefCode);

  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    const url = new URL("https://api.orderly.org/v1/public/referral/verify_ref_code");
    url.searchParams.set("referral_code", normalizedRefCode);

    const response = await fetch(url.toString());

    if (!response.ok) {
      verifiedOrderlyRefCodes.set(normalizedRefCode, false);
      return false;
    }

    const data = (await response.json()) as {
      success?: boolean;
      data?: { exist?: boolean };
    };
    const isValid = Boolean(data.success && data.data?.exist);
    verifiedOrderlyRefCodes.set(normalizedRefCode, isValid);
    return isValid;
  } catch {
    verifiedOrderlyRefCodes.set(normalizedRefCode, false);
    return false;
  }
}
