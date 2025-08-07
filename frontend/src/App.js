import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import hederaClient from './services/hederaClient';
import Admin from './components/Admin';
import Marketplace from './components/Marketplace';
import WalletConnect from './components/WalletConnect';
import DemoMarketplace from './components/DemoMarketplace';

/**
 * Main App Component for EcoCreditX Marketplace
 * 
 * Handles routing between Admin (project onboarding) and Marketplace (trading)
 * Integrates with Hedera Hashgraph for all on-chain operations
 * 
 * References:
 * - Hedera SDK: https://docs.hedera.com/
 * - Guardian PWE: https://github.com/hashgraph/guardian
 * - HashScan: https://hashscan.io/testnet
 */

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [platformStats, setPlatformStats] = useState({
    totalSupply: 0,
    totalRetired: 0,
    activeProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Check if Hedera client is configured
      if (hederaClient.client) {
        setIsConnected(true);
        
        // Get account info
        const balance = await hederaClient.getAccountBalance();
        const tokenBalance = await hederaClient.getTokenBalance();
        const retiredBalance = await hederaClient.getRetiredBalance();
        
        setAccountInfo({
          accountId: hederaClient.operatorId?.toString(),
          hbarBalance: balance.hbar,
          tokenBalance: tokenBalance,
          retiredBalance: retiredBalance
        });

        // Get platform statistics
        const stats = await hederaClient.getPlatformStats();
        setPlatformStats(stats);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async (credentials) => {
    try {
      // In a real app, this would handle wallet connection
      // For now, we use the configured credentials
      await initializeApp();
      return { success: true };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return { success: false, error: error.message };
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAccountInfo(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-eco-50 to-hedera-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4 text-eco-600"></div>
          <h2 className="text-2xl font-bold text-hedera-800 mb-2">Loading EcoCreditX</h2>
          <p className="text-hedera-600">Connecting to Hedera Testnet...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-eco-50 to-hedera-100">
        {/* Header Navigation */}
        <header className="bg-white shadow-lg border-b border-eco-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-eco-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">🌱</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-hedera-900">EcoCreditX</h1>
                  <p className="text-sm text-hedera-600">Micro-Carbon Credit Marketplace</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-8">
                <Link
                  to="/demo"
                  className="text-hedera-700 hover:text-eco-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🎭 Demo
                </Link>
                <Link
                  to="/marketplace"
                  className="text-hedera-700 hover:text-eco-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Marketplace
                </Link>
                <Link
                  to="/admin"
                  className="text-hedera-700 hover:text-eco-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Project Admin
                </Link>
                <a
                  href={hederaClient.getContractUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hedera-700 hover:text-eco-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Contract ↗
                </a>
              </nav>

              {/* Account Info */}
              {isConnected && accountInfo ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-hedera-900">
                      {accountInfo.accountId}
                    </p>
                    <div className="text-xs text-hedera-600 space-x-2">
                      <span>{accountInfo.tokenBalance} ECCX</span>
                      <span>•</span>
                      <span>{accountInfo.retiredBalance} retired</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="btn-secondary text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <WalletConnect onConnect={handleWalletConnect} />
              )}
            </div>
          </div>
        </header>

        {/* Platform Stats Bar */}
        <div className="bg-eco-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center space-x-8 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg">{platformStats.totalSupply.toLocaleString()}</div>
                <div className="text-eco-100">Total Credits</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{platformStats.totalRetired.toLocaleString()}</div>
                <div className="text-eco-100">Credits Retired</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{platformStats.activeProjects}</div>
                <div className="text-eco-100">Active Projects</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {!isConnected ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-eco-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-eco-600 text-3xl">🔗</span>
              </div>
              <h2 className="text-3xl font-bold text-hedera-900 mb-4">
                Connect to Hedera Testnet
              </h2>
              <p className="text-hedera-600 mb-8 max-w-md mx-auto">
                To access the EcoCreditX marketplace, please connect your Hedera account. 
                Make sure you have testnet HBAR for transactions.
              </p>
              <div className="space-y-4">
                <WalletConnect onConnect={handleWalletConnect} />
                <div className="text-sm text-hedera-500">
                  <p>Need testnet HBAR? Visit <a href="https://portal.hedera.com/" className="text-eco-600 hover:underline">Hedera Portal</a></p>
                </div>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/marketplace" replace />} />
              <Route path="/demo" element={<DemoMarketplace />} />
              <Route 
                path="/marketplace" 
                element={<Marketplace accountInfo={accountInfo} onStatsUpdate={setPlatformStats} />} 
              />
              <Route 
                path="/admin" 
                element={<Admin accountInfo={accountInfo} onStatsUpdate={setPlatformStats} />} 
              />
            </Routes>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-hedera-800 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-eco-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">🌱</span>
                  </div>
                  <h3 className="text-lg font-bold">EcoCreditX</h3>
                </div>
                <p className="text-hedera-300 mb-4">
                  A comprehensive micro-carbon credit marketplace built on Hedera Hashgraph, 
                  integrating with Guardian PWE for real project validation.
                </p>
                <div className="flex space-x-4">
                  <a
                    href="https://github.com/hashgraph/guardian"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hedera-300 hover:text-white transition-colors"
                  >
                    Guardian GitHub ↗
                  </a>
                  <a
                    href="https://hedera.com/guardian"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hedera-300 hover:text-white transition-colors"
                  >
                    Guardian Info ↗
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-hedera-300">
                  <li>
                    <a href="https://docs.hedera.com/" className="hover:text-white transition-colors">
                      Hedera Docs ↗
                    </a>
                  </li>
                  <li>
                    <a href="https://hashscan.io/testnet" className="hover:text-white transition-colors">
                      HashScan Testnet ↗
                    </a>
                  </li>
                  <li>
                    <a href="https://portal.hedera.com/playground" className="hover:text-white transition-colors">
                      Hedera Playground ↗
                    </a>
                  </li>
                  <li>
                    <a href="https://hedera.com/use-cases/sustainability" className="hover:text-white transition-colors">
                      Sustainability Use Cases ↗
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Network</h4>
                <ul className="space-y-2 text-sm text-hedera-300">
                  <li>Network: Hedera Testnet</li>
                  <li>Chain ID: 296</li>
                  <li>
                    Contract: 
                    <a 
                      href={hederaClient.getContractUrl()} 
                      className="block text-eco-400 hover:text-eco-300 transition-colors break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {process.env.REACT_APP_CONTRACT_ID || 'Not deployed'}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-hedera-700 mt-8 pt-8 text-center text-sm text-hedera-400">
              <p>© 2024 EcoCreditX. Built with ❤️ for a sustainable future on Hedera Hashgraph.</p>
              <p className="mt-2">
                This is a demo application. All transactions occur on Hedera Testnet.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
