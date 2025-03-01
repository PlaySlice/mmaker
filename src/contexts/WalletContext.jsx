import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { toast } from 'react-toastify';
import bs58 from 'bs58';
import { stopMarketMaking } from '../services/marketMakerService';

const WalletContext = createContext();

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    console.error('useWallet must be used within a WalletContextProvider');
  }
  return context;
}

export function WalletContextProvider({ children }) {
  const [connection, setConnection] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [activeWallets, setActiveWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    rpcEndpoint: 'https://api.devnet.solana.com',
    maxWallets: 5,
    cyclesBeforeRecycle: 10,
    minInterval: 60, // seconds
    maxInterval: 300, // seconds
    minAmount: 0.01, // SOL
    maxAmount: 0.1, // SOL
    isRandomized: true,
  });

  const initializeConnection = useCallback(() => {
    try {
      const conn = new Connection(settings.rpcEndpoint, 'confirmed');
      setConnection(conn);
      console.log('Connected to Solana network:', settings.rpcEndpoint);
    } catch (error) {
      console.error('Failed to connect to Solana network:', error);
      toast.error('Failed to connect to Solana network');
    }
  }, [settings.rpcEndpoint]);

  const createWallet = useCallback(() => {
    try {
      const newWallet = Keypair.generate();
      const walletData = {
        id: Date.now().toString(),
        publicKey: newWallet.publicKey.toString(),
        privateKey: bs58.encode(newWallet.secretKey),
        balance: 0,
        cyclesCompleted: 0,
        isActive: false,
        transactions: [],
        // Add custom trade settings for this wallet
        customSettings: {
          enabled: false, // Whether to use custom settings or global settings
          cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
          minInterval: settings.minInterval,
          maxInterval: settings.maxInterval,
          minAmount: settings.minAmount,
          maxAmount: settings.maxAmount,
          isRandomized: settings.isRandomized,
          tokenMint: 'So11111111111111111111111111111111111111112', // Default to SOL
        }
      };
      
      setWallets(prev => [...prev, walletData]);
      toast.success('New wallet created');
      return walletData;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast.error('Failed to create wallet');
      return null;
    }
  }, [settings]);

  const importWallet = useCallback((privateKeyString) => {
    try {
      let secretKey;
      try {
        secretKey = bs58.decode(privateKeyString);
      } catch (e) {
        throw new Error('Invalid private key format');
      }
      
      const keypair = Keypair.fromSecretKey(secretKey);
      const walletData = {
        id: Date.now().toString(),
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyString,
        balance: 0,
        cyclesCompleted: 0,
        isActive: false,
        transactions: [],
        // Add custom trade settings for this wallet
        customSettings: {
          enabled: false, // Whether to use custom settings or global settings
          cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
          minInterval: settings.minInterval,
          maxInterval: settings.maxInterval,
          minAmount: settings.minAmount,
          maxAmount: settings.maxAmount,
          isRandomized: settings.isRandomized,
          tokenMint: 'So11111111111111111111111111111111111111112', // Default to SOL
        }
      };
      
      setWallets(prev => [...prev, walletData]);
      toast.success('Wallet imported successfully');
      return walletData;
    } catch (error) {
      console.error('Failed to import wallet:', error);
      toast.error(`Failed to import wallet: ${error.message}`);
      return null;
    }
  }, [settings]);

  const updateWalletSettings = useCallback((walletId, customSettings) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, customSettings: { ...wallet.customSettings, ...customSettings } } 
          : wallet
      )
    );
    toast.success('Wallet settings updated');
  }, []);

  const activateWallet = useCallback((walletId) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, isActive: true } 
          : wallet
      )
    );
    
    const walletToActivate = wallets.find(w => w.id === walletId);
    if (walletToActivate) {
      setActiveWallets(prev => [...prev, walletToActivate]);
      toast.success(`Wallet ${walletToActivate.publicKey.slice(0, 8)}... activated`);
    }
  }, [wallets]);

  const deactivateWallet = useCallback((walletId) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, isActive: false } 
          : wallet
      )
    );
    
    setActiveWallets(prev => prev.filter(wallet => wallet.id !== walletId));
    toast.info(`Wallet deactivated`);
  }, []);

  const deleteWallet = useCallback((walletId) => {
    try {
      // First check if the wallet is active in market making
      const walletToDelete = wallets.find(w => w.id === walletId);
      
      if (walletToDelete && walletToDelete.isActive) {
        // Stop any active market making for this wallet
        stopMarketMaking(walletId);
        
        // Deactivate the wallet
        deactivateWallet(walletId);
      }
      
      // Remove the wallet from the wallets array
      setWallets(prev => prev.filter(wallet => wallet.id !== walletId));
      
      toast.success('Wallet deleted successfully');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      toast.error(`Failed to delete wallet: ${error.message}`);
    }
  }, [wallets, deactivateWallet]);

  const deleteAllWallets = useCallback(() => {
    try {
      // Stop market making for all active wallets
      wallets.forEach(wallet => {
        if (wallet.isActive) {
          stopMarketMaking(wallet.id);
        }
      });
      
      // Clear all wallets
      setWallets([]);
      setActiveWallets([]);
      
      toast.success('All wallets deleted successfully');
    } catch (error) {
      console.error('Failed to delete all wallets:', error);
      toast.error(`Failed to delete all wallets: ${error.message}`);
    }
  }, [wallets]);

  const recycleWallet = useCallback(async (walletId) => {
    try {
      setIsLoading(true);
      const oldWallet = wallets.find(w => w.id === walletId);
      
      if (!oldWallet) {
        throw new Error('Wallet not found');
      }
      
      // Create new wallet
      const newWallet = createWallet();
      
      if (!newWallet) {
        throw new Error('Failed to create new wallet');
      }
      
      // TODO: Transfer funds from old wallet to new wallet
      // This would require actual Solana transaction code
      
      // For now, we'll just simulate it
      toast.info(`Recycling wallet ${oldWallet.publicKey.slice(0, 8)}...`);
      
      // Deactivate old wallet
      deactivateWallet(walletId);
      
      // Activate new wallet
      activateWallet(newWallet.id);
      
      toast.success('Wallet recycled successfully');
    } catch (error) {
      console.error('Failed to recycle wallet:', error);
      toast.error(`Failed to recycle wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [wallets, createWallet, deactivateWallet, activateWallet]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast.success('Settings updated');
    
    // Reconnect if RPC endpoint changed
    if (newSettings.rpcEndpoint && newSettings.rpcEndpoint !== settings.rpcEndpoint) {
      initializeConnection();
    }
  }, [settings.rpcEndpoint, initializeConnection]);

  const updateWalletData = useCallback((walletId, updates) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, ...updates } 
          : wallet
      )
    );
    
    // Also update in activeWallets if present
    setActiveWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, ...updates } 
          : wallet
      )
    );
  }, []);

  // Load wallets from localStorage on initial load
  useEffect(() => {
    const savedWallets = localStorage.getItem('marketMakerWallets');
    if (savedWallets) {
      try {
        setWallets(JSON.parse(savedWallets));
      } catch (e) {
        console.error('Failed to load saved wallets:', e);
      }
    }
    
    const savedSettings = localStorage.getItem('marketMakerSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load saved settings:', e);
      }
    }
  }, []);

  // Save wallets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('marketMakerWallets', JSON.stringify(wallets));
  }, [wallets]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('marketMakerSettings', JSON.stringify(settings));
  }, [settings]);

  const value = {
    connection,
    wallets,
    activeWallets,
    settings,
    isLoading,
    initializeConnection,
    createWallet,
    importWallet,
    activateWallet,
    deactivateWallet,
    recycleWallet,
    updateSettings,
    updateWalletData,
    updateWalletSettings,
    deleteWallet,
    deleteAllWallets,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
