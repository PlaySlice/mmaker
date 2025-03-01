import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAllActiveBots } from '../services/marketMakerService';
import ActivityChart from '../components/ActivityChart';
import { Link } from 'react-router-dom';

function Dashboard() {
  const { wallets, activeWallets, connection } = useWallet();
  const [activeBots, setActiveBots] = useState([]);
  const [mockActivityData, setMockActivityData] = useState([]);

  useEffect(() => {
    // Get active bots
    const bots = getAllActiveBots();
    setActiveBots(bots);
    
    // Generate mock activity data for demonstration
    const generateMockData = () => {
      const now = Date.now();
      const data = [];
      
      for (let i = 0; i < 20; i++) {
        const timestamp = now - (19 - i) * 15 * 60 * 1000;
        
        /* Add buy transaction */
        data.push({
          type: 'buy',
          amount: 0.01 + Math.random() * 0.09,
          timestamp,
        });
        
        /* Add sell transaction */
        data.push({
          type: 'sell',
          amount: 0.01 + Math.random() * 0.09,
          timestamp: timestamp + 5 * 60 * 1000,
        });
      }
      
      return data;
    };
    
    setMockActivityData(generateMockData());
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      setActiveBots(getAllActiveBots());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Link to="/wallets" className="btn btn-primary">
          Manage Wallets
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-2">Total Wallets</h2>
          <p className="text-3xl font-bold text-solana">{wallets.length}</p>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-2">Active Wallets</h2>
          <p className="text-3xl font-bold text-solana">{activeWallets.length}</p>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-2">Active Bots</h2>
          <p className="text-3xl font-bold text-solana">{activeBots.length}</p>
        </div>
      </div>
      
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Activity Overview</h2>
        <ActivityChart data={mockActivityData} />
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Active Wallets</h2>
        
        {activeWallets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm">
                  <th className="pb-2">Wallet</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Cycles</th>
                  <th className="pb-2">Settings</th>
                  <th className="pb-2">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {activeWallets.map(wallet => {
                  const bot = activeBots.find(b => b.id === wallet.id);
                  
                  return (
                    <tr key={wallet.id} className="border-t border-gray-700">
                      <td className="py-3 font-mono text-sm">
                        {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          bot ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {bot ? 'Active' : 'Idle'}
                        </span>
                      </td>
                      <td className="py-3">
                        {wallet.cyclesCompleted || 0}
                      </td>
                      <td className="py-3">
                        {bot && bot.useCustomSettings ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-solana bg-opacity-20 text-solana">
                            Custom
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300">
                            Global
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-400">
                        {bot ? new Date(bot.lastActionTime).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No active wallets</p>
            <Link to="/wallets" className="btn btn-secondary mt-4">
              Activate Wallets
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
