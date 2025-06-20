import { config } from "dotenv";
import { createWalletClient, http, publicActions, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "h402-fetch";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. https://example.com
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /weather
const url = `${baseURL}${endpointPath}`; // e.g. https://example.com/weather

if (!baseURL || !evmPrivateKey || !endpointPath) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const account = privateKeyToAccount(evmPrivateKey);
const evmClient = createWalletClient({
  account,
  chain: bsc,
  transport: http(),
}).extend(publicActions);

const paymentClient = {
  evmClient,
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
