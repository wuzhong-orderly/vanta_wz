import { useState, useEffect } from "react";
import { SimpleDialog } from "@orderly.network/ui";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
} from "@/utils/runtime-config";

const SERVICE_DISCLAIMER_KEY = "orderly_service_disclaimer_accepted";

const ServiceDisclaimerDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  const enableDialog = getRuntimeConfigBoolean(
    "VITE_ENABLE_SERVICE_DISCLAIMER_DIALOG"
  );

  useEffect(() => {
    if (!enableDialog) return;

    const hasAccepted = localStorage.getItem(SERVICE_DISCLAIMER_KEY);
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, [enableDialog]);

  if (!enableDialog) {
    return null;
  }

  const handleAgree = () => {
    localStorage.setItem(SERVICE_DISCLAIMER_KEY, "true");
    setIsOpen(false);
  };

  const actions = {
    primary: {
      label: "Agree and proceed",
      onClick: handleAgree,
    },
  };

  const content = {
    intro: `${getRuntimeConfig(
      "VITE_ORDERLY_BROKER_NAME"
    )} uses Orderly Network's white-label solution and is not a direct operator of the orderbook.`,
    disclaimer: `By clicking 'Agree', users will access a third-party website using Orderly software. ${getRuntimeConfig(
      "VITE_ORDERLY_BROKER_NAME"
    )} confirms that it does not directly operate or control the infrastructure or take responsibility for code operations.`,
  };

  return (
    <SimpleDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title=""
      size="sm"
      closable={false}
      actions={actions}
      contentProps={{
        onInteractOutside: (event) => event.preventDefault(),
      }}
    >
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Service Disclaimer</h2>

        <p className="text-sm text-white/90 leading-relaxed">{content.intro}</p>

        <p className="text-sm text-white/80 leading-relaxed border-t border-white/20 pt-4">
          {content.disclaimer}
        </p>
      </div>
    </SimpleDialog>
  );
};

export default ServiceDisclaimerDialog;
