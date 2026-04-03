import { useMemo } from "react";
import { useTranslation } from "@orderly.network/i18n";
import { TradingPageProps } from "@orderly.network/trading";
import {
  BottomNavProps,
  FooterProps,
  MainNavWidgetProps,
  MainNavItem,
} from "@orderly.network/ui-scaffold";
import { AppLogos } from "@orderly.network/react-app";
import { withBasePath } from "./base-path";
import {
  PortfolioActiveIcon,
  PortfolioInactiveIcon,
  TradingActiveIcon,
  TradingInactiveIcon,
  LeaderboardActiveIcon,
  LeaderboardInactiveIcon,
  MarketsActiveIcon,
  MarketsInactiveIcon,
  useScreen,
  Flex,
  cn,
} from "@orderly.network/ui";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
  getRuntimeConfigNumber,
} from "./runtime-config";
import { Link } from "react-router-dom";
import CustomLeftNav from "@/components/CustomLeftNav";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";

interface ColorConfigInterface {
  upColor?: string;
  downColor?: string;
  pnlUpColor?: string;
  pnlDownColor?: string;
  chartBG?: string;
}

export type OrderlyConfig = {
  orderlyAppProvider: {
    appIcons: AppLogos;
  };
  scaffold: {
    mainNavProps: MainNavWidgetProps;
    footerProps: FooterProps;
    bottomNavProps: BottomNavProps;
  };
  tradingPage: {
    tradingViewConfig: TradingPageProps["tradingViewConfig"];
    sharePnLConfig: TradingPageProps["sharePnLConfig"];
  };
};

const ALL_MENU_ITEMS = [
  { name: "Trading", href: "/", translationKey: "common.trading" },
  { name: "Portfolio", href: "/portfolio", translationKey: "common.portfolio" },
  { name: "Markets", href: "/markets", translationKey: "common.markets" },
  { name: "Swap", href: "/swap", translationKey: "extend.swap" },
  {
    name: "Rewards",
    href: "/rewards",
    translationKey: "tradingRewards.rewards",
  },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    translationKey: "tradingLeaderboard.leaderboard",
  },
  { name: "Vaults", href: "/vaults", translationKey: "common.vaults" },
  { name: "Points", href: "/points", translationKey: "tradingPoints.points" },
];

const DEFAULT_ENABLED_MENUS = [
  { name: "Trading", href: "/", translationKey: "common.trading" },
  { name: "Portfolio", href: "/portfolio", translationKey: "common.portfolio" },
  { name: "Markets", href: "/markets", translationKey: "common.markets" },
  { name: "Swap", href: "/swap", translationKey: "extend.swap" },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    translationKey: "tradingLeaderboard.leaderboard",
  },
];

const getCustomMenuItems = (): MainNavItem[] => {
  const customMenusEnv = getRuntimeConfig("VITE_CUSTOM_MENUS");

  if (
    !customMenusEnv ||
    typeof customMenusEnv !== "string" ||
    customMenusEnv.trim() === ""
  ) {
    return [];
  }

  try {
    // Parse delimiter-separated menu items
    // Expected format: "Documentation,https://docs.example.com;Blog,https://blog.example.com;Support,https://support.example.com"
    const menuPairs = customMenusEnv
      .split(";")
      .map((pair) => pair.trim())
      .filter((pair) => pair.length > 0);

    const validCustomMenus: MainNavItem[] = [];

    for (const pair of menuPairs) {
      const [name, href] = pair.split(",").map((item) => item.trim());

      if (!name || !href) {
        console.warn(
          "Invalid custom menu item format. Expected 'name,url':",
          pair
        );
        continue;
      }

      validCustomMenus.push({
        name,
        href,
        target: "_blank",
      });
    }

    return validCustomMenus;
  } catch (e) {
    console.warn("Error parsing VITE_CUSTOM_MENUS:", e);
    return [];
  }
};

