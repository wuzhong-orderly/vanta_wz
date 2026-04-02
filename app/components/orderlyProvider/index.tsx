import { ReactNode, useCallback, lazy, Suspense } from "react";
import { OrderlyAppProvider } from "@orderly.network/react-app";
import { useOrderlyConfig } from "@/utils/config";
import type { NetworkId } from "@orderly.network/types";
import { LocaleProvider, LocaleCode, LocaleEnum, defaultLanguages } from "@orderly.network/i18n";
import { withBasePath } from "@/utils/base-path";
import { getSEOConfig, getUserLanguage } from "@/utils/seo";
import { getRuntimeConfigBoolean, getRuntimeConfigArray, getRuntimeConfig } from "@/utils/runtime-config";
import { createSymbolDataAdapter } from "@/utils/symbol-filter";
import { DemoGraduationChecker } from "@/components/DemoGraduationChecker";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ServiceDisclaimerDialog from "./ServiceDisclaimerDialog";
import { ThemeConfig, LIGHT_THEME_CSS_VARS, ThemeCssVars } from "@orderly.network/ui";

const NETWORK_ID_KEY = "orderly_network_id";

// Dark theme CSS vars derived from theme.css
const CUSTOM_DARK_THEME_CSS_VARS: Partial<ThemeCssVars> = {
	"--oui-font-family": "'HarmonyOS Sans', sans-serif",
	"--oui-color-primary": "0 228 171",
	"--oui-color-primary-light": "102 240 210",
	"--oui-color-primary-darken": "0 180 135",
	"--oui-color-primary-contrast": "255 255 255",
	"--oui-color-link": "0 228 171",
	"--oui-color-link-light": "102 240 210",
	"--oui-color-secondary": "255 255 255",
	"--oui-color-tertiary": "218 218 218",
	"--oui-color-quaternary": "218 218 218",
	"--oui-color-danger": "245 70 75",
	"--oui-color-danger-light": "250 140 143",
	"--oui-color-danger-darken": "220 40 45",
	"--oui-color-danger-contrast": "255 255 255",
	"--oui-color-success": "15 178 118",
	"--oui-color-success-light": "90 210 165",
	"--oui-color-success-darken": "10 140 90",
	"--oui-color-success-contrast": "255 255 255",
	"--oui-color-warning": "255 185 51",
	"--oui-color-warning-light": "255 210 120",
	"--oui-color-warning-darken": "220 150 20",
	"--oui-color-warning-contrast": "255 255 255",
	"--oui-color-fill": "30 34 45",
	"--oui-color-fill-active": "38 42 55",
	"--oui-color-base-1": "100 110 130",
	"--oui-color-base-2": "80 90 108",
	"--oui-color-base-3": "62 70 85",
	"--oui-color-base-4": "50 56 72",
	"--oui-color-base-5": "42 48 62",
	"--oui-color-base-6": "34 40 52",
	"--oui-color-base-7": "28 32 44",
	"--oui-color-base-8": "22 26 36",
	"--oui-color-base-9": "17 20 28",
	"--oui-color-base-10": "12 14 20",
	"--oui-color-base-foreground": "255 255 255",
	"--oui-color-line": "255 255 255",
	"--oui-color-trading-loss": "245 70 75",
	"--oui-color-trading-loss-contrast": "255 255 255",
	"--oui-color-trading-profit": "15 178 118",
	"--oui-color-trading-profit-contrast": "255 255 255",
	"--oui-gradient-primary-start": "0 100 75",
	"--oui-gradient-primary-end": "0 228 171",
	"--oui-gradient-secondary-start": "0 140 105",
	"--oui-gradient-secondary-end": "0 228 171",
	"--oui-gradient-success-start": "5 90 60",
	"--oui-gradient-success-end": "15 178 118",
	"--oui-gradient-danger-start": "150 30 35",
	"--oui-gradient-danger-end": "245 70 75",
	"--oui-gradient-brand-start": "180 245 225",
	"--oui-gradient-brand-end": "0 200 155",
	"--oui-gradient-brand-stop-start": "6.62%",
	"--oui-gradient-brand-stop-end": "86.5%",
	"--oui-gradient-brand-angle": "17.44deg",
	"--oui-gradient-warning-start": "180 110 10",
	"--oui-gradient-warning-end": "255 185 51",
	"--oui-gradient-neutral-start": "22 26 36",
	"--oui-gradient-neutral-end": "34 40 52",
	"--oui-rounded-sm": "2px",
	"--oui-rounded": "4px",
	"--oui-rounded-md": "6px",
	"--oui-rounded-lg": "8px",
	"--oui-rounded-xl": "12px",
	"--oui-rounded-2xl": "16px",
	"--oui-rounded-full": "9999px",
	"--oui-spacing-xs": "20rem",
	"--oui-spacing-sm": "22.5rem",
	"--oui-spacing-md": "26.25rem",
	"--oui-spacing-lg": "30rem",
	"--oui-spacing-xl": "33.75rem",
};

