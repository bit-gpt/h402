import { config } from "dotenv";
import { decodeXPaymentResponse, wrapFetchWithPayment, createEvmClient, createSolanaClient, PaymentClient } from "@bit-gpt/h402-fetch";
import { type Hex } from "viem";
import { base } from "viem/chains";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex | undefined;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as string | undefined;
const baseURL = process.env.RESOURCE_SERVER_URL as string; 
const endpointPath = process.env.ENDPOINT_PATH as string;
const url = `${baseURL}${endpointPath}`; 

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

const fetchWithPayment = wrapFetchWithPayment(fetch, paymentClient);

fetchWithPayment(url, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log(body);

    const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
    console.log(paymentResponse);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
