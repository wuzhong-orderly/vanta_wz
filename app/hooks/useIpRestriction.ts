import { useEffect, useState } from "react";
import { getRuntimeConfigArray } from "@/utils/runtime-config";
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

export const useIpRestriction = () => {
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [ipInfo, setIpInfo] = useState<{ ip: string; region: string } | null>(
    null
  );

  useEffect(() => {
    fetch("https://api.orderly.org/v1/ip_info")
      .then((res) => res.json())
      .then((data) => {
        const userRegion = data?.data?.region || "";
        const userIp = data?.data?.ip || "";
        setIpInfo({ ip: userIp, region: userRegion });

        const restrictedRegions =
          getRuntimeConfigArray("VITE_RESTRICTED_REGIONS") || [];
        const whitelistIps =
          getRuntimeConfigArray("VITE_WHITELISTED_IPS") || [];

        if (isIpWhitelisted(userIp, whitelistIps)) {
          setIsRestricted(false);
          return;
        }
        if (restrictedRegions.includes(userRegion)) {
          setIsRestricted(true);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch IP info:", error);
        setIsRestricted(false);
      });
  }, []);

  return { isRestricted, ipInfo };
};