const CUSTOM_LIGHT_THEME_CSS_VARS: Partial<ThemeCssVars> = {
	"--oui-font-family": "'HarmonyOS Sans', sans-serif",

	/* colors */
	"--oui-color-primary": "0 228 171",
	"--oui-color-primary-light": "102 240 210",
	"--oui-color-primary-darken": "0 180 135",
	"--oui-color-primary-contrast": "255 255 255",

	"--oui-color-link": "230 175 0",
	"--oui-color-link-light": "252 213 53",

	"--oui-color-secondary": "255 255 255",
	"--oui-color-tertiary": "234 236 239",
	"--oui-color-quaternary": "218 218 218",

	"--oui-color-danger": "245 70 75",
	"--oui-color-danger-light": "250 140 143",
	"--oui-color-danger-darken": "220 40 45",
	"--oui-color-danger-contrast": "255 255 255",
	"--oui-color-success": "15 178 118",
	"--oui-color-success-light": "90 210 165",
	"--oui-color-success-darken": "10 140 90",
	"--oui-color-success-contrast": "255 255 255",
	"--oui-color-warning": "255 185 51",
	"--oui-color-warning-light": "255 210 120",
	"--oui-color-warning-darken": "220 150 20",
	"--oui-color-warning-contrast": "255 255 255",

	"--oui-color-fill": "245 245 245",
	"--oui-color-fill-active": "238 238 238",

	"--oui-color-base-1": "160 160 160",
	"--oui-color-base-2": "210 210 210",
	"--oui-color-base-3": "180 180 180",
	"--oui-color-base-4": "200 202 205",
	"--oui-color-base-5": "230 230 230",
	"--oui-color-base-6": "245 245 245",
	"--oui-color-base-7": "234 236 239",
	"--oui-color-base-8": "255 255 255",
	"--oui-color-base-9": "255 255 255",
	"--oui-color-base-10": "245 245 245",

	"--oui-color-base-foreground": "0 0 0",
	"--oui-color-line": "0 0 0",

	"--oui-color-base-static": "255 255 255",
	"--oui-color-base-static-contrast": "0 0 0",

	"--oui-color-trading-loss": "246 70 93",
	"--oui-color-trading-loss-contrast": "255 255 255",
	"--oui-color-trading-profit": "14 203 129",
	"--oui-color-trading-profit-contrast": "255 255 255",

	/* gradients */
	"--oui-gradient-primary-start": "0 100 75",
	"--oui-gradient-primary-end": "0 228 171",
	"--oui-gradient-secondary-start": "0 140 105",
	"--oui-gradient-secondary-end": "0 228 171",
	"--oui-gradient-success-start": "5 90 60",
	"--oui-gradient-success-end": "15 178 118",
	"--oui-gradient-danger-start": "150 30 35",
	"--oui-gradient-danger-end": "245 70 75",
	"--oui-gradient-brand-start": "180 245 225",
	"--oui-gradient-brand-end": "0 200 155",
	"--oui-gradient-brand-stop-start": "6.62%",
	"--oui-gradient-brand-stop-end": "86.5%",
	"--oui-gradient-brand-angle": "17.44deg",
	"--oui-gradient-warning-start": "180 110 10",
	"--oui-gradient-warning-end": "255 185 51",
	"--oui-gradient-neutral-start": "255 255 255",
	"--oui-gradient-neutral-end": "255 255 255",

	/* rounded */
	"--oui-rounded-sm": "2px",
	"--oui-rounded": "4px",
	"--oui-rounded-md": "6px",
	"--oui-rounded-lg": "8px",
	"--oui-rounded-xl": "12px",
	"--oui-rounded-2xl": "16px",
	"--oui-rounded-full": "9999px",

	/* spacing */
	"--oui-spacing-xs": "20rem",
	"--oui-spacing-sm": "22.5rem",
	"--oui-spacing-md": "26.25rem",
	"--oui-spacing-lg": "30rem",
	"--oui-spacing-xl": "33.75rem",
};



