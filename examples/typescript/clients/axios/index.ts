import axios from "axios";
import { config } from "dotenv";
import { type Hex } from "viem";
import { withPaymentInterceptor, decodeXPaymentResponse, createEvmClient, createSolanaClient, PaymentClient } from "@bit-gpt/h402-axios";
import { base } from "viem/chains";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string;
const endpointPath = process.env.ENDPOINT_PATH as string;

if (!baseURL || !endpointPath) {
  console.error("Missing required environment variables: RESOURCE_SERVER_URL or ENDPOINT_PATH");
  process.exit(1);
}

if (!evmPrivateKey && !solanaPrivateKey) {
  console.error("At least one of EVM_PRIVATE_KEY or SOLANA_PRIVATE_KEY must be provided");
  process.exit(1);
}

const evmClient = evmPrivateKey
  ? createEvmClient(evmPrivateKey, base)
  : undefined;

const solanaClient = solanaPrivateKey
  ? createSolanaClient(solanaPrivateKey)
  : undefined;

const paymentClient: PaymentClient = {
  evmClient,
  solanaClient,
};

// Create the API client with payment interceptor
// If multiple clients are provided, the payment interceptor will use the first one that is available according to payment requirements
// You can comment out the evmClient to test the solana client
const api = withPaymentInterceptor(
  axios.create({
    baseURL,
  }),
  paymentClient,
);

api
  .get(endpointPath)
  .then(response => {
    console.log(response.data);

    const paymentResponse = decodeXPaymentResponse(response.headers["x-payment-response"]);
    console.log(paymentResponse);
  })
  .catch(error => {
    console.error("example axios error", error);
  });
