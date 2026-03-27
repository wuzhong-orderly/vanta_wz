import { useEffect, useState } from "react";
import { getRuntimeConfig } from "@/utils/runtime-config";

interface TradingEvent {
  block_time: number;
  block_number: number;
  transaction_index: number;
  log_index: number;
}

interface EventsResponse {
  success: boolean;
  data: {
    events: TradingEvent[];
    page_size_limit: number;
    trades_count: number;
  };
  message?: string;
}

interface DemoBrokerEventsResult {
  hasRecentEvents: boolean;
  eventsCount: number;
  isLoading: boolean;
  error?: string;
}

export function useDemoBrokerEvents(
  accountId?: string
): DemoBrokerEventsResult {
  const currentBrokerId = getRuntimeConfig("VITE_ORDERLY_BROKER_ID");
  const [result, setResult] = useState<DemoBrokerEventsResult>({
    hasRecentEvents: false,
    eventsCount: 0,
    isLoading: false,
  });

  useEffect(() => {
    if (currentBrokerId === "demo") {
      setResult({
        hasRecentEvents: false,
        eventsCount: 0,
        isLoading: false,
      });
      return;
    }

    if (!accountId) {
      setResult({
        hasRecentEvents: false,
        eventsCount: 0,
        isLoading: false,
      });
      return;
    }

    const checkRecentEvents = async () => {
      setResult((prev) => ({ ...prev, isLoading: true, error: undefined }));

      try {
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

        const requestBody = {
          account_id: accountId,
          from_time: thirtyDaysAgo,
          to_time: now,
        };

        const response = await fetch(
          "https://orderly-dashboard-query-service.orderly.network/events_v2",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        const data: EventsResponse = await response.json();

        if (data.success && data.data.events) {
          const eventsCount = data.data.events.length;
          setResult({
            hasRecentEvents: eventsCount > 0,
            eventsCount,
            isLoading: false,
          });
        } else {
          setResult({
            hasRecentEvents: false,
            eventsCount: 0,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Error checking demo broker events:", error);
        setResult({
          hasRecentEvents: false,
          eventsCount: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    checkRecentEvents();
  }, [accountId, currentBrokerId]);

  return result;
}
