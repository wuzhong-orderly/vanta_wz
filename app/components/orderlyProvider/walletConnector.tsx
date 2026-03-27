import { ReactNode } from 'react';
import { WalletConnectorProvider } from '@orderly.network/wallet-connector';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import type { NetworkId } from "@orderly.network/types";
import { getEvmInitialConfig, getSolanaWallets } from '../../utils/walletConfig';
import { getRuntimeConfigBoolean } from '@/utils/runtime-config';

interface WalletConnectorProps {
  children: ReactNode;
  networkId: NetworkId;
}

const WalletConnector = ({ children, networkId }: WalletConnectorProps) => {
  const disableEVMWallets = getRuntimeConfigBoolean('VITE_DISABLE_EVM_WALLETS');
  const disableSolanaWallets = getRuntimeConfigBoolean('VITE_DISABLE_SOLANA_WALLETS');

  const evmInitial = disableEVMWallets ? undefined : getEvmInitialConfig();

  const solanaInitial = disableSolanaWallets ? undefined : {
    network: networkId === 'mainnet' ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    wallets: getSolanaWallets(networkId),
  };

  return (
    <WalletConnectorProvider
      solanaInitial={solanaInitial}
      evmInitial={evmInitial}
    >
      {children}
    </WalletConnectorProvider>
  );
};

export default WalletConnector; 