const getEnabledMenus = () => {
  const enabledMenusEnv = getRuntimeConfig("VITE_ENABLED_MENUS");

  if (
    !enabledMenusEnv ||
    typeof enabledMenusEnv !== "string" ||
    enabledMenusEnv.trim() === ""
  ) {
    return DEFAULT_ENABLED_MENUS;
  }

  try {
    const enabledMenuNames = enabledMenusEnv
      .split(",")
      .map((name) => name.trim());

    const enabledMenus = [];
    for (const menuName of enabledMenuNames) {
      const menuItem = ALL_MENU_ITEMS.find((item) => item.name === menuName);
      if (menuItem) {
        enabledMenus.push(menuItem);
      }
    }

    return enabledMenus.length > 0 ? enabledMenus : DEFAULT_ENABLED_MENUS;
  } catch (e) {
    console.warn("Error parsing VITE_ENABLED_MENUS:", e);
    return DEFAULT_ENABLED_MENUS;
  }
};

const getPnLBackgroundImages = (): string[] => {
  const useCustomPnL = getRuntimeConfigBoolean("VITE_USE_CUSTOM_PNL_POSTERS");

  if (useCustomPnL) {
    const customPnLCount = getRuntimeConfigNumber(
      "VITE_CUSTOM_PNL_POSTER_COUNT"
    );

    if (isNaN(customPnLCount) || customPnLCount < 1) {
      return [
        withBasePath("/pnl/poster_bg_1.png"),
        withBasePath("/pnl/poster_bg_2.png"),
        withBasePath("/pnl/poster_bg_3.png"),
        withBasePath("/pnl/poster_bg_4.png"),
      ];
    }

    const customPosters: string[] = [];
    for (let i = 1; i <= customPnLCount; i++) {
      customPosters.push(withBasePath(`/pnl/poster_bg_${i}.png`));
    }

    return customPosters;
  }

  return [
    withBasePath("/pnl/poster_bg_1.png"),
    withBasePath("/pnl/poster_bg_2.png"),
    withBasePath("/pnl/poster_bg_3.png"),
    withBasePath("/pnl/poster_bg_4.png"),
  ];
};

const getBottomNavIcon = (menuName: string) => {
  switch (menuName) {
    case "Trading":
      return {
        activeIcon: <TradingActiveIcon />,
        inactiveIcon: <TradingInactiveIcon />,
      };
    case "Portfolio":
      return {
        activeIcon: <PortfolioActiveIcon />,
        inactiveIcon: <PortfolioInactiveIcon />,
      };
    case "Leaderboard":
      return {
        activeIcon: <LeaderboardActiveIcon />,
        inactiveIcon: <LeaderboardInactiveIcon />,
      };
    case "Markets":
      return {
        activeIcon: <MarketsActiveIcon />,
        inactiveIcon: <MarketsInactiveIcon />,
      };
    default:
      throw new Error(`Unsupported menu name: ${menuName}`);
  }
};

const getColorConfig = (): ColorConfigInterface | undefined => {
  const customColorConfigEnv = getRuntimeConfig(
    "VITE_TRADING_VIEW_COLOR_CONFIG"
  );

  if (
    !customColorConfigEnv ||
    typeof customColorConfigEnv !== "string" ||
    customColorConfigEnv.trim() === ""
  ) {
    return undefined;
  }

  try {
    const customColorConfig = JSON.parse(customColorConfigEnv);
    return customColorConfig;
  } catch (e) {
    console.warn("Error parsing VITE_TRADING_VIEW_COLOR_CONFIG:", e);
    return undefined;
  }
};

