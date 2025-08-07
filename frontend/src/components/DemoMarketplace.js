import React, { useState, useEffect } from 'react';

/**
 * Simple Demo Marketplace Component
 * Works completely offline with mock data for immediate testing
 */

const DemoMarketplace = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [userPortfolio, setUserPortfolio] = useState({ credits: 0, transactions: [] });
  const [message, setMessage] = useState({ type: '', content: '' });
  const [loading, setLoading] = useState(false);

  // Initialize demo projects
  useEffect(() => {
    const demoProjects = [
      {
        projectId: 'DEMO_001',
        projectName: 'Amazon Rainforest Conservation',
        projectType: 'REDD+',
        location: 'Amazon Basin, Brazil',
        methodology: 'VCS',
        totalCredits: 10000,
        availableCredits: 7500,
        pricePerCredit: 0.05, // HBAR
        developer: '0.0.12345',
        status: 'approved',
        description: 'Large-scale rainforest conservation project protecting 50,000 hectares.',
        vintage: '2024',
        certifier: 'Verra'
      },
      {
        projectId: 'DEMO_002', 
        projectName: 'Solar Farm Maharashtra',
        projectType: 'Renewable Energy',
        location: 'Maharashtra, India',
        methodology: 'VCS',
        totalCredits: 5000,
        availableCredits: 3200,
        pricePerCredit: 0.03, // HBAR
        developer: '0.0.54321',
        status: 'approved',
        description: '100MW solar photovoltaic power project displacing grid electricity.',
        vintage: '2024',
        certifier: 'Verra'
      },
      {
        projectId: 'DEMO_003',
        projectName: 'Community Biogas Program',
        projectType: 'Biogas',
        location: 'Rural Kenya',
        methodology: 'VCS',
        totalCredits: 2500,
        availableCredits: 1800,
        pricePerCredit: 0.07, // HBAR
        developer: '0.0.67890',
        status: 'approved',
        description: 'Small-scale biogas digesters for rural households.',
        vintage: '2024',
        certifier: 'Verra'
      }
    ];
    
    setProjects(demoProjects);
  }, []);

  const handlePurchaseCredits = async () => {
    if (!selectedProject || !purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setMessage({ type: 'error', content: 'Please select a project and enter a valid amount' });
      return;
    }

    const amount = parseFloat(purchaseAmount);
    const totalPriceHbar = amount * selectedProject.pricePerCredit;

    if (amount > selectedProject.availableCredits) {
      setMessage({ type: 'error', content: 'Not enough credits available' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', content: 'Processing purchase...' });

    try {
      // Simulate purchase processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock transaction ID
      const mockTransactionId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}.demo`;
      
      // Update project availability
      const updatedProjects = projects.map(p => 
        p.projectId === selectedProject.projectId 
          ? { ...p, availableCredits: p.availableCredits - amount }
          : p
      );
      setProjects(updatedProjects);

      // Update user portfolio
      const transaction = {
        id: mockTransactionId,
        type: 'purchase',
        projectId: selectedProject.projectId,
        projectName: selectedProject.projectName,
        amount: amount,
        price: totalPriceHbar,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      setUserPortfolio(prev => ({
        credits: prev.credits + amount,
        transactions: [transaction, ...prev.transactions.slice(0, 9)]
      }));

      setMessage({
        type: 'success',
        content: `✅ Successfully purchased ${amount} credits for ${totalPriceHbar} HBAR! Transaction: ${mockTransactionId}`
      });

      setPurchaseAmount('');
      setSelectedProject(null);
    } catch (error) {
      setMessage({ type: 'error', content: 'Purchase failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const retireCredits = async (amount, reason) => {
    if (amount > userPortfolio.credits) {
      setMessage({ type: 'error', content: 'Insufficient credits to retire' });
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockTransactionId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}.retire`;
      
      const transaction = {
        id: mockTransactionId,
        type: 'retirement',
        amount: amount,
        reason: reason,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      setUserPortfolio(prev => ({
        credits: prev.credits - amount,
        transactions: [transaction, ...prev.transactions.slice(0, 9)]
      }));

      setMessage({
        type: 'success',
        content: `✅ Successfully retired ${amount} credits! Reason: ${reason}`
      });
    } catch (error) {
      setMessage({ type: 'error', content: 'Retirement failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🌱 EcoCreditX Demo Marketplace
          </h1>
          <p className="text-gray-600">
            Functional carbon credit marketplace prototype - Click to purchase and retire credits!
          </p>
        </div>

        {/* Message Display */}
        {message.content && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {message.content}
          </div>
        )}

        {/* User Portfolio */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userPortfolio.credits}</div>
              <div className="text-sm text-gray-600">Carbon Credits Owned</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{userPortfolio.transactions.length}</div>
              <div className="text-sm text-gray-600">Total Transactions</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <button
                onClick={() => retireCredits(10, 'Corporate offset demonstration')}
                disabled={userPortfolio.credits < 10 || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                🔥 Retire 10 Credits
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {projects.map(project => (
            <div key={project.projectId} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">{project.projectName}</h3>
              <p className="text-gray-600 text-sm mb-3">{project.description}</p>
              
              <div className="space-y-2 text-sm">
                <div><strong>Location:</strong> {project.location}</div>
                <div><strong>Type:</strong> {project.projectType}</div>
                <div><strong>Available:</strong> {project.availableCredits} credits</div>
                <div><strong>Price:</strong> {project.pricePerCredit} HBAR per credit</div>
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={selectedProject?.projectId === project.projectId ? purchaseAmount : ''}
                  onChange={(e) => {
                    setSelectedProject(project);
                    setPurchaseAmount(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  min="0.01"
                  step="0.01"
                  max={project.availableCredits}
                />
                <button
                  onClick={handlePurchaseCredits}
                  disabled={loading || selectedProject?.projectId !== project.projectId || !purchaseAmount}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '⏳' : '💳'} Buy
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        {userPortfolio.transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {userPortfolio.transactions.map(tx => (
                <div key={tx.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {tx.type === 'purchase' ? '💳 Purchase' : '🔥 Retirement'}: {tx.amount} credits
                      </div>
                      {tx.projectName && <div className="text-sm text-gray-600">{tx.projectName}</div>}
                      {tx.reason && <div className="text-sm text-gray-600">Reason: {tx.reason}</div>}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{new Date(tx.timestamp).toLocaleDateString()}</div>
                      <div className="font-mono text-xs">{tx.id}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoMarketplace;
