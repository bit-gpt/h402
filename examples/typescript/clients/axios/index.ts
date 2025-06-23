import axios from "axios";
import { config } from "dotenv";
import { createWalletClient, http, publicActions, type Hex } from "viem";
import { withPaymentInterceptor, decodeXPaymentResponse } from "h402-axios";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import type { TransactionModifyingSigner } from "@solana/signers";
import type { Transaction } from "@solana/transactions";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

config();

const evmPrivateKey = process.env.EVM_PRIVATE_KEY as Hex;
const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY as Hex;
const baseURL = process.env.RESOURCE_SERVER_URL as string; // e.g. http://localhost:3000
const endpointPath = process.env.ENDPOINT_PATH as string; // e.g. /image

if (!baseURL || !evmPrivateKey || !endpointPath) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// EVM client
const evmAccount = privateKeyToAccount(evmPrivateKey);
const evmClient = createWalletClient({
  account: evmAccount,
  transport: http(),
  chain: bsc,
}).extend(publicActions);

// Solana client
const solanaKeypair = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
const solanaClient = {
  publicKey: solanaKeypair.publicKey.toBase58(),
  signTransaction: async <T extends Transaction>(
    transactions: readonly T[],
  ): Promise<readonly T[]> => {
    const signer = await createKeyPairSignerFromBytes(solanaKeypair.secretKey);
    const signatures = await signer.signTransactions(transactions);
    const modifiedTransactions = transactions.map((transaction, index) => {
      const signature = signatures[index];
      if (!signature || Object.keys(signature).length === 0) {
        throw new Error(`Failed to sign transaction at index ${index}`);
      }
      return {
        ...transaction,
        signatures: {
          ...transaction.signatures,
          ...signature,
        },
      } as T;
    });
    return modifiedTransactions;
  },
} satisfies {
  publicKey: string;
  signTransaction: TransactionModifyingSigner["modifyAndSignTransactions"];
};

// Create the API client with payment interceptor
// If multiple clients are provided, the payment interceptor will use the first one that is available according to payment requirements
// You can comment out the evmClient to test the solana client
const api = withPaymentInterceptor(
  axios.create({
    baseURL,
  }),
  {
    evmClient,
    solanaClient,
  },
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
