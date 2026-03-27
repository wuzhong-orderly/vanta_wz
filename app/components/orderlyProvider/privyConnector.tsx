import { ReactNode } from 'react';
import { WalletConnectorPrivyProvider, Network } from '@orderly.network/wallet-connector-privy';
import type { NetworkId } from "@orderly.network/types";
import { QueryClient } from "@tanstack/query-core";
import { getEvmConnectors, getSolanaConfig } from '../../utils/walletConfig';
import { getRuntimeConfig, getRuntimeConfigBoolean } from '@/utils/runtime-config';

type LoginMethod = "email" | "passkey" | "twitter" | "google";

const getLoginMethods = (): LoginMethod[] => {
  const loginMethodsEnv = getRuntimeConfig('VITE_PRIVY_LOGIN_METHODS');
  if (!loginMethodsEnv) {
    return ['email'];
  }
  
  const validMethods: LoginMethod[] = ["email", "passkey", "twitter", "google"];
  
  return loginMethodsEnv.split(',')
    .map((method: string) => method.trim())
    .filter((method: string): method is LoginMethod => 
      validMethods.includes(method as LoginMethod)
    );
};

const PrivyConnector = ({ children, networkId }: {
  children: ReactNode;
  networkId: NetworkId;
}) => {
  const appId = getRuntimeConfig('VITE_PRIVY_APP_ID');
  if (!appId) {
    throw new Error(`VITE_PRIVY_APP_ID not set`)
  }
  const termsOfUseUrl = getRuntimeConfig('VITE_PRIVY_TERMS_OF_USE');
  const enableAbstractWallet = getRuntimeConfigBoolean('VITE_ENABLE_ABSTRACT_WALLET');
  const disableEVMWallets = getRuntimeConfigBoolean('VITE_DISABLE_EVM_WALLETS');
  const disableSolanaWallets = getRuntimeConfigBoolean('VITE_DISABLE_SOLANA_WALLETS');
  const loginMethods = getLoginMethods();

  return (
    <WalletConnectorPrivyProvider
      network={networkId === 'mainnet' ? Network.mainnet : Network.testnet}
      termsOfUse={termsOfUseUrl}
      wagmiConfig={disableEVMWallets ? undefined : {
        connectors: getEvmConnectors()
      }}
      solanaConfig={disableSolanaWallets ? undefined : getSolanaConfig(networkId)}
      privyConfig={{
        config: {
          appearance: {
            showWalletLoginFirst: false,
          },
          loginMethods: loginMethods,
        },
        appid: appId,
      }}
      abstractConfig={enableAbstractWallet ? {
        queryClient: new QueryClient(),
      } : undefined}
    >
      {children}
    </WalletConnectorPrivyProvider>
  );
};

export default PrivyConnector; 