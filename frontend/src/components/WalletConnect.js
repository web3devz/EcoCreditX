import React, { useState } from 'react';

/**
 * WalletConnect Component
 * 
 * Handles Hedera account connection for the EcoCreditX marketplace
 * In production, this would integrate with Hedera Wallet SDK or similar
 * 
 * References:
 * - Hedera Account: https://docs.hedera.com/guides/docs/sdks/account
 * - Wallet Integration: https://docs.hedera.com/guides/docs/wallets
 */

const WalletConnect = ({ onConnect }) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [credentials, setCredentials] = useState({
    accountId: '',
    privateKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleManualConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate input format
      if (!credentials.accountId.match(/^0\.0\.\d+$/)) {
        throw new Error('Account ID must be in format 0.0.XXXXX');
      }

      if (!credentials.privateKey || credentials.privateKey.length !== 64) {
        throw new Error('Private key must be 64 characters long');
      }

      // In production, these would be securely stored/retrieved
      localStorage.setItem('hedera_account_id', credentials.accountId);
      localStorage.setItem('hedera_private_key', credentials.privateKey);

      const result = await onConnect(credentials);
      
      if (result.success) {
        setShowManualInput(false);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectWithWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // In production, this would use Hedera Wallet SDK
      // For now, check if credentials exist in environment/storage
      const storedAccountId = localStorage.getItem('hedera_account_id') || process.env.REACT_APP_HEDERA_OPERATOR_ID;
      const storedPrivateKey = localStorage.getItem('hedera_private_key') || process.env.REACT_APP_HEDERA_OPERATOR_KEY;

      if (storedAccountId && storedPrivateKey) {
        const result = await onConnect({
          accountId: storedAccountId,
          privateKey: storedPrivateKey
        });

        if (!result.success) {
          throw new Error(result.error || 'Connection failed');
        }
      } else {
        setShowManualInput(true);
      }
    } catch (err) {
      setError(err.message);
      setShowManualInput(true);
    } finally {
      setLoading(false);
    }
  };

  const loadTestnetSample = () => {
    setCredentials({
      accountId: '0.0.12345',
      privateKey: 'your_64_character_private_key_here_replace_with_actual_key'
    });
  };

  if (showManualInput) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card">
          <h3 className="text-lg font-semibold text-hedera-900 mb-4">
            Connect Hedera Account
          </h3>
          
          <form onSubmit={handleManualConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-hedera-700 mb-1">
                Account ID
              </label>
              <input
                type="text"
                placeholder="0.0.12345"
                value={credentials.accountId}
                onChange={(e) => setCredentials(prev => ({ ...prev, accountId: e.target.value }))}
                className="input-field"
                required
              />
              <p className="text-xs text-hedera-500 mt-1">
                Your Hedera testnet account ID
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-hedera-700 mb-1">
                Private Key
              </label>
              <input
                type="password"
                placeholder="Enter your 64-character private key"
                value={credentials.privateKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, privateKey: e.target.value }))}
                className="input-field font-mono text-sm"
                required
              />
              <p className="text-xs text-hedera-500 mt-1">
                Your account's private key (kept locally)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Connection Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex justify-center items-center"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect Account'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-hedera-200">
            <h4 className="text-sm font-medium text-hedera-700 mb-2">
              Need a testnet account?
            </h4>
            <div className="space-y-2 text-sm text-hedera-600">
              <p>1. Visit <a href="https://portal.hedera.com/" className="text-eco-600 hover:underline" target="_blank" rel="noopener noreferrer">Hedera Portal</a></p>
              <p>2. Create a testnet account</p>
              <p>3. Fund it with testnet HBAR</p>
              <p>4. Use your credentials above</p>
            </div>
            
            <button
              onClick={loadTestnetSample}
              className="mt-3 text-xs text-hedera-500 hover:text-hedera-700 underline"
            >
              Load sample format
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={connectWithWallet}
        disabled={loading}
        className="btn-primary flex items-center space-x-2"
      >
        {loading ? (
          <>
            <div className="loading-spinner"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>Connect Wallet</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
