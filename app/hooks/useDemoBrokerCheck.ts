import { useEffect, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
import { getRuntimeConfig } from "@/utils/runtime-config";

interface DemoAccountData {
  user_id: number;
  account_id: string;
}

interface DemoBrokerCheckResult {
  hasDemoAccount: boolean;
  demoAccountData?: DemoAccountData;
  isLoading: boolean;
  error?: string;
}

export function useDemoBrokerCheck(): DemoBrokerCheckResult {
  const { account } = useAccount();
  const currentBrokerId = getRuntimeConfig("VITE_ORDERLY_BROKER_ID");
  const [result, setResult] = useState<DemoBrokerCheckResult>({
    hasDemoAccount: false,
    isLoading: false,
  });

  useEffect(() => {
    if (currentBrokerId === "demo") {
      setResult({
        hasDemoAccount: false,
        isLoading: false,
      });
      return;
    }

    if (!account?.address) {
      setResult({
        hasDemoAccount: false,
        isLoading: false,
      });
      return;
    }

    const checkDemoAccount = async () => {
      setResult((prev) => ({ ...prev, isLoading: true, error: undefined }));

      try {
        const response = await fetch(
          `https://api.orderly.org/v1/get_account?address=${account.address}&broker_id=demo`
        );

        const data = await response.json();

        if (data.success && data.data) {
          setResult({
            hasDemoAccount: true,
            demoAccountData: data.data,
            isLoading: false,
          });
        } else {
          setResult({
            hasDemoAccount: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Error checking demo broker account:", error);
        setResult({
          hasDemoAccount: false,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    checkDemoAccount();
  }, [account?.address, currentBrokerId]);

  return result;
}
