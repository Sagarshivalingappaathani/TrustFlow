'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Web3State, connectWallet, switchToHardhatNetwork } from '@/lib/web3';
import toast from 'react-hot-toast';

interface Web3ContextType extends Web3State {
  connectWallet: (showToast?: boolean) => Promise<void>;
  disconnect: () => void;
  loading: boolean;
  error: string | null;
  accountSwitching: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [web3State, setWeb3State] = useState<Web3State>({
    isConnected: false,
    account: null,
    provider: null,
    signer: null,
    contract: null,
    isRegistered: false,
    company: null,
    balance: '0'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountSwitching, setAccountSwitching] = useState(false);

  const handleConnectWallet = async (showToast: boolean = true) => {
    setLoading(true);
    setError(null);
    
    try {
      await switchToHardhatNetwork();
      const state = await connectWallet();
      setWeb3State(state);
      if (showToast) {
        toast.success('Wallet connected successfully!');
      }
    } catch (err: any) {
      setError(err.message);
      if (showToast) {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setWeb3State({
      isConnected: false,
      account: null,
      provider: null,
      signer: null,
      contract: null,
      isRegistered: false,
      company: null,
      balance: '0'
    });
    toast.success('Wallet disconnected');
  };

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await handleConnectWallet(false); // Don't show toast for auto-connection
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log('Account changed:', accounts);
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnect();
          toast('Wallet disconnected', { icon: 'ℹ️' });
        } else if (accounts[0] !== web3State.account) {
          // User switched to different account
          setAccountSwitching(true);
          toast('Account changed, updating...', { icon: '🔄' });
          try {
            await switchToHardhatNetwork();
            const state = await connectWallet();
            setWeb3State(state);
            toast.success(`Switched to account: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
          } catch (error: any) {
            console.error('Error switching account:', error);
            toast.error('Failed to switch account');
          } finally {
            setAccountSwitching(false);
          }
        }
      };

      const handleChainChanged = async (chainId: string) => {
        console.log('Chain changed:', chainId);
        toast('Network changed, reconnecting...', { icon: '🔄' });
        try {
          await switchToHardhatNetwork();
          if (web3State.isConnected) {
            const state = await connectWallet();
            setWeb3State(state);
          }
        } catch (error: any) {
          console.error('Error handling chain change:', error);
          toast.error('Please switch to the correct network');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [web3State.account, web3State.isConnected]);

  const contextValue: Web3ContextType = {
    ...web3State,
    connectWallet: handleConnectWallet,
    disconnect,
    loading,
    error,
    accountSwitching
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};