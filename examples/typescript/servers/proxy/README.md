# H402 Demo Proxy Server Example

This is a universal proxy for demo purposes. It is not meant for production It makes any website or API payable via h402.

A reverse proxy server that adds payment requirements to any HTTP service using the H402 payment protocol.

## Installation

```bash
pnpm install
```

## Usage

Create a anthropic_config.json configuration file with the following structure:

```json
{
  "targetURL": "https://api.anthropic.com",
  "amount": 0.1,
  "evmAddress": "0x1BA55bD3e48e978A58506c3D66525cBAb5609d53",
  "solanaAddress": "9ynSUeUSVSbgTQ3Xcz7XLXueMrUrQEQjBKEwhEP87NfD",
  "network": "solana",
  "facilitator": {
    "url": "https://facilitator.bitgpt.xyz"
  },
  "headers": {
    "x-api-key": "AnthropicApiKey",
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  }
}
```

Run the proxy server with a configuration file:

```bash
pnpm dev anthropic_config.json 
```

The server will start on port 4021 and proxy all requests to the target URL after payment verification.

## Testing the Server

You can test the server using agent example:

```bash
cd ../../agent
# Ensure .env is setup
pnpm install
pnpm dev
```

## Payment Flow

1. **Request**: Client makes a request to a proxy endpoint
2. **Interception**: Proxy server intercepts the request and checks for payment requirements
3. **Payment Required**: Server responds with 402 status and available payment options
4. **Payment Choice**: Client chooses preferred payment method (EVM or Solana)
5. **Payment**: Client creates and signs payment transaction
6. **Verification**: Server verifies the payment via facilitator
7. **Access**: Server provides access to protected content
8. **Settlement**: Payment is settled on-chain

## Supported Networks & Tokens

### EVM Chains
- **BSC (Binance Smart Chain)**: USDT (0x55d398326f99059ff775485246999027b3197955)
- **Base**: USDC (configurable via network parameter)

### Solana
- **Mainnet**: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)

## Architecture Benefits

- **Better UX**: Users can choose their preferred payment method
- **Cross-Chain**: Support multiple blockchain ecosystems
- **Extensible**: Easy to add new networks and tokens
- **Granular Control**: Different payment options per route

