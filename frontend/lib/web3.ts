import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, HARDHAT_RPC_URL } from './contract';

export interface Web3State {
  isConnected: boolean;
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  isRegistered: boolean;
  company: any;
  balance: string;
}

export const connectWallet = async (): Promise<Web3State> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Check if company is registered
      let isRegistered = false;
      let company = null;
      try {
        const registrationCheck = await contract.isCompanyRegistered(account);
        isRegistered = registrationCheck;
        if (isRegistered) {
          company = await contract.getCompany(account);
        }
      } catch (error) {
        console.log('Company not registered or error checking registration');
      }
      
      // Get balance
      const balance = await provider.getBalance(account);
      const balanceInEth = ethers.formatEther(balance);
      
      return {
        isConnected: true,
        account,
        provider,
        signer,
        contract,
        isRegistered,
        company,
        balance: balanceInEth
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  } else {
    throw new Error('MetaMask not found. Please install MetaMask.');
  }
};

export const switchToHardhatNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7a69' }], // Hardhat default chainId
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x7a69',
              chainName: 'Hardhat Local',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [HARDHAT_RPC_URL],
            },
          ],
        });
      } catch (addError) {
        console.error('Error adding Hardhat network:', addError);
      }
    }
  }
};

export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const formatEther = (value: string | number) => {
  return parseFloat(ethers.formatEther(value.toString())).toFixed(4);
};

declare global {
  interface Window {
    ethereum?: any;
  }
}