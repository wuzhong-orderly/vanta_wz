import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { InviteGate } from "@/components/InviteGate";
import { DEFAULT_SYMBOL } from "@/utils/storage";

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const redirectPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );

  return (
    <InviteGate>
      <InviteUnlockRedirect redirectPath={redirectPath} />
    </InviteGate>
  );
}

function InviteUnlockRedirect({ redirectPath }: { redirectPath: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(redirectPath, { replace: true });
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