const getNetworkId = (): NetworkId => {
	if (typeof window === "undefined") return "mainnet";

	const disableMainnet = getRuntimeConfigBoolean('VITE_DISABLE_MAINNET');
	const disableTestnet = getRuntimeConfigBoolean('VITE_DISABLE_TESTNET');

	if (disableMainnet && !disableTestnet) {
		return "testnet";
	}

	if (disableTestnet && !disableMainnet) {
		return "mainnet";
	}

	return (localStorage.getItem(NETWORK_ID_KEY) as NetworkId) || "mainnet";
};

const setNetworkId = (networkId: NetworkId) => {
	if (typeof window !== "undefined") {
		localStorage.setItem(NETWORK_ID_KEY, networkId);
	}
};

const getAvailableLanguages = (): string[] => {
	const languages = getRuntimeConfigArray('VITE_AVAILABLE_LANGUAGES');

	return languages.length > 0 ? languages : ['en'];
};

const getDefaultLanguage = (): LocaleCode => {
	const seoConfig = getSEOConfig();
	const userLanguage = getUserLanguage();
	const availableLanguages = getAvailableLanguages();

	if (typeof window !== 'undefined') {
		const urlParams = new URLSearchParams(window.location.search);
		const langParam = urlParams.get('lang');
		if (langParam && availableLanguages.includes(langParam)) {
			return langParam as LocaleCode;
		}
	}

	if (seoConfig.language && availableLanguages.includes(seoConfig.language)) {
		return seoConfig.language as LocaleCode;
	}

	if (availableLanguages.includes(userLanguage)) {
		return userLanguage as LocaleCode;
	}

	return (availableLanguages[0] || 'en') as LocaleCode;
};

const PrivyConnector = lazy(() => import("@/components/orderlyProvider/privyConnector"));
const WalletConnector = lazy(() => import("@/components/orderlyProvider/walletConnector"));

