'use client'

import { useState } from 'react';
import { BrowserProvider } from 'ethers';

// --- CONFIGURATION ---
// Currently set to Optimism Mainnet. 
// To test without real money, switch '0xa' to '0xaa36a7' (Optimism Sepolia Testnet)
const OP_CHAIN_ID = '0xa'; 
const OP_CHAIN_NAME = 'Optimism Mainnet';
const OP_RPC_URL = 'https://mainnet.optimism.io';
const OP_EXPLORER_URL = 'https://optimistic.etherscan.io';

export function useWeb3() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  /**
   * 1. Connect to MetaMask
   */
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert("MetaMask is not installed!");
      return null;
    }

    setIsConnecting(true);
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      setIsConnecting(false);
      return accounts[0];
    } catch (error) {
      console.error("Wallet connection failed", error);
      setIsConnecting(false);
      return null;
    }
  };

  /**
   * 2. Force Switch to Optimism Network
   * (Auto-adds the network if the user doesn't have it)
   */
  const switchToOptimism = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return false;

    try {
      // Try switching first
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: OP_CHAIN_ID }],
      });
      return true;
    } catch (error: any) {
      // Error 4902 means chain doesn't exist in wallet. Add it.
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: OP_CHAIN_ID,
              chainName: OP_CHAIN_NAME,
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [OP_RPC_URL],
              blockExplorerUrls: [OP_EXPLORER_URL]
            }],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add Optimism network", addError);
          return false;
        }
      }
      console.error("Failed to switch network", error);
      return false;
    }
  };

  /**
   * 3. OPTION A: "The Purist" (Pay Gas)
   * Sends a 0 ETH transaction to yourself, embedding the Content Hash in the "data" field.
   * This permanently inscribes the hash onto the blockchain.
   */
  const anchorOnChain = async (contentHash: string) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;

    try {
      // Ensure we are on Optimism before sending
      const success = await switchToOptimism();
      if (!success) return null;

      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      // Send Transaction
      const tx = await signer.sendTransaction({
        to: walletAddress, // Send to self (keeps it simple)
        value: 0,          // 0 ETH cost (besides gas)
        data: contentHash  // 👈 THE TRUTH DATA (Hex format)
      });
      
      console.log("Transaction Sent:", tx.hash);
      return tx.hash; // Return the Transaction Hash (Proof)

    } catch (error) {
      console.error("Anchor transaction failed", error);
      return null;
    }
  };

  /**
   * 4. OPTION B: "The Normie" (Relayer / Ad)
   * Just signs the message cryptographically.
   * The Backend will verify this and mark it as "Sponsored/Verified".
   */
  const signContent = async (contentHash: string) => {
    if (!(window as any).ethereum) return null;
    
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // Sign the hash string
      const signature = await signer.signMessage(contentHash);
      return signature;
    } catch (error) {
      console.error("Signing failed", error);
      return null;
    }
  };

  return { 
    connectWallet, 
    anchorOnChain, 
    signContent, 
    walletAddress, 
    isConnecting 
  };
}

