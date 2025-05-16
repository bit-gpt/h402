import {
  createSolanaRpc,
  address,
  createTransactionMessage,
  appendTransactionMessageInstruction,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  compileTransaction,
  pipe,
  type CompilableTransactionMessage,
  type TransactionMessageWithBlockhashLifetime,
  Blockhash,
  signature as solanaSignature,
  type Base64EncodedWireTransaction,
} from "@solana/kit";

import {
  getTransferInstruction,
  getCreateAssociatedTokenIdempotentInstruction,
} from "@solana-program/token";

import {
  getTransferSolInstruction,
  SYSTEM_PROGRAM_ADDRESS,
} from "@solana-program/system";

import { PaymentPayload, PaymentRequirements } from "../../../types/protocol";
import { SolanaClient } from "../../../types/payment.js";
import { getAssociatedTokenAddress } from "../../../shared/solana/tokenAddress.js";
import { createAddressSigner } from "../../../shared/solana/signers.js";
import { getClusterUrl } from "../../../shared/solana/clusterEndpoints.js";
import bs58 from "bs58";
import { exact } from "../../../types/index.js";

type MinimalRpc = Pick<
  ReturnType<typeof createSolanaRpc>,
  "getLatestBlockhash" | "getSignatureStatuses" | "sendTransaction"
>;

async function buildPaymentTransaction(
  requirements: PaymentRequirements,
  payerPublicKey: string,
  rpc: MinimalRpc,
  nonce?: string,
  existingBlockhash?: Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
  }>
): Promise<
  CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime
> {
  const latestBlockhash =
    existingBlockhash || (await rpc.getLatestBlockhash().send()).value;
  const payerSigner = createAddressSigner(address(payerPublicKey));
  const payTo = address(requirements.payToAddress);
  const amount = BigInt(requirements.amountRequired.toString());

  const isNative =
    !requirements.tokenAddress ||
    requirements.tokenAddress === SYSTEM_PROGRAM_ADDRESS.toString();

  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (t) => setTransactionMessageFeePayer(payerSigner.address, t),
    (t) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, t)
  );

  if (isNative) {
    const instruction = getTransferSolInstruction({
      source: payerSigner,
      destination: payTo,
      amount,
    });
    return appendTransactionMessageInstruction(instruction, tx);
  } else {
    const mint = address(requirements.tokenAddress);
    const senderATA = await getAssociatedTokenAddress(
      mint,
      payerSigner.address
    );
    const receiverATA = await getAssociatedTokenAddress(mint, payTo);

    const createATAIx = getCreateAssociatedTokenIdempotentInstruction({
      payer: payerSigner,
      mint,
      owner: payTo,
      ata: receiverATA,
    });

    const transferIx = getTransferInstruction({
      source: senderATA,
      destination: receiverATA,
      authority: payerSigner,
      amount,
    });

    const withCreateATA = appendTransactionMessageInstruction(createATAIx, tx);
    return appendTransactionMessageInstruction(transferIx, withCreateATA);
  }
}

async function sendAndCreatePayload(
  message: CompilableTransactionMessage &
    TransactionMessageWithBlockhashLifetime,
  rpc: MinimalRpc,
  client: SolanaClient,
  resource: string,
  networkId = "mainnet",
  requirements: PaymentRequirements
): Promise<PaymentPayload<exact.solana.Payload>> {
  const transaction = compileTransaction(message);

  let txSignature: string;
  const waitForConfirmation = async (sig: string) => {
    return rpc
      .getSignatureStatuses([solanaSignature(sig)], {
        searchTransactionHistory: true,
      })
      .send();
  };

  if (typeof client.signTransaction === "function") {
    const [signedTx] = await client.signTransaction([transaction]);
    const base64Tx = Buffer.from(signedTx.messageBytes).toString(
      "base64"
    ) as Base64EncodedWireTransaction;
    const response = await rpc.sendTransaction(base64Tx).send();

    txSignature =
      typeof response === "string"
        ? response
        : ((response as any)?.value?.toString() ??
          (response as any)?.signature?.toString() ??
          "");

    await waitForConfirmation(txSignature);
  } else if (typeof client.signAndSendTransaction === "function") {
    const [sigBytes] = await client.signAndSendTransaction([transaction]);
    txSignature = solanaSignature(bs58.encode(Buffer.from(sigBytes)));
    await waitForConfirmation(txSignature);
  } else {
    throw new Error(
      "Signer must implement signTransaction or signAndSendTransaction"
    );
  }

  const basePayload = {
    version: 1,
    scheme: "exact",
    namespace: "solana",
    networkId,
    resource,
  };

  const payloadType =
    typeof client.signAndSendTransaction === "function"
      ? {
          type: "signAndSendTransaction" as const,
          signature: txSignature,
          transaction: { signature: txSignature, memo: undefined },
        }
      : {
          type: "signTransaction" as const,
          signedTransaction: txSignature,
          transaction: { signedTransaction: txSignature, memo: undefined },
        };

  const isNative =
    !requirements.tokenAddress ||
    requirements.tokenAddress === SYSTEM_PROGRAM_ADDRESS.toString();

  if (!client.signTransaction && !client.signAndSendTransaction) {
    return {
      ...basePayload,
      payload: isNative
        ? {
            type: "nativeTransfer" as const,
            signature: txSignature,
            transaction: {
              from: client.publicKey,
              to: requirements.payToAddress,
              value: BigInt(requirements.amountRequired.toString()),
              memo: undefined,
            },
          }
        : {
            type: "tokenTransfer" as const,
            signature: txSignature,
            transaction: {
              from: client.publicKey,
              to: requirements.payToAddress,
              mint: requirements.tokenAddress!,
              value: BigInt(requirements.amountRequired.toString()),
              memo: undefined,
            },
          },
    };
  }

  return { ...basePayload, payload: payloadType };
}

async function createPayment(
  client: SolanaClient,
  requirements: PaymentRequirements
): Promise<string> {
  if (!client.publicKey) throw new Error("Missing publicKey in client");
  if (!requirements.payToAddress) throw new Error("Missing payToAddress");
  if (requirements.amountRequired === undefined)
    throw new Error("Missing amountRequired");

  const clusterUrl = getClusterUrl(requirements.networkId);
  const rpc = client.rpc
    ? (client.rpc as MinimalRpc)
    : (createSolanaRpc(clusterUrl) as MinimalRpc);

  const txMessage = await buildPaymentTransaction(
    requirements,
    client.publicKey,
    rpc
  );

  const payload = await sendAndCreatePayload(
    txMessage,
    rpc,
    client,
    requirements.resource,
    requirements.networkId,
    requirements
  );

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export { createPayment };