const OrderlyProvider = (props: { children: ReactNode }) => {
	const config = useOrderlyConfig();
	const networkId = getNetworkId();

	const privyAppId = getRuntimeConfig('VITE_PRIVY_APP_ID');
	const usePrivy = !!privyAppId;

	const parseChainIds = (envVar: string | undefined): Array<{ id: number }> | undefined => {
		if (!envVar) return undefined;
		return envVar.split(',')
			.map(id => id.trim())
			.filter(id => id)
			.map(id => ({ id: parseInt(id, 10) }))
			.filter(chain => !isNaN(chain.id));
	};

	const parseDefaultChain = (envVar: string | undefined): { mainnet: { id: number } } | undefined => {
		if (!envVar) return undefined;

		const chainId = parseInt(envVar.trim(), 10);
		return !isNaN(chainId) ? { mainnet: { id: chainId } } : undefined;
	};

	const disableMainnet = getRuntimeConfigBoolean('VITE_DISABLE_MAINNET');
	const mainnetChains = disableMainnet ? [] : parseChainIds(getRuntimeConfig('VITE_ORDERLY_MAINNET_CHAINS'));
	const disableTestnet = getRuntimeConfigBoolean('VITE_DISABLE_TESTNET');
	const testnetChains = disableTestnet ? [] : parseChainIds(getRuntimeConfig('VITE_ORDERLY_TESTNET_CHAINS'));

	const chainFilter = (mainnetChains || testnetChains) ? {
		...(mainnetChains && { mainnet: mainnetChains }),
		...(testnetChains && { testnet: testnetChains })
	} : undefined;

	const defaultChain = parseDefaultChain(getRuntimeConfig('VITE_DEFAULT_CHAIN'));

	const dataAdapter = createSymbolDataAdapter();

	const onChainChanged = useCallback(
		(_chainId: number, { isTestnet }: { isTestnet: boolean }) => {
			const currentNetworkId = getNetworkId();
			if ((isTestnet && currentNetworkId === 'mainnet') || (!isTestnet && currentNetworkId === 'testnet')) {
				const newNetworkId: NetworkId = isTestnet ? 'testnet' : 'mainnet';
				setNetworkId(newNetworkId);

				setTimeout(() => {
					window.location.reload();
				}, 100);
			}
		},
		[]
	);

	// RTL languages
	const RTL_LANGUAGES = ['fa', 'he', 'ar'];

	const onLanguageChanged = async (lang: LocaleCode) => {
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			if (lang === LocaleEnum.en) {
				url.searchParams.delete('lang');
			} else {
				url.searchParams.set('lang', lang);
			}
			// Set text direction based on language
			document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
			window.history.replaceState({}, '', url.toString());
		}
	};

	const loadPath = (lang: LocaleCode) => {
		const availableLanguages = getAvailableLanguages();

		if (!availableLanguages.includes(lang)) {
			return [];
		}

		return [
			withBasePath(`/locales/${lang}.json`),
			withBasePath(`/locales/extend/${lang}.json`)
		];
	};

	const defaultLanguage = getDefaultLanguage();

	// Set initial text direction based on default language
	if (typeof document !== 'undefined') {
		document.documentElement.dir = RTL_LANGUAGES.includes(defaultLanguage) ? 'rtl' : 'ltr';
	}

	const availableLanguages = getAvailableLanguages();

	// The library's built-in parseI18nLang only recognizes LocaleEnum values,
	// so custom language codes like 'fa' get silently converted to 'en'.
	// This function ensures custom locale codes are preserved.
	const convertDetectedLanguage = (lang: string): LocaleCode => {
		if (availableLanguages.includes(lang)) {
			return lang as LocaleCode;
		}
		const match = lang.match(/^([a-z]{2})/i);
		if (match && availableLanguages.includes(match[1])) {
			return match[1] as LocaleCode;
		}
		return (availableLanguages[0] || 'en') as LocaleCode;
	};

	// Custom languages not included in defaultLanguages from @orderly.network/i18n
	const customLanguages = [
		{ localCode: 'fa', displayName: 'فارسی' },
	];

	const allKnownLanguages = [...defaultLanguages, ...customLanguages];
	const filteredLanguages = allKnownLanguages.filter(lang =>
		availableLanguages.includes(lang.localCode)
	);

	const themes: ThemeConfig[] = [
		{
			id: "orderly",
			displayName: "Dark",
			mode: "dark",
			cssVars: CUSTOM_DARK_THEME_CSS_VARS,
		},
		{
			id: "light",
			displayName: "Light",
			mode: "light",
			cssVars: CUSTOM_LIGHT_THEME_CSS_VARS,
		},
	];

	const appProvider = (
		<OrderlyAppProvider
			brokerId={getRuntimeConfig('VITE_ORDERLY_BROKER_ID')}
			brokerName={getRuntimeConfig('VITE_ORDERLY_BROKER_NAME')}
			networkId={networkId}
			onChainChanged={onChainChanged}
			appIcons={config.orderlyAppProvider.appIcons}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{...(chainFilter && { chainFilter } as any)}
			defaultChain={defaultChain}
			dataAdapter={dataAdapter}
			restrictedInfo={{
				customRestrictedRegions: getRuntimeConfigArray('VITE_RESTRICTED_REGIONS'),
			}}
			themes={themes}
		>
			<DemoGraduationChecker />
			<ServiceDisclaimerDialog />
			{props.children}
		</OrderlyAppProvider>
	);

	const walletConnector = usePrivy
		? <PrivyConnector networkId={networkId}>{appProvider}</PrivyConnector>
		: <WalletConnector networkId={networkId}>{appProvider}</WalletConnector>;

	return (
		<LocaleProvider
			onLanguageChanged={onLanguageChanged}
			backend={{ loadPath }}
			locale={defaultLanguage}
			languages={filteredLanguages}
			convertDetectedLanguage={convertDetectedLanguage}
		>
			<Suspense fallback={<LoadingSpinner />}>
				{walletConnector}
			</Suspense>
		</LocaleProvider>
	);
};

export default OrderlyProvider;
