import React, { useState, useEffect } from 'react';
import hederaClient from '../services/hederaClient';

/**
 * Marketplace Component for Carbon Credit Trading
 * 
 * Features:
 * 1. Live marketplace grid showing available credits
 * 2. Real-time pricing and project information
 * 3. Purchase credits with Hedera Testnet transactions
 * 4. Retire credits with HCS logging for transparency
 * 5. Portfolio tracking with retirement certificates
 * 
 * All transactions are executed on Hedera Testnet with HashScan verification
 * 
 * References:
 * - Hedera SDK: https://docs.hedera.com/
 * - HashScan: https://hashscan.io/testnet
 * - HCS Topics: https://docs.hedera.com/guides/docs/sdks/consensus
 */

const Marketplace = ({ accountInfo, onStatsUpdate }) => {
  const [activeTab, setActiveTab] = useState('browse');
  const [projects, setProjects] = useState([]);
  const [userPortfolio, setUserPortfolio] = useState({
    credits: 0,
    retired: 0,
    transactions: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [selectedProject, setSelectedProject] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [retireAmount, setRetireAmount] = useState('');
  const [retireReason, setRetireReason] = useState('');

  useEffect(() => {
    loadMarketplaceData();
    loadUserPortfolio();
  }, []); // Run once on mount

  const loadMarketplaceData = async () => {
    try {
      console.log('📊 Loading marketplace data...');
      console.log('🔗 HederaClient contract ID:', hederaClient.contractId);
      
      // Load real projects from the contract
      const projectPromises = [];
      
      // Try to load known project IDs (these should be registered first)
      const knownProjectIds = ['AMAZON_REDD_2024', 'AMAZON_001', 'SOLAR_001', 'BIOGAS_001'];
      
      console.log('🔍 Searching for projects:', knownProjectIds);
      
      for (const projectId of knownProjectIds) {
        try {
          console.log(`📋 Checking project: ${projectId}`);
          const project = await hederaClient.getProject(projectId);
          console.log(`📄 Project ${projectId} result:`, project);
          
          if (project && project.isActive) {
            console.log(`✅ Found active project: ${projectId}`);
            projectPromises.push({
              projectId: project.projectId,
              projectName: getProjectName(project.projectId),
              projectType: getProjectType(project.projectId), 
              location: project.location,
              methodology: project.methodology,
              totalCredits: project.totalCredits,
              availableCredits: project.availableCredits,
              pricePerCredit: project.pricePerCredit / 1e8, // Convert from tinybars to HBAR
              developer: project.developer,
              status: 'approved',
              description: getProjectDescription(project.projectId),
              validatedCredits: project.totalCredits,
              vintage: '2024',
              certifier: 'Verra',
              co2Equivalent: '1 credit = 1 ton CO2e'
            });
          } else {
            console.log(`❌ Project ${projectId} not found or inactive`);
          }
        } catch (error) {
          console.log(`❌ Project ${projectId} query failed:`, error.message);
        }
      }
      
      const approvedProjects = await Promise.all(projectPromises);
      
      if (approvedProjects.length === 0) {
        console.log('⚠️ No projects found in blockchain contract.');
        setMessage({ 
          type: 'error', 
          content: 'No projects available for purchase. Real projects need to be registered on the blockchain first through the Admin panel.' 
        });
      } else {
        console.log(`✅ Loaded ${approvedProjects.length} real blockchain projects`);
        setMessage({ 
          type: 'success', 
          content: `Loaded ${approvedProjects.length} real carbon projects from blockchain` 
        });
      }
      
      setProjects(approvedProjects);
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      setMessage({ 
        type: 'error', 
        content: 'Failed to load marketplace data. Please check your connection.' 
      });
    }
  };

  // Helper functions to get project metadata
  const getProjectName = (projectId) => {
    const names = {
      'AMAZON_001': 'Amazon Rainforest Conservation',
      'SOLAR_001': 'Solar Farm Maharashtra', 
      'BIOGAS_001': 'Community Biogas Program'
    };
    return names[projectId] || projectId;
  };

  const getProjectType = (projectId) => {
    const types = {
      'AMAZON_001': 'REDD+',
      'SOLAR_001': 'Renewable Energy',
      'BIOGAS_001': 'Biogas'
    };
    return types[projectId] || 'Carbon Offset';
  };

  const getProjectDescription = (projectId) => {
    const descriptions = {
      'AMAZON_001': 'Large-scale rainforest conservation project protecting 50,000 hectares of pristine Amazon rainforest.',
      'SOLAR_001': '100MW solar photovoltaic power project displacing grid electricity.',
      'BIOGAS_001': 'Small-scale biogas digesters for rural households replacing wood fuel.'
    };
    return descriptions[projectId] || 'Carbon credit project verified through Guardian PWE.';
  };  const loadUserPortfolio = async () => {
    try {
      if (!accountInfo?.accountId) return;

      const tokenBalance = await hederaClient.getTokenBalance();
      const retiredBalance = await hederaClient.getRetiredBalance();
      
      // Load transaction history from localStorage
      const transactions = JSON.parse(localStorage.getItem(`transactions_${accountInfo.accountId}`) || '[]');

      setUserPortfolio({
        credits: tokenBalance,
        retired: retiredBalance,
        transactions: transactions.slice(0, 10) // Show last 10 transactions
      });
    } catch (error) {
      console.error('Failed to load user portfolio:', error);
    }
  };

  const handlePurchaseCredits = async (project) => {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setMessage({ type: 'error', content: 'Please enter a valid amount' });
      return;
    }

    const amount = parseFloat(purchaseAmount);
    const totalPriceHbar = amount * project.pricePerCredit; // Price in HBAR
    const totalPriceTinybars = Math.round(totalPriceHbar * 1e8); // Convert to tinybars

    setLoading(true);
    setMessage({ type: '', content: '' });

    try {
      console.log('💳 Purchasing credits from project:', project.projectId);
      console.log('Amount:', amount, 'Price per credit:', project.pricePerCredit, 'Total (HBAR):', totalPriceHbar);
      
      // Execute purchase transaction on Hedera
      const result = await hederaClient.purchaseCredits(
        project.projectId,
        amount,
        totalPriceTinybars
      );

      if (result.success) {
        // Save transaction record
        const transaction = {
          id: result.transactionId,
          type: 'purchase',
          projectId: project.projectId,
          projectName: project.projectName,
          amount: amount,
          price: totalPriceHbar,
          timestamp: new Date().toISOString(),
          hashscanUrl: result.hashscanUrl,
          status: 'completed'
        };

        const existingTransactions = JSON.parse(localStorage.getItem(`transactions_${accountInfo.accountId}`) || '[]');
        const updatedTransactions = [transaction, ...existingTransactions];
        localStorage.setItem(`transactions_${accountInfo.accountId}`, JSON.stringify(updatedTransactions));

        setMessage({
          type: 'success',
          content: `✅ Successfully purchased ${amount} credits! View transaction: ${result.hashscanUrl}`
        });

        // Update project availability (mock)
        const updatedProjects = projects.map(p => 
          p.projectId === project.projectId 
            ? { ...p, availableCredits: p.availableCredits - amount }
            : p
        );
        setProjects(updatedProjects);

        // Refresh portfolio
        await loadUserPortfolio();
        
        // Update platform stats
        if (onStatsUpdate) {
          const stats = await hederaClient.getPlatformStats();
          onStatsUpdate(stats);
        }

        setPurchaseAmount('');
        setSelectedProject(null);
      } else {
        throw new Error('Purchase transaction failed');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      setMessage({
        type: 'error',
        content: `Purchase failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetireCredits = async () => {
    if (!retireAmount || parseFloat(retireAmount) <= 0) {
      setMessage({ type: 'error', content: 'Please enter a valid amount to retire' });
      return;
    }

    if (!retireReason.trim()) {
      setMessage({ type: 'error', content: 'Please provide a reason for retirement' });
      return;
    }

    const amount = parseFloat(retireAmount);

    if (amount > userPortfolio.credits) {
      setMessage({ type: 'error', content: 'Insufficient credits to retire' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', content: '' });

    try {
      console.log('🔥 Retiring credits:', amount);
      
      // Execute retirement transaction with HCS logging
      const result = await hederaClient.retireCredits(amount, retireReason);

      if (result.success) {
        // Save retirement record
        const retirement = {
          id: result.transactionId,
          type: 'retirement',
          amount: amount,
          reason: retireReason,
          timestamp: new Date().toISOString(),
          hashscanUrl: result.hashscanUrl,
          status: 'retired',
          certificate: `ECCX-RETIRE-${result.transactionId.slice(-8)}`
        };

        const existingTransactions = JSON.parse(localStorage.getItem(`transactions_${accountInfo.accountId}`) || '[]');
        const updatedTransactions = [retirement, ...existingTransactions];
        localStorage.setItem(`transactions_${accountInfo.accountId}`, JSON.stringify(updatedTransactions));

        setMessage({
          type: 'success',
          content: `🎉 Successfully retired ${amount} credits! Certificate: ${retirement.certificate}. View on HashScan: ${result.hashscanUrl}`
        });

        // Refresh portfolio
        await loadUserPortfolio();
        
        // Update platform stats
        if (onStatsUpdate) {
          const stats = await hederaClient.getPlatformStats();
          onStatsUpdate(stats);
        }

        setRetireAmount('');
        setRetireReason('');
      } else {
        throw new Error('Retirement transaction failed');
      }
    } catch (error) {
      console.error('Retirement failed:', error);
      setMessage({
        type: 'error',
        content: `Retirement failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProjectTypeIcon = (type) => {
    const icons = {
      'REDD+': '🌳',
      'Renewable Energy': '⚡',
      'Solar': '☀️',
      'Wind': '🌪️',
      'Biogas': '🔋',
      'Reforestation': '🌱',
      'Energy Efficiency': '💡'
    };
    return icons[type] || '🌍';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hedera-900">Carbon Credit Marketplace</h1>
          <p className="text-hedera-600 mt-1">
            Buy and retire verified micro-carbon credits on Hedera Testnet
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-eco-600">
            {userPortfolio.credits.toFixed(2)} ECCX
          </div>
          <div className="text-sm text-hedera-600">
            {userPortfolio.retired.toFixed(2)} retired
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hedera-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'browse'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            Browse Credits
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'portfolio'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            My Portfolio
          </button>
          <button
            onClick={() => setActiveTab('retire')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'retire'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            Retire Credits
          </button>
        </nav>
      </div>

      {/* Message Display */}
      {message.content && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' ? 'bg-eco-50 border border-eco-200 text-eco-700' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm break-all">{message.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-eco-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-eco-600 text-2xl">🌍</span>
              </div>
              <h3 className="text-lg font-medium text-hedera-900 mb-2">No credits available</h3>
              <p className="text-hedera-600">Check back later for new carbon credit projects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.projectId} className="card hover:shadow-lg transition-shadow">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getProjectTypeIcon(project.projectType)}</span>
                      <div>
                        <h3 className="font-semibold text-hedera-900">
                          {project.projectName}
                        </h3>
                        <p className="text-sm text-hedera-600">{project.projectType}</p>
                      </div>
                    </div>
                    <span className="badge-success text-xs">Verified</span>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-2 text-sm text-hedera-600 mb-4">
                    <p><span className="font-medium">Location:</span> {project.location}</p>
                    <p><span className="font-medium">Methodology:</span> {project.methodology}</p>
                    <p><span className="font-medium">Vintage:</span> {project.vintage || '2024'}</p>
                    <p><span className="font-medium">Certifier:</span> {project.certifier || 'Verra'}</p>
                  </div>

                  <p className="text-sm text-hedera-700 mb-4">
                    {project.description}
                  </p>

                  {/* Availability */}
                  <div className="bg-eco-50 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-eco-800">Available Credits</span>
                      <span className="text-lg font-bold text-eco-600">
                        {project.availableCredits?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-eco-200 rounded-full h-2">
                      <div 
                        className="bg-eco-600 h-2 rounded-full"
                        style={{ 
                          width: `${((project.availableCredits || 0) / (project.totalCredits || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-eco-700 mt-1">
                      {project.availableCredits} of {project.totalCredits} credits available
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-hedera-700 font-medium">Price per credit</span>
                    <span className="text-xl font-bold text-hedera-900">
                      {formatCurrency(project.pricePerCredit)}
                    </span>
                  </div>

                  {/* Purchase Interface */}
                  {selectedProject?.projectId === project.projectId ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-hedera-700 mb-1">
                          Amount (credits)
                        </label>
                        <input
                          type="number"
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          className="input-field"
                          placeholder="0.01"
                          step="0.01"
                          min="0.01"
                          max={project.availableCredits}
                        />
                      </div>
                      
                      {purchaseAmount && (
                        <div className="bg-hedera-50 rounded-lg p-3">
                          <div className="flex justify-between text-sm">
                            <span>Amount:</span>
                            <span>{purchaseAmount} credits</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Price:</span>
                            <span>{formatCurrency(parseFloat(purchaseAmount || 0) * project.pricePerCredit)}</span>
                          </div>
                          <div className="border-t border-hedera-200 mt-2 pt-2 flex justify-between font-medium">
                            <span>Total:</span>
                            <span>{formatCurrency(parseFloat(purchaseAmount || 0) * project.pricePerCredit)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePurchaseCredits(project)}
                          disabled={loading || !purchaseAmount}
                          className="btn-primary flex-1 flex justify-center items-center"
                        >
                          {loading ? (
                            <>
                              <div className="loading-spinner mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            '💳 Purchase'
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="btn-primary w-full"
                      disabled={!project.availableCredits || project.availableCredits <= 0}
                    >
                      🛒 Buy Credits
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-eco-600 mb-2">
                {userPortfolio.credits.toFixed(2)}
              </div>
              <div className="text-hedera-600">Active Credits</div>
              <div className="text-xs text-hedera-500 mt-1">
                ECCX tokens in wallet
              </div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {userPortfolio.retired.toFixed(2)}
              </div>
              <div className="text-hedera-600">Retired Credits</div>
              <div className="text-xs text-hedera-500 mt-1">
                Permanently retired
              </div>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {userPortfolio.transactions.length}
              </div>
              <div className="text-hedera-600">Transactions</div>
              <div className="text-xs text-hedera-500 mt-1">
                Total activity
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-hedera-900 mb-4">
              Recent Transactions
            </h3>

            {userPortfolio.transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-hedera-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-hedera-600 text-xl">📊</span>
                </div>
                <p className="text-hedera-600">No transactions yet</p>
                <p className="text-sm text-hedera-500 mt-1">
                  Purchase or retire credits to see activity
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-hedera-200">
                  <thead className="bg-hedera-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-hedera-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-hedera-500 uppercase tracking-wider">
                        Project/Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-hedera-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-hedera-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-hedera-500 uppercase tracking-wider">
                        Proof
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-hedera-200">
                    {userPortfolio.transactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge-${tx.type === 'purchase' ? 'success' : 'warning'} text-xs`}>
                            {tx.type === 'purchase' ? '💳 Purchase' : '🔥 Retirement'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-hedera-900">
                            {tx.projectName || tx.reason || 'Unknown'}
                          </div>
                          {tx.certificate && (
                            <div className="text-xs text-hedera-500">
                              Cert: {tx.certificate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-hedera-900">
                          {tx.amount} credits
                          {tx.price && (
                            <div className="text-xs text-hedera-500">
                              {formatCurrency(tx.price)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-hedera-500">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <a
                            href={tx.hashscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-eco-600 hover:text-eco-700 font-medium"
                          >
                            HashScan ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'retire' && (
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 text-2xl">🔥</span>
              </div>
              <h2 className="text-2xl font-bold text-hedera-900">Retire Carbon Credits</h2>
              <p className="text-hedera-600 mt-2">
                Permanently retire credits to claim your environmental impact. 
                This action cannot be undone and will be logged on HCS.
              </p>
            </div>

            <div className="bg-eco-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-eco-800">Available Credits:</span>
                <span className="text-2xl font-bold text-eco-600">
                  {userPortfolio.credits.toFixed(2)} ECCX
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Amount to Retire *
                </label>
                <input
                  type="number"
                  value={retireAmount}
                  onChange={(e) => setRetireAmount(e.target.value)}
                  className="input-field"
                  placeholder="0.01"
                  step="0.01"
                  min="0.01"
                  max={userPortfolio.credits}
                />
                <p className="text-xs text-hedera-500 mt-1">
                  Minimum: 0.01 credits • Available: {userPortfolio.credits.toFixed(2)} credits
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Retirement Reason *
                </label>
                <textarea
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="e.g., Corporate carbon offset for Q4 2024 operations, Personal travel offset, etc."
                />
                <p className="text-xs text-hedera-500 mt-1">
                  This reason will be permanently recorded on Hedera Consensus Service
                </p>
              </div>

              {retireAmount && retireReason && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Retirement Summary</h4>
                  <div className="space-y-1 text-sm text-orange-700">
                    <p><span className="font-medium">Amount:</span> {retireAmount} credits</p>
                    <p><span className="font-medium">CO2 Impact:</span> ~{retireAmount} tons CO2e</p>
                    <p><span className="font-medium">Reason:</span> {retireReason}</p>
                    <p><span className="font-medium">Action:</span> Permanent retirement (irreversible)</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleRetireCredits}
                  disabled={loading || !retireAmount || !retireReason || parseFloat(retireAmount || 0) > userPortfolio.credits}
                  className="btn-danger w-full flex justify-center items-center"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Retiring Credits...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔥</span>
                      Retire {retireAmount || '0'} Credits Permanently
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-hedera-500 text-center">
                <p>⚠️ Retirement is permanent and cannot be reversed</p>
                <p>A retirement certificate will be generated and logged to HCS</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
