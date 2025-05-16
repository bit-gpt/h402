/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    SOLANA_MAINNET_RPC_URL: process.env.SOLANA_MAINNET_RPC_URL,
    SOLANA_MAINNET_WS_URL: process.env.SOLANA_MAINNET_WS_URL,
    API_URL: process.env.API_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
    BASE_RPC_URL: process.env.BASE_RPC_URL,
    BSC_RPC_URL: process.env.BSC_RPC_URL,
  },
  reactStrictMode: false
};
