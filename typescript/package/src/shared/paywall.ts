import { PaymentRequirements } from "../types";

interface GetPaywallHtmlParams {
  paymentRequirements: PaymentRequirements[];
  currentUrl: string;
  customTitle?: string;
  errorMessage?: string;
}

/**
 * Generates an HTML paywall page that allows users to pay for content access
 *
 * @param options - The options for generating the paywall
 * @param options.paymentRequirements - The payment requirements for the content
 * @param options.currentUrl - The URL of the content being accessed
 * @returns An HTML string containing the paywall page
 */
export function getPaywallHtml({
  paymentRequirements,
  currentUrl,
  customTitle,
  errorMessage,
}: GetPaywallHtmlParams): string {
  // Select the appropriate payment requirements based on network and scheme
  const selectedPaymentRequirements =
    paymentRequirements.find(
      (pr) =>
        pr.networkId === "base" &&
        pr.scheme === "exact"
    ) || paymentRequirements[0];

  // Format the amount for display
  const formattedAmount = "100"
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta content="width=device-width, initial-scale=1.0">
<title>Payment Required - ${formattedAmount}</title>
<link rel="icon" href="/favicon.ico" sizes="any" />

<!-- Pico CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">

<style>
  :root {
    --primary: #3b82f6;
    --primary-hover: #2563eb;
    --primary-focus: rgba(59, 130, 246, 0.25);
    --primary-inverse: #FFF;
  }
  
  body {
    background-color: #f9fafb;
    padding: 0;
  }

  .container {
    max-width: 32rem;
    margin: 4rem auto;
    padding: 2rem;
    background-color: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  h1 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .grid {
    margin-bottom: 1rem;
  }

  .network-icon, .coin-icon {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .icon {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    background-color: #f3f4f6;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.5rem;
  }
  
  .arrow-icon {
    margin-left: 0.5rem;
  }

  .payment-details {
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .payment-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .payment-row:last-child {
    margin-bottom: 0;
  }

  .payment-label {
    color: #4b5563;
  }

  .payment-value {
    font-weight: 500;
  }

  .hidden {
    display: none;
  }

  .status {
    text-align: center;
    font-size: 0.875rem;
    margin-top: 1rem;
  }
  
  /* Custom button style to match the design */
  .connect-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
  }
</style>

<!-- Inject server-side variables -->
<script>
  try {
    // Initialize h402 namespace
    window.h402 = {
      amount: ${100},
      paymentRequirements: ${JSON.stringify(selectedPaymentRequirements)},
      currentUrl: "${currentUrl}",
      state: {
        publicClient: null,
        chain: null,
        walletClient: null
      },
      config: {
        chainConfig: {
          8453: { // Base
            name: 'Base',
          // Base Mainnet
          "8453": {
            usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            usdtAddress: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
            tokens: {
              "usdc": {
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                name: "USDC",
                decimals: 6
              },
              "usdt": {
                address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
                name: "USDT",
                decimals: 6
              }
            }
          },
          // BSC Mainnet
          "56": {
            tokens: {
              "usdc": {
                address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                name: "USDC",
                decimals: 18
              },
              "usdt": {
                address: "0x55d398326f99059fF775485246999027B3197955",
                name: "USDT",
                decimals: 18
              }
            }
          }
        },
        networkToChainId: {
          "base": 8453,
          "bsc": 56,
          "solana": "mainnet"
        },
        // Solana token addresses
        solanaConfig: {
          "mainnet": {
            tokens: {
              "usdc": {
                address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                name: "USDC",
                decimals: 6
              },
              "usdt": {
                address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
                name: "USDT",
                decimals: 6
              }
            }
          }
        }
      }
    };
    console.log('Payment requirements initialized:', window.x402.paymentRequirements);
  } catch (error) {
    console.error('Error initializing x402:', error.message);
  };
</script>

<!-- x402 -->
<script type="module">
  // EVM imports
  import {
    createWalletClient,
    createPublicClient,
    http,
    parseEther,
    parseUnits,
    getContract,
    toHex,
  } from "https://esm.sh/viem@2.3.1";
  import { base } from "https://esm.sh/viem@2.3.1/chains";
  import { bsc } from "https://esm.sh/viem@2.3.1/chains";
  import { erc20Abi } from "https://esm.sh/viem@2.3.1/abi";
  import { injected, coinbaseWallet } from 'https://esm.sh/@wagmi/connectors';
  
  // Solana imports
  import { createWalletStore } from 'https://esm.sh/@wallet-standard/react';
  import { SolanaSignAndSendTransaction } from 'https://esm.sh/@solana/wallet-standard-features';
  import { Connection } from 'https://esm.sh/@solana/web3.js';

  const authorizationTypes = {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  // USDC ABI for version function
  const usdcABI = [{
    "inputs": [],
    "name": "version",
    "outputs": [{"internalType": "string","name": "","type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }];

  // Utility functions
  window.x402.utils = {
    createNonce: () => {
      return toHex(crypto.getRandomValues(new Uint8Array(32)));
    },
    
    formatAmount: (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    },

    getChainConfig: (chainId) => {
      return window.x402.config.chainConfig[chainId];
    },

    getTokenInfo: (chainId, tokenSymbol) => {
      const chainConfig = window.x402.config.chainConfig[chainId];
      if (!chainConfig || !chainConfig.tokens || !chainConfig.tokens[tokenSymbol]) {
        throw new Error('Token ' + tokenSymbol + ' not supported on chain ID ' + chainId);
      }
      return chainConfig.tokens[tokenSymbol];
    },

    getSolanaTokenInfo: (network, tokenSymbol) => {
      const solanaConfig = window.x402.config.solanaConfig[network];
      if (!solanaConfig || !solanaConfig.tokens || !solanaConfig.tokens[tokenSymbol]) {
        throw new Error('Token ' + tokenSymbol + ' not supported on Solana ' + network);
      }
      return solanaConfig.tokens[tokenSymbol];
    },

    getChainId: (network) => {
      return window.x402.config.networkToChainId[network];
    },

    getChain: (chainId) => {
      if (chainId === 8453) return base;
      if (chainId === 56) return bsc;
      throw new Error('Chain ID ' + chainId + ' not supported');
    },
    
    isSolanaNetwork: (network) => {
      return network === 'solana';
    },
    
    // Encode payment data to base64
    safeBase64Encode: (str) => {
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  };
  
  // Solana wallet handling
  window.x402.solana = {
    walletStore: null,
    connection: null,
    selectedAccount: null,
    
    // Initialize Solana wallet store
    initWalletStore: () => {
      window.x402.solana.walletStore = createWalletStore();
      return window.x402.solana.walletStore;
    },
    
    // Get available Solana wallets
    getWallets: () => {
      if (!window.x402.solana.walletStore) {
        window.x402.solana.initWalletStore();
      }
      return window.x402.solana.walletStore.get().wallets;
    },
    
    // Connect to a Solana wallet
    connectWallet: async (walletName) => {
      try {
        const wallets = window.x402.solana.getWallets();
        const wallet = wallets.find(w => w.name === walletName);
        
        if (!wallet) {
          throw new Error('Wallet ' + walletName + ' not found');
        }
        
        // Connect to the wallet
        const accounts = await wallet.features.standard.connect();
        
        if (accounts && accounts.length > 0) {
          window.x402.solana.selectedAccount = accounts[0];
          return accounts[0];
        } else {
          throw new Error('No accounts available in ' + wallet.name);
        }
      } catch (error) {
        console.error('Solana wallet connection error:', error);
        throw error;
      }
    },
    
    // Create a proxied Solana RPC client
    createProxiedRpc: () => {
      const endpoint = window.x402.config.solanaConfig.mainnet.endpoint || 'https://api.mainnet-beta.solana.com';
      window.x402.solana.connection = new Connection(endpoint);
      
      // Define the methods we need to support
      const supportedMethods = ['getLatestBlockhash', 'getSignatureStatuses', 'sendTransaction'];
      
      // Create a proxy that intercepts all method calls
      return new Proxy({}, {
        get(_, methodName) {
          // Only handle methods we support
          if (supportedMethods.includes(methodName)) {
            // Return a function that matches the expected signature for each method
            return (...args) => ({
              send: async () => {
                console.log('Calling Solana RPC: ' + methodName, args);
                
                // Use the connection object to make the actual call
                const result = await window.x402.solana.connection[methodName](...args);
                return { result };
              },
            });
          }
          
          // For unsupported methods, return a function that logs and throws an error
          return (...args) => {
            console.warn('Unsupported Solana RPC method called: ' + String(methodName), args);
            return {
              send: async () => {
                throw new Error('Unsupported Solana RPC method: ' + String(methodName));
              },
            };
          };
        },
      });
    },
    
    // Create a Solana payment
    createPayment: async (paymentRequirements) => {
      if (!window.x402.solana.selectedAccount) {
        throw new Error('No Solana wallet connected');
      }
      
      const signAndSendTransaction = window.x402.solana.selectedAccount.features[SolanaSignAndSendTransaction];
      
      if (!signAndSendTransaction) {
        throw new Error('Wallet does not support signAndSendTransaction');
      }
      
      // Create the payment client
      const paymentClient = {
        solanaClient: {
          publicKey: window.x402.solana.selectedAccount.address,
          rpc: window.x402.solana.createProxiedRpc(),
          signAndSendTransaction: signAndSendTransaction,
        },
      };
      
      // Use the h402 library to create the payment
      const paymentHeader = await createPayment(paymentRequirements, paymentClient);
      
      return paymentHeader;
    }
  };

  window.x402.utils.getVersion = async (publicClient, usdcAddress) => {
    const version = await publicClient.readContract({
      address: usdcAddress,
      abi: usdcABI,
      functionName: "version"
    });
    return version;
  };

  window.x402.utils.encodePayment = (payment) => {
    const safe = {
      ...payment,
      payload: {
        ...payment.payload,
        authorization: Object.fromEntries(
          Object.entries(payment.payload.authorization).map(([key, value]) => [
            key,
            typeof value === "bigint" ? value.toString() : value,
          ])
        ),
      },
    };
          ),
        },
      };
      return window.x402.utils.safeBase64Encode(JSON.stringify(safe));
    },
    createPaymentHeader: async (client, publicClient) => {
      const payment = await window.x402.utils.createPayment(client, publicClient);
      return window.x402.utils.encodePayment(payment);
    },
  }

  window.x402.utils.signAuthorization = async (walletClient, authorizationParameters, paymentRequirements, publicClient) => {
    const chainId = window.x402.utils.getNetworkId(paymentRequirements.network);
    const name = paymentRequirements.extra?.name ?? window.x402.config.chainConfig[chainId].usdcName;
    const erc20Address = paymentRequirements.asset;
    const version = paymentRequirements.extra?.version ?? await window.x402.utils.getVersion(publicClient, erc20Address);
    const { from, to, value, validAfter, validBefore, nonce } = authorizationParameters;
    const data = {
      account: walletClient.account,
      types: authorizationTypes,
      domain: {
        name,
        version,
        chainId,
        verifyingContract: erc20Address,
      },
      primaryType: "TransferWithAuthorization",
      message: {
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
      },
    };

    const signature = await walletClient.signTypedData(data);

    return {
      signature,
    };
  }

  window.x402.utils.createPayment = async (client, publicClient) => {
    if (!window.x402.paymentRequirements) {
      throw new Error('Payment requirements not initialized');
    }

    const nonce = window.x402.utils.createNonce();
    const version = await window.x402.utils.getVersion(publicClient, window.x402.utils.getUsdcAddressForChain(window.x402.utils.getNetworkId(window.x402.paymentRequirements.network)));
    const from = client.account.address;

    const validAfter = BigInt(
      Math.floor(Date.now() / 1000) - 60 // 60 seconds before
    );
    const validBefore = BigInt(
      Math.floor(Date.now() / 1000 + window.x402.paymentRequirements.maxTimeoutSeconds)
    );

    const { signature } = await window.x402.utils.signAuthorization(
      client,
      {
        from,
        to: window.x402.paymentRequirements.payTo,
        value: window.x402.paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
        version,
      },
      window.x402.paymentRequirements,
      publicClient
    );

    return {
      x402Version: 1,
      scheme: window.x402.paymentRequirements.scheme,
      network: window.x402.paymentRequirements.network,
      payload: {
        signature,
        authorization: {
          from,
          to: window.x402.paymentRequirements.payTo,
          value: window.x402.paymentRequirements.maxAmountRequired,
          validAfter,
          validBefore,
          nonce,
        },
      },
    };
  }


  async function initializeApp() {
    const x402 = window.x402;
    
    // Get network and token selection elements
    const networkSelect = document.getElementById('network-select');
    const tokenSelect = document.getElementById('token-select');
    const connectWalletBtn = document.getElementById('connect-wallet');
    const paymentSection = document.getElementById('payment-section');
    const payButton = document.getElementById('pay-button');
    const statusDiv = document.getElementById('status');

    if (!networkSelect || !tokenSelect || !connectWalletBtn || !paymentSection || !payButton || !statusDiv) {
      console.error('Required DOM elements not found');
      return;
    }

    // Initialize selected network and token
    let selectedNetwork = networkSelect.value;
    let selectedToken = tokenSelect.value;
    let walletClient = null;
    let publicClient = null;
    
    // Configure chains for EVM networks
    const wagmiConfig = createConfig({
      chains: [base, bsc],
      connectors: [
        coinbaseWallet({ appName: 'h402 Payment' }),
        injected(),
      ],
      transports: {
        [base.id]: http(),
        [bsc.id]: http(),
      },
    });
    
    // Initialize public client based on selected network
    function updatePublicClient() {
      if (window.x402.utils.isSolanaNetwork(selectedNetwork)) {
        // Solana client initialization would go here
        // For now, we'll just set it to null and handle differently
        publicClient = null;
        return;
      }
      
      const chainId = window.x402.utils.getChainId(selectedNetwork);
      const chain = window.x402.utils.getChain(chainId);
      
      publicClient = createPublicClient({
        chain,
        transport: http(),
      });
    }
    
    // Initialize with default network
    updatePublicClient();

    // Handle network and token selection changes
    networkSelect.addEventListener('change', () => {
      selectedNetwork = networkSelect.value;
      updatePublicClient();
      updateTokenOptions();
      updatePaymentInfo();
    });
    
    tokenSelect.addEventListener('change', () => {
      selectedToken = tokenSelect.value;
      updatePaymentInfo();
    });
    
    // Function to update token options based on selected network
    function updateTokenOptions() {
      // Clear existing options
      tokenSelect.innerHTML = '';
      
      // Add token options based on selected network
      if (window.x402.utils.isSolanaNetwork(selectedNetwork)) {
        // Solana tokens
        const solanaConfig = window.x402.config.solanaConfig[selectedNetwork];
        if (solanaConfig && solanaConfig.tokens) {
          Object.keys(solanaConfig.tokens).forEach(token => {
            const option = document.createElement('option');
            option.value = token;
            option.textContent = token;
            tokenSelect.appendChild(option);
          });
        }
      } else {
        // EVM tokens
        const chainId = window.x402.utils.getChainId(selectedNetwork);
        const chainConfig = window.x402.utils.getChainConfig(chainId);
        if (chainConfig && chainConfig.tokens) {
          Object.keys(chainConfig.tokens).forEach(token => {
            const option = document.createElement('option');
            option.value = token;
            option.textContent = token;
            tokenSelect.appendChild(option);
          });
        }
      }
      
      // Update selected token to first option
      if (tokenSelect.options.length > 0) {
        selectedToken = tokenSelect.options[0].value;
        tokenSelect.value = selectedToken;
      }
    }
    
    // Function to update payment information based on selected network and token
    function updatePaymentInfo() {
      // Update payment amount display with selected token
      const amountDisplay = document.getElementById('payment-amount');
      if (amountDisplay) {
        amountDisplay.textContent = selectedToken + ' ' + window.x402.amount;
      }
    }
    
    // Initialize token options
    updateTokenOptions();
    updatePaymentInfo();
    
    // Connect wallet handler
    connectWalletBtn.addEventListener('click', async () => {
      // If wallet is already connected, disconnect it
      if (walletClient) {
        try {
          if (!window.x402.utils.isSolanaNetwork(selectedNetwork)) {
            await disconnect(wagmiConfig);
          } else {
            // Disconnect Solana wallet
            window.x402.solana.selectedAccount = null;
          }
          walletClient = null;
          connectWalletBtn.textContent = 'Connect Wallet';
          paymentSection.classList.add('hidden');
          statusDiv.textContent = 'Wallet disconnected';
          return;
        } catch (error) {
          statusDiv.textContent = 'Failed to disconnect wallet';
          return;
        }
      }

      try {
        statusDiv.textContent = 'Connecting wallet...';
        
        // Handle Solana wallet connection
        if (window.x402.utils.isSolanaNetwork(selectedNetwork)) {
          // Initialize Solana wallet store if needed
          if (!window.x402.solana.walletStore) {
            window.x402.solana.initWalletStore();
          }
          
          // Get available Solana wallets
          const wallets = window.x402.solana.getWallets();
          
          if (wallets.length === 0) {
            throw new Error('No Solana wallets found. Please install a Solana wallet extension.');
          }
          
          // Show wallet selection UI
          const walletSelectionDiv = document.createElement('div');
          walletSelectionDiv.className = 'wallet-selection';
          walletSelectionDiv.innerHTML = 
            '<h3>Select a Solana Wallet</h3>' +
            '<div class="wallet-options"></div>';
          
          const walletOptionsDiv = walletSelectionDiv.querySelector('.wallet-options');
          
          // Create buttons for each wallet
          wallets.forEach(wallet => {
            const walletButton = document.createElement('button');
            walletButton.className = 'wallet-option';
            
            // Create wallet icon if available
            let iconHtml = '';
            if (wallet.icon) {
              iconHtml = '<img src="' + wallet.icon + '" alt="' + wallet.name + ' icon" class="wallet-icon" />';
            } else {
              iconHtml = '<div class="wallet-icon-placeholder">W</div>';
            }
            
            walletButton.innerHTML = 
              iconHtml +
              '<span>' + wallet.name + '</span>';
            
            // Add click handler
            walletButton.addEventListener('click', async () => {
              try {
                statusDiv.textContent = 'Connecting to ' + wallet.name + '...';
                const account = await window.x402.solana.connectWallet(wallet.name);
                
                if (account) {
                  walletClient = { account };
                  connectWalletBtn.textContent = account.address.slice(0, 6) + '...' + account.address.slice(-4);
                  paymentSection.classList.remove('hidden');
                  statusDiv.textContent = 'Solana wallet ' + wallet.name + ' connected! You can now proceed with payment.';
                  
                  // Remove wallet selection UI
                  document.body.removeChild(walletSelectionDiv);
                }
              } catch (error) {
                statusDiv.textContent = 'Failed to connect to ' + wallet.name + ': ' + error.message;
              }
            });
            
            walletOptionsDiv.appendChild(walletButton);
          });
          
          // Add close button
          const closeButton = document.createElement('button');
          closeButton.className = 'close-button';
          closeButton.textContent = 'Cancel';
          closeButton.addEventListener('click', () => {
            document.body.removeChild(walletSelectionDiv);
            statusDiv.textContent = 'Wallet connection cancelled';
          });
          
          walletSelectionDiv.appendChild(closeButton);
          
          // Add wallet selection UI to the document
          document.body.appendChild(walletSelectionDiv);
          
          // Add styles for wallet selection UI
          const styleElement = document.createElement('style');
          styleElement.textContent = 
            '.wallet-selection {' +
            '  position: fixed;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  background-color: white;' +
            '  padding: 1.5rem;' +
            '  border-radius: 0.75rem;' +
            '  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);' +
            '  z-index: 1000;' +
            '  max-width: 90%;' +
            '  width: 400px;' +
            '}' +
            
            '.wallet-selection h3 {' +
            '  margin-top: 0;' +
            '  margin-bottom: 1rem;' +
            '  text-align: center;' +
            '}' +
            
            '.wallet-options {' +
            '  display: flex;' +
            '  flex-direction: column;' +
            '  gap: 0.75rem;' +
            '  margin-bottom: 1rem;' +
            '}' +
            
            '.wallet-option {' +
            '  display: flex;' +
            '  align-items: center;' +
            '  gap: 0.75rem;' +
            '  padding: 0.75rem;' +
            '  border: 1px solid #e5e7eb;' +
            '  border-radius: 0.5rem;' +
            '  background-color: #f9fafb;' +
            '  cursor: pointer;' +
            '  transition: background-color 0.2s;' +
            '}' +
            
            '.wallet-option:hover {' +
            '  background-color: #f3f4f6;' +
            '}' +
            
            '.wallet-icon, .wallet-icon-placeholder {' +
            '  width: 24px;' +
            '  height: 24px;' +
            '  border-radius: 4px;' +
            '  object-fit: contain;' +
            '}' +
            
            '.wallet-icon-placeholder {' +
            '  display: flex;' +
            '  align-items: center;' +
            '  justify-content: center;' +
            '  background-color: #e5e7eb;' +
            '  color: #4b5563;' +
            '  font-weight: bold;' +
            '  font-size: 12px;' +
            '}' +
            
            '.close-button {' +
            '  width: 100%;' +
            '  padding: 0.5rem;' +
            '  background-color: #f3f4f6;' +
            '  border: 1px solid #e5e7eb;' +
            '  border-radius: 0.5rem;' +
            '  cursor: pointer;' +
            '}' +
            
            '.close-button:hover {' +
            '  background-color: #e5e7eb;' +
            '}';
          
          document.head.appendChild(styleElement);
          
          return;
        }
        
        // Handle EVM wallet connection
        const chainId = window.x402.utils.getChainId(selectedNetwork);
        const chain = window.x402.utils.getChain(chainId);
        
        const result = await connect(wagmiConfig, {
          connector: injected(),
          chainId: chain.id,
        });
        
        if (!result.accounts?.[0]) {
          throw new Error('Please select an account in your wallet');
        }
        
        walletClient = createWalletClient({
          account: result.accounts[0],
          chain,
          transport: http()
        });

        const address = result.accounts[0];

        connectWalletBtn.textContent = address.slice(0, 6) + '...' + address.slice(-4);
        paymentSection.classList.remove('hidden');
        statusDiv.textContent = 'Wallet connected on ' + selectedNetwork + '! You can now proceed with payment.';
      } catch (error) {
        console.error('Connection error:', error);
        statusDiv.textContent =
          error instanceof Error ? error.message : 'Failed to connect wallet';
        // Reset UI state
      return;
    }
  });

  // Payment button handler
  payButton.addEventListener('click', async () => {
    if (!walletClient) {
      statusDiv.textContent = 'Please connect your wallet first';
      return;
    }

    try {
      statusDiv.textContent = 'Processing payment...';
      
      // Handle Solana payment
      if (window.x402.utils.isSolanaNetwork(selectedNetwork)) {
        // Get token info
        const tokenInfo = window.x402.utils.getSolanaTokenInfo('mainnet', selectedToken);
        
        // Create Solana payment details
        const solanaPaymentRequirements = {
          scheme: 'exact',
          namespace: 'solana',
          networkId: 'mainnet',
          amountRequired: window.x402.amount * Math.pow(10, tokenInfo.decimals),
          amountRequiredFormat: 'smallestUnit',
          payToAddress: window.x402.paymentRequirements.payToAddress,
          tokenAddress: tokenInfo.address,
          resource: window.x402.paymentRequirements.resource || window.x402.currentUrl,
          description: 'Access to premium content',
          mimeType: 'text/html',
          outputSchema: null,
          estimatedProcessingTime: 30,
          extra: null
        };
        
        // Create the Solana payment
        const paymentHeader = await window.x402.solana.createPayment(solanaPaymentRequirements);
        
        // Redirect with payment header
        // Following the x402 protocol, we need to send the X-PAYMENT header
        // Since we can't set headers with client-side navigation, we'll use a form submission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = window.x402.currentUrl;
        form.style.display = 'none';
        
        // Add the X-PAYMENT header as a form field
        // The middleware will look for this field in the form data
        const paymentField = document.createElement('input');
        paymentField.type = 'hidden';
        paymentField.name = 'X-PAYMENT';
        paymentField.value = paymentHeader;
        form.appendChild(paymentField);
        
        // Append the form to the document and submit it
        document.body.appendChild(form);
        form.submit();
        return;
      }
      
      // Handle EVM payment
      const chainId = window.x402.utils.getChainId(selectedNetwork);
      const chain = window.x402.utils.getChain(chainId);
      const tokenInfo = window.x402.utils.getTokenInfo(chainId, selectedToken);
      
      // Check token balance
      const balance = await publicClient.readContract({
        address: tokenInfo.address,
        abi: [{
          inputs: [{ internalType: "address", name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function"
        }],
        functionName: "balanceOf",
        args: [walletClient.account.address]
      });

      if (balance === 0n) {
          statusDiv.textContent = \`Your USDC balance is 0. Please make sure you have USDC tokens on ${
    "Base"
          }.\`;
          return;
        }

        statusDiv.textContent = 'Creating payment signature...';

        const paymentHeader = await x402.utils.createPaymentHeader(walletClient, publicClient);

        statusDiv.textContent = 'Requesting content with payment...';

        const response = await fetch(x402.currentUrl, {
          headers: {
            'X-PAYMENT': paymentHeader,
            'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            document.documentElement.innerHTML = await response.text();
          } else {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.location.href = url;
          }
        } else {
          throw new Error('Payment failed: ' + response.statusText);
        }
      } catch (error) {
        statusDiv.textContent = error instanceof Error ? error.message : 'Failed to check USDC balance';
      }
    } catch (error) {
      statusDiv.textContent = error instanceof Error ? error.message : 'Payment failed';
    }
  });
}

window.addEventListener('load', initializeApp);
</script>
</head>

<body>
  <main class="container">
    <header>
      <h1>${customTitle || "Pay from your Wallet"}</h1>
    </header>

    <article>
      <div class="grid">
        <div>
          <label for="network-select">Network</label>
          <select id="network-select">
            <option value="base" selected>
              <span class="network-icon">
                <span class="icon">B</span>
                Base
              </span>
            </option>
            <option value="bsc">
              <span class="network-icon">
                <span class="icon">BNB</span>
                Binance Smart Chain
              </span>
            </option>
            <option value="solana">
              <span class="network-icon">
                <span class="icon">SOL</span>
                Solana
              </span>
            </option>
          </select>
        </div>
        
        <div>
          <label for="coin-select">Coin</label>
          <select id="coin-select">
            <option value="usdc" selected>
              <span class="coin-icon">
                <span class="icon" style="background-color: #2775CA; color: white;">C</span>
                USDC
              </span>
            </option>
            <option value="usdt">
              <span class="coin-icon">
                <span class="icon" style="background-color: #26A17B; color: white;">T</span>
                USDT
              </span>
            </option>
          </select>
        </div>
      </div>
      
      <div id="connect-section">
        <button id="connect-wallet" class="connect-button" role="button">
          Connect Wallet to Pay - ${formattedAmount}
          <span class="arrow-icon">→</span>
        </button>
      </div>

      <div id="payment-section" class="hidden">
        <div class="payment-details">
          <div class="payment-row">
            <span class="payment-label">Amount:</span>
            <span class="payment-value">${formattedAmount} USDC</span>
          </div>
          <div class="payment-row">
            <span class="payment-label">Network:</span>
            <span class="payment-value">Base</span>
          </div>
        </div>

        <button id="pay-button" class="secondary">
          Pay Now
        </button>
      </div>
      <div id="status" class="status"></div>
    </article>
  </main>
</body>
</html>
`;
}
