import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { InviteGate } from "@/components/InviteGate";
import { DEFAULT_SYMBOL } from "@/utils/storage";
import { generatePageTitle } from "@/utils/utils";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const redirectPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );
  const pageTitle = generatePageTitle("Invite");

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <InviteGate>
        <InviteUnlockRedirect redirectPath={redirectPath} />
      </InviteGate>
    </>
  );
}

function InviteUnlockRedirect({ redirectPath }: { redirectPath: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(withPendingReferralCode(redirectPath), { replace: true });
  }, [navigate, redirectPath]);

  return null;
}

function sanitizeRedirectPath(redirectPath: string | null) {
  const defaultPath = `/perp/${DEFAULT_SYMBOL}`;

  if (!redirectPath || !redirectPath.startsWith("/")) {
    return defaultPath;
  }

  if (redirectPath.startsWith("/invite")) {
    return defaultPath;
  }

  return redirectPath;
}

function withPendingReferralCode(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  const refCode = localStorage.getItem("referral_code")?.trim();

  if (!refCode) {
    return path;
  }

  const url = new URL(path, window.location.origin);

  if (!url.searchParams.get("ref")?.trim()) {
    url.searchParams.set("ref", refCode);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
