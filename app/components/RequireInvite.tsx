import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "@orderly.network/hooks";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { fetchPointsJson } from "@/utils/points-api";

type InviteBindingResponse = {
  bound: boolean;
};

const verifiedInviteAddresses = new Set<string>();

export function RequireInvite() {
  const { account } = useAccount();
  const location = useLocation();
  const address = account.address ?? "";
  const normalizedAddress = normalizeAddress(address);
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">(() => {
    if (!address) {
      return "blocked";
    }

    if (verifiedInviteAddresses.has(normalizedAddress)) {
      return "allowed";
    }

    return "checking";
  });

  const inviteRoute = useMemo(() => {
    const target = `${location.pathname}${location.search}${location.hash}`;
    const query = new URLSearchParams({ redirect: target }).toString();
    return `/invite?${query}`;
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!address) {
      setStatus("blocked");
      return;
    }

    if (verifiedInviteAddresses.has(normalizedAddress)) {
      setStatus("allowed");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    void fetchPointsJson<InviteBindingResponse>(`/points-api/invite-bindings/${address}`)
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (response.bound) {
          verifiedInviteAddresses.add(normalizedAddress);
          setStatus("allowed");
          return;
        }

        setStatus("blocked");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("blocked");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, normalizedAddress]);

  if (status === "checking") {
    return <LoadingSpinner />;
  }

  if (status === "blocked") {
    return <Navigate replace to={inviteRoute} />;
  }

  return <Outlet />;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}