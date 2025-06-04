import {
  address,
  appendTransactionMessageInstruction,
  type Base64EncodedWireTransaction,
  type CompilableTransactionMessage,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signature as solanaSignature,
  type TransactionMessageWithBlockhashLifetime,
} from "@solana/kit";

import {getCreateAssociatedTokenIdempotentInstruction, getTransferInstruction,} from "@solana-program/token";
import {getTransferSolInstruction, SYSTEM_PROGRAM_ADDRESS,} from "@solana-program/system";
import {
  Namespace,
  PaymentRequirements,
  SolanaClient,
  SolanaPaymentPayload
} from "../../../types";
import {getAssociatedTokenAddress} from "../../../shared/solana";
import {createAddressSigner} from "../../../shared/solana/signers.js";
import bs58 from "bs58";
import {getFacilitator} from "../../../shared/next.js";

async function buildPaymentTransaction(
  requirements: PaymentRequirements,
  payerPublicKey: string,
): Promise<
  CompilableTransactionMessage & TransactionMessageWithBlockhashLifetime
> {
  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);
  const latestBlockhash = (await rpc.getLatestBlockhash().send()).value;
  const payerSigner = createAddressSigner(address(payerPublicKey));
  const payTo = address(requirements.payToAddress);
  const amount = BigInt(requirements.amountRequired.toString());

  const isNative =
    !requirements.tokenAddress ||
    requirements.tokenAddress === SYSTEM_PROGRAM_ADDRESS.toString();

  const tx = pipe(
    createTransactionMessage({version: 0}),
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
  h402Version: number,
  message: CompilableTransactionMessage &
    TransactionMessageWithBlockhashLifetime,
  client: SolanaClient,
  requirements: PaymentRequirements
): Promise<SolanaPaymentPayload> {
  const transaction = compileTransaction(message);

  // Use facilitator proxy RPC so that requests are made from a server
  const rpc = createSolanaRpc(`${getFacilitator()}/solana-rpc`);

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
    // Use browser-compatible approach for base64 encoding
    const bytes = signedTx.messageBytes;
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Tx = btoa(binary) as Base64EncodedWireTransaction;
    console.log("[DEBUG] Encoded transaction to base64");
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
    const uint8Array = new Uint8Array(sigBytes);
    txSignature = solanaSignature(bs58.encode(uint8Array));
    console.log("[DEBUG] Encoded signature using bs58");
    await waitForConfirmation(txSignature);
  } else {
    throw new Error(
      "Signer must implement signTransaction or signAndSendTransaction"
    );
  }

  const basePayload = {
    h402Version: h402Version,
    scheme: "exact" as any,
    namespace: "solana" as Namespace,
    networkId: "mainnet",
    resource: requirements.resource ?? `402 signature ${Date.now()}`,
  };

  const payloadType =
    typeof client.signAndSendTransaction === "function"
      ? {
        type: "signAndSendTransaction" as const,
        signature: txSignature,
        transaction: {signature: txSignature, memo: undefined},
      }
      : {
        type: "signTransaction" as const,
        signedTransaction: txSignature,
        transaction: {signedTransaction: txSignature, memo: undefined},
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

  return {...basePayload, payload: payloadType};
}

async function createPayment(
  client: SolanaClient,
  h402Version: number,
  requirements: PaymentRequirements
): Promise<string> {
  if (!client.publicKey) throw new Error("Missing publicKey in client");
  if (!requirements.payToAddress) throw new Error("Missing payToAddress");
  if (requirements.amountRequired === undefined)
    throw new Error("Missing amountRequired");

  const txMessage = await buildPaymentTransaction(
    requirements,
    client.publicKey,
  );

  const payload = await sendAndCreatePayload(
    h402Version,
    txMessage,
    client,
    requirements
  );

  // Use browser-compatible approach for base64 encoding
  const jsonString = JSON.stringify(payload);
  console.log("[DEBUG] Encoding payload to base64");
  return btoa(jsonString);
}

export {createPayment};
