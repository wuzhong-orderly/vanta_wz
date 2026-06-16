import { useEffect, useState } from "react";
import { getRuntimeConfigArray } from "@/utils/runtime-config";
import {
  IpLocationInfo,
  isCountryCityRestricted,
} from "@/utils/restricted-regions";
import type { NetworkId } from "@orderly.network/types";
import ipRangeCheck from "ip-range-check";

function isIpWhitelisted(ip: string, whitelistPatterns: string[]): boolean {
  return whitelistPatterns.some((pattern) => {
    try {
      return ipRangeCheck(ip, pattern);
    } catch (error) {
      console.warn(`Invalid IP pattern: ${pattern}`, error);
      return ip === pattern;
    }
  });
}

const getIpInfoUrl = (networkId: NetworkId) =>
  networkId === "testnet"
    ? "https://testnet-api.orderly.org/v1/ip_info"
    : "https://api.orderly.org/v1/ip_info";

export const useIpRestriction = (networkId: NetworkId) => {
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [ipInfo, setIpInfo] = useState<IpLocationInfo | null>(null);

  useEffect(() => {
    fetch(getIpInfoUrl(networkId))
      .then((res) => res.json())
      .then((data) => {
        const locationInfo: IpLocationInfo = data?.data || {};
        const userIp = locationInfo.ip || "";
        setIpInfo(locationInfo);

        const whitelistIps =
          getRuntimeConfigArray("VITE_WHITELISTED_IPS") || [];

        if (isIpWhitelisted(userIp, whitelistIps)) {
          setIsRestricted(false);
          return;
        }

        setIsRestricted(isCountryCityRestricted(locationInfo));
      })
      .catch((error) => {
        console.error("Failed to fetch IP info:", error);
        setIsRestricted(false);
      });
  }, [networkId]);

  return {
    isRestricted,
    ipInfo,
    customRestrictedIps: isRestricted && ipInfo?.ip ? [ipInfo.ip] : [],
  };
};
