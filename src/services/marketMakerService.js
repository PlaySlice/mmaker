import { swapTokens } from './raydiumService';
import { getWalletBalance, generateRandomAmount, generateRandomInterval } from './walletService';
import { toast } from 'react-toastify';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Store for active trading bots
const activeBots = new Map();

export function startMarketMaking(connection, wallet, globalSettings, onCycleComplete) {
  if (activeBots.has(wallet.id)) {
    toast.info(`Market maker already running for wallet ${wallet.publicKey.slice(0, 8)}...`);
    return false;
  }
  
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    
    // Determine which settings to use (custom or global)
    const useCustomSettings = wallet.customSettings && wallet.customSettings.enabled;
    const effectiveSettings = useCustomSettings ? wallet.customSettings : globalSettings;
    const tokenMint = useCustomSettings ? wallet.customSettings.tokenMint : 'So11111111111111111111111111111111111111112';
    
    // Initialize bot state
    const botState = {
      wallet,
      settings: effectiveSettings,
      tokenMint,
      cyclesCompleted: wallet.cyclesCompleted || 0,
      isRunning: true,
      lastActionTime: Date.now(),
      transactions: [],
      stopRequested: false,
      useCustomSettings,
    };
    
    // Start the trading loop
    const botInterval = setInterval(async () => {
      if (botState.stopRequested) {
        clearInterval(botInterval);
        activeBots.delete(wallet.id);
        return;
      }
      
      try {
        // Check if we need to recycle the wallet
        if (botState.cyclesCompleted >= effectiveSettings.cyclesBeforeRecycle) {
          clearInterval(botInterval);
          activeBots.delete(wallet.id);
          onCycleComplete(wallet.id, botState.cyclesCompleted, true);
          return;
        }
        
        // Get current wallet balance
        const balance = await getWalletBalance(connection, wallet.publicKey);
        
        // Determine amount to trade
        let amount;
        if (effectiveSettings.isRandomized) {
          amount = generateRandomAmount(effectiveSettings.minAmount, effectiveSettings.maxAmount);
        } else {
          amount = effectiveSettings.minAmount;
        }
        
        // Make sure we have enough balance
        if (balance < amount * 2) { // * 2 to account for fees and both buy/sell
          toast.warning(`Insufficient balance in wallet ${wallet.publicKey.slice(0, 8)}...`);
          return;
        }
        
        // Execute sell transaction
        const sellResult = await swapTokens(connection, keypair, {
          tokenMint,
          amount,
          isBuy: false,
        });
        
        botState.transactions.push(sellResult);
        
        // Wait a bit between transactions
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Execute buy transaction
        const buyResult = await swapTokens(connection, keypair, {
          tokenMint,
          amount,
          isBuy: true,
        });
        
        botState.transactions.push(buyResult);
        
        // Increment cycle counter
        botState.cyclesCompleted++;
        
        // Update last action time
        botState.lastActionTime = Date.now();
        
        // Notify about cycle completion
        onCycleComplete(wallet.id, botState.cyclesCompleted, false);
        
        // Determine next interval
        let nextInterval;
        if (effectiveSettings.isRandomized) {
          nextInterval = generateRandomInterval(effectiveSettings.minInterval, effectiveSettings.maxInterval) * 1000;
        } else {
          nextInterval = effectiveSettings.minInterval * 1000;
        }
        
        // Update interval
        clearInterval(botInterval);
        setTimeout(() => {
          startMarketMaking(connection, wallet, globalSettings, onCycleComplete);
        }, nextInterval);
        
      } catch (error) {
        console.error('Market making cycle failed:', error);
        toast.error(`Market making cycle failed: ${error.message}`);
      }
    }, 1000); // Initial check after 1 second
    
    // Store the bot reference
    activeBots.set(wallet.id, {
      botState,
      stop: () => {
        botState.stopRequested = true;
      }
    });
    
    const settingsType = useCustomSettings ? 'custom' : 'global';
    toast.success(`Started market making for wallet ${wallet.publicKey.slice(0, 8)}... using ${settingsType} settings`);
    return botState;
  } catch (error) {
    console.error('Failed to start market making:', error);
    toast.error(`Failed to start market making: ${error.message}`);
    return false;
  }
}

export function stopMarketMaking(walletId) {
  const bot = activeBots.get(walletId);
  if (bot) {
    bot.stop();
    activeBots.delete(walletId);
    toast.info(`Stopped market making for wallet ${bot.botState.wallet.publicKey.slice(0, 8)}...`);
    return true;
  }
  return false;
}

export function getActiveBotStatus(walletId) {
  const bot = activeBots.get(walletId);
  if (bot) {
    return {
      isActive: true,
      cyclesCompleted: bot.botState.cyclesCompleted,
      lastActionTime: bot.botState.lastActionTime,
      transactions: bot.botState.transactions,
      useCustomSettings: bot.botState.useCustomSettings,
    };
  }
  return { isActive: false };
}

export function getAllActiveBots() {
  return Array.from(activeBots.entries()).map(([id, bot]) => ({
    id,
    publicKey: bot.botState.wallet.publicKey,
    cyclesCompleted: bot.botState.cyclesCompleted,
    lastActionTime: bot.botState.lastActionTime,
    useCustomSettings: bot.botState.useCustomSettings,
  }));
}