export const useOrderlyConfig = () => {
  const { t } = useTranslation();
  const { isMobile } = useScreen();

  return useMemo<OrderlyConfig>(() => {
    const enabledMenus = getEnabledMenus();
    const customMenus = getCustomMenuItems();

    // Book icon SVG for CS Team > User Manual
    const bookIcon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );

    // Telegram icon SVG
    const telegramIcon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    );

    // X (Twitter) icon SVG
    const xIcon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );

    // Build the hardcoded nav structure:
    // Futures | Spot | Market | Portfolio | CS Team ▼ | More ▼
    const mainMenuItems: MainNavItem[] = [
      {
        name: t("common.trading"),
        href: "/",
        className: "futures-nav-item",
      },
      {
        name: t("extend.swap"),
        href: "/swap",
      },
      {
        name: t("common.markets"),
        href: "/markets",
      },
      {
        name: t("common.portfolio"),
        href: "/portfolio",
      },
      {
        name: t("extend.nav.csTeam"),
        href: "/cs-team",
        children: [
          {
            name: t("extend.nav.userManual"),
            href: "https://google.com",
            target: "_blank",
            icon: bookIcon,
            activeIcon: bookIcon,
          },
          {
            name: "Telegram",
            href: "https://google.com",
            target: "_blank",
            icon: telegramIcon,
            activeIcon: telegramIcon,
          },
          {
            name: "X",
            href: "https://x.com/Vanta_exchange",
            target: "_blank",
            icon: xIcon,
            activeIcon: xIcon,
          },
        ],
      },
      {
        name: t("extend.nav.more"),
        href: "/more",
        children: [
          {
            name: t("tradingLeaderboard.leaderboard"),
            href: "/leaderboard",
          },
        ],
      },
    ];

    // Add any custom menu items from config, excluding ones already hardcoded
    const hardcodedNames = mainMenuItems.map((m) => m.name.toUpperCase());
    const filteredCustomMenus = customMenus.filter(
      (m) => !hardcodedNames.includes(m.name.toUpperCase())
    );
    const allMenuItems: MainNavItem[] = [...mainMenuItems, ...filteredCustomMenus];

    // For mobile left nav, flatten into simple items
    const mobileMenus = [
      { name: t("common.trading"), href: "/" },
      { name: t("extend.swap"), href: "/swap" },
      { name: t("common.markets"), href: "/markets" },
      { name: t("common.portfolio"), href: "/portfolio" },
      { name: t("tradingLeaderboard.leaderboard"), href: "/leaderboard" },
      { name: t("tradingPoints.points", "Points"), href: "/points" },
    ];

    const supportedBottomNavMenus = [
      "Trading",
      "Portfolio",
      "Markets",
      "Leaderboard",
    ];
    const bottomNavMenus = enabledMenus
      .filter((menu) => supportedBottomNavMenus.includes(menu.name))
      .map((menu) => {
        const icons = getBottomNavIcon(menu.name);
        return {
          name: t(menu.translationKey),
          href: menu.href,
          ...icons,
        };
      })
      .filter((menu) => menu.activeIcon && menu.inactiveIcon);

    const mainNavProps: MainNavWidgetProps = {
      initialMenu: "/",
      mainMenus: allMenuItems,
    };

    mainNavProps.customRender = (components) => {
      return (
        <Flex justify="between" className="oui-w-full">
          <Flex
            itemAlign={"center"}
            className={cn("oui-gap-3", "oui-overflow-x-auto")}
          >
            {isMobile && (
              <CustomLeftNav
                menus={mobileMenus}
                externalLinks={customMenus}
              />
            )}
            <Link to="/" className="oui-flex-shrink-0">
              {isMobile &&
                getRuntimeConfigBoolean("VITE_HAS_SECONDARY_LOGO") ? (
                <img
                  src={withBasePath("/logo-secondary.webp")}
                  alt="logo"
                  style={{ height: "32px" }}
                />
              ) : (
                components.title
              )}
            </Link>
            {components.mainNav}
            {!isMobile && (
              <Link to="/points" className="vanta-genesis-points-btn">
                <svg className="vanta-genesis-points-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Vanta Genesis Points
              </Link>
            )}
          </Flex>

          <Flex itemAlign={"center"} className="oui-gap-2">
            {components.accountSummary}
            {components.notify}
            {components.linkDevice}
            {components.scanQRCode}
            {components.languageSwitcher}
            <ThemeToggleButton />
            {components.subAccount}
            {components.chainMenu}
            {components.walletConnect}
            {!isMobile && (
              <Link to="/" className="ai-sparkle-btn" aria-label="AI Assistant">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
                  <path d="M19 2L19.94 4.06L22 5L19.94 5.94L19 8L18.06 5.94L16 5L18.06 4.06L19 2Z" />
                </svg>
              </Link>
            )}
          </Flex>
        </Flex>
      );
    };

    return {
      scaffold: {
        mainNavProps,
        bottomNavProps: {
          mainMenus: bottomNavMenus,
        },
        footerProps: {
          telegramUrl: getRuntimeConfig("VITE_TELEGRAM_URL") || undefined,
          discordUrl: getRuntimeConfig("VITE_DISCORD_URL") || undefined,
          twitterUrl: getRuntimeConfig("VITE_TWITTER_URL") || undefined,
          trailing: (
            <span className="oui-text-2xs oui-text-base-contrast-54">
              Charts powered by{" "}
              <a
                href="https://tradingview.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                TradingView
              </a>
            </span>
          ),
        },
      },
      orderlyAppProvider: {
        appIcons: {
          main: getRuntimeConfigBoolean("VITE_HAS_PRIMARY_LOGO")
            ? {
              component: (
                <span className="logo-theme-switch">
                  <img
                    src={withBasePath("/logo-lightmode.png")}
                    alt="logo"
                    className="logo-light logo-full"
                    style={{ height: "25px" }}
                  />
                  <img
                    src={withBasePath("/logo.webp")}
                    alt="logo"
                    className="logo-dark logo-full"
                    style={{ height: "25px" }}
                  />
                  {getRuntimeConfigBoolean("VITE_HAS_SECONDARY_LOGO") && (
                    <img
                      src={withBasePath("/logo-secondary.webp")}
                      alt="logo"
                      className="logo-compact"
                      style={{ height: "25px" }}
                    />
                  )}
                </span>
              ),
            }
            : { img: withBasePath("/orderly-logo.svg") },
          secondary: {
            img: getRuntimeConfigBoolean("VITE_HAS_SECONDARY_LOGO")
              ? withBasePath("/logo-secondary.webp")
              : withBasePath("/orderly-logo-secondary.svg"),
          },
        },
      },
      tradingPage: {
        tradingViewConfig: {
          scriptSRC: withBasePath(
            "/tradingview/charting_library/charting_library.js"
          ),
          library_path: withBasePath("/tradingview/charting_library/"),
          customCssUrl: withBasePath("/tradingview/chart.css"),
          colorConfig: getColorConfig(),
        },
        sharePnLConfig: {
          backgroundImages: getPnLBackgroundImages(),
          color: "rgba(255, 255, 255, 0.98)",
          profitColor: "rgba(15, 178, 118, 1)",
          lossColor: "rgba(245, 70, 75, 1)",
          brandColor: "#00e4ab",
          // ref
          refLink:
            typeof window !== "undefined" ? window.location.origin : undefined,
          refSlogan:
            getRuntimeConfig("VITE_ORDERLY_BROKER_NAME") || "Orderly Network",
          layout: {
            message: {
              position: {
                top: 26,
              },
            },
            position: {
              position: {
                top: 80,
              },
            },
            unrealizedPnl: {
              position: {
                top: 120,
              },
            },
            informations: {
              position: {
                top: 160,
              },
            },
            domain: {
              textAlign: "end",
              position: {
                left: 532,
                bottom: 22,
              },
            },
            updateTime: {
              textAlign: "end",
              position: {
                left: 532,
                bottom: 7,
              },
            },
          },
        },
      },
    };
  }, [t, isMobile]);
};
