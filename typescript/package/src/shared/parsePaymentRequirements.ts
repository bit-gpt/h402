import { PaymentRequirements } from "../types/index.js";
import { evm, solana } from "./index.js";
import { PublicActions } from "viem";
import { Hex } from "../types/index.js";

const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function parsePaymentRequirementsForAmount(
  paymentRequirements: PaymentRequirements,
  client?: PublicActions | any
): Promise<PaymentRequirements> {
  // Handle backward compatibility with x402: if maxAmountRequired is present, use it for amountRequired
  const details = {
    ...paymentRequirements,
    amountRequired:
      paymentRequirements.maxAmountRequired !== undefined &&
      paymentRequirements.maxAmountRequired !== null
        ? paymentRequirements.maxAmountRequired
        : paymentRequirements.amountRequired,
  };

  if (!details.namespace) {
    throw new Error("Payment namespace is required");
  }

  if (!details.networkId) {
    throw new Error("Network ID is required");
  }

  if (!details.payToAddress) {
    throw new Error("Pay to address is required");
  }

  console.log("Payment requirements:", details);

  // If already in smallestUnit format, no conversion needed
  if (details.amountRequiredFormat === "smallestUnit") {
    return details;
  }

  // Handle Solana tokens
  if (details.namespace === "solana") {
    try {
      // For native SOL
      if (
        !details.tokenAddress ||
        details.tokenAddress === "11111111111111111111111111111111"
      ) {
        return {
          ...details,
          amountRequired: BigInt(
            Math.floor(
              Number(details.amountRequired) * 10 ** solana.NATIVE_SOL_DECIMALS
            )
          ),
        };
      }

      // For SPL tokens
      console.log("SPL token address:", details.tokenAddress);
      console.log("SPL token network ID:", details.networkId);
      const decimals = await solana.getTokenDecimals(
        details.tokenAddress,
        details.networkId
      );

      console.log("SPL token decimals:", decimals);

      return {
        ...details,
        amountRequired: BigInt(
          Math.floor(Number(details.amountRequired) * 10 ** decimals)
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
    details.namespace === "evm" &&
    details.amountRequiredFormat === "humanReadable" &&
    details.tokenAddress?.toLowerCase() === evm.ZERO_ADDRESS.toLowerCase()
  ) {
    const decimals = evm.chains[details.networkId].nativeTokenDecimals;

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** decimals)
      ),
    };
  }

  // Common ERC20 token decimals - used as fallback when client is not available
  const COMMON_ERC20_DECIMALS: Record<string, number> = {
    // Binance Smart Chain (56)
    "0x55d398326f99059ff775485246999027b3197955": 18, // USDT on BSC
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": 18, // USDC on BSC
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": 18, // BUSD on BSC
    "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3": 18, // DAI on BSC
    // Ethereum Mainnet (1)
    "0xdac17f958d2ee523a2206206994597c13d831ec7": 6, // USDT on Ethereum
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6, // USDC on Ethereum
    "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI on Ethereum
  };

  try {
    // First check if tokenDecimals is provided in the payment requirements
    if (details.tokenDecimals !== undefined) {
      console.log(`Using provided token decimals: ${details.tokenDecimals}`);
      return {
        ...details,
        amountRequired: BigInt(
          Math.floor(
            Number(details.amountRequired) * 10 ** details.tokenDecimals
          )
        ),
      };
    }

    // Then check if we know this token's decimals
    const tokenAddressLower = details.tokenAddress?.toLowerCase();
    if (tokenAddressLower && COMMON_ERC20_DECIMALS[tokenAddressLower]) {
      const decimals = COMMON_ERC20_DECIMALS[tokenAddressLower];
      console.log(
        `Using known decimals (${decimals}) for token: ${details.tokenAddress}`
      );
      return {
        ...details,
        amountRequired: BigInt(
          Math.floor(Number(details.amountRequired) * 10 ** decimals)
        ),
      };
    }

    // Finally, try to use the client if available
    if (!client || !("readContract" in client)) {
      throw new Error(
        `EVM client required for ERC20 token decimals and no known decimals for ${details.tokenAddress}. ` +
          `Either provide a client, use a known token, or include tokenDecimals in the payment requirements.`
      );
    }

    const decimals = (await client.readContract({
      address: details.tokenAddress as Hex,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** decimals)
      ),
    };
  } catch (error) {
    // If we get here, we couldn't determine the token decimals
    // Default to 18 decimals (most common) with a warning
    console.warn(
      `Warning: Could not determine decimals for token ${details.tokenAddress}. ` +
        `Using default of 18 decimals. Error: ${error instanceof Error ? error.message : String(error)}`
    );

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** 18)
      ),
    };
  }
}
