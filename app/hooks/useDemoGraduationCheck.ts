import { useEffect, useCallback } from "react";
import { useDemoBrokerCheck } from "./useDemoBrokerCheck";
import { useDemoBrokerEvents } from "./useDemoBrokerEvents";
import { hasDemoGraduationDialogBeenShown } from "@/utils/demoGraduation";
import { showDemoGraduationDialog } from "@/components/DemoGraduationDialog";
import { getRuntimeConfig } from "@/utils/runtime-config";

export function useDemoGraduationCheck() {
  const currentBrokerId = getRuntimeConfig("VITE_ORDERLY_BROKER_ID");

  const shouldCheckForDemo = currentBrokerId && currentBrokerId !== "demo";

  const {
    hasDemoAccount,
    demoAccountData,
    isLoading: checkingAccount,
  } = useDemoBrokerCheck();
  const { hasRecentEvents, isLoading: checkingEvents } = useDemoBrokerEvents(
    demoAccountData?.account_id
  );

  const shouldShowDialog = useCallback(() => {
    if (!shouldCheckForDemo) {
      return false;
    }

    if (hasDemoGraduationDialogBeenShown()) {
      return false;
    }

    if (checkingAccount || checkingEvents) {
      return false;
    }

    return hasDemoAccount && hasRecentEvents;
  }, [
    shouldCheckForDemo,
    hasDemoAccount,
    hasRecentEvents,
    checkingAccount,
    checkingEvents,
  ]);

  useEffect(() => {
    if (shouldShowDialog()) {
      showDemoGraduationDialog();
    }
  }, [shouldShowDialog]);

  return {
    hasDemoAccount,
    hasRecentEvents,
    isLoading: checkingAccount || checkingEvents,
    shouldShowDialog: shouldShowDialog(),
    shouldCheckForDemo,
  };
}
