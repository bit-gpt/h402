import { PaymentDetails } from "../types/index.js";
import { evm, solana } from "./index.js";
import { PublicActions } from "viem";
import { Hex } from "../types/index.js";
import { createSolanaRpc } from "@solana/kit";

const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function parsePaymentDetailsForAmount(
  paymentDetails: PaymentDetails,
  client: PublicActions | ReturnType<typeof createSolanaRpc>
): Promise<PaymentDetails> {
  if (paymentDetails.amountRequiredFormat === "atomic") {
    return {
      ...paymentDetails,
    };
  }

  // Handle Solana tokens
  if (paymentDetails.namespace === "solana") {
    try {
      // For native SOL
      if (
        !paymentDetails.tokenAddress ||
        paymentDetails.tokenAddress === "11111111111111111111111111111111"
      ) {
        return {
          ...paymentDetails,
          amountRequired: BigInt(
            Math.floor(Number(paymentDetails.amountRequired) * 10 ** solana.NATIVE_SOL_DECIMALS)
          ),
        };
      }
      
      // For SPL tokens
      const decimals = await solana.getTokenDecimals(
        paymentDetails.tokenAddress,
        paymentDetails.networkId
      );
      
      return {
        ...paymentDetails,
        amountRequired: BigInt(
          Math.floor(Number(paymentDetails.amountRequired) * 10 ** decimals)
        ),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Solana token decimals: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Handle EVM tokens
  if (
    paymentDetails.namespace === "eip155" &&
    paymentDetails.amountRequiredFormat === "formatted" &&
    paymentDetails.tokenAddress.toLowerCase() === evm.ZERO_ADDRESS.toLowerCase()
  ) {
    const decimals = evm.chains[paymentDetails.networkId].nativeTokenDecimals;

    return {
      ...paymentDetails,
      amountRequired: BigInt(
        Math.floor(Number(paymentDetails.amountRequired) * 10 ** decimals)
      ),
    };
  }

  try {
    if (!('readContract' in client)) {
      throw new Error('EVM client required for ERC20 token decimals');
    }
    
    const decimals = (await client.readContract({
      address: paymentDetails.tokenAddress as Hex,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;

    return {
      ...paymentDetails,
      amountRequired: BigInt(
        Math.floor(Number(paymentDetails.amountRequired) * 10 ** decimals)
      ),
    };
  } catch (error) {
    throw new Error(
      `Token at address ${paymentDetails.tokenAddress} is not ERC20 compliant: missing decimals function`
    );
  }
}
