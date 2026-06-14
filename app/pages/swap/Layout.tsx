import { Outlet } from "react-router-dom";
import { useOrderlyConfig } from "@/utils/config";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { InviteGate } from "@/components/InviteGate";
import { useNav } from "@/hooks/useNav";

export default function SwapLayout() {
  const config = useOrderlyConfig();
  const { onRouteChange } = useNav();

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: "/swap",
      }}
      footerProps={config.scaffold.footerProps}
      routerAdapter={{
        onRouteChange,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <InviteGate>
        <Outlet />
      </InviteGate>
    </Scaffold>
  );
}
