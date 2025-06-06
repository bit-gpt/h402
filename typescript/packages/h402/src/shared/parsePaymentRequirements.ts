import { type PaymentRequirements } from "../types";
import { evm, solana } from "./index.js";
import { type PublicActions } from "viem";

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

  console.log("[h402 debug] Payment requirements:", details);

  // If already in smallestUnit format, no conversion needed
  if (details.amountRequiredFormat === "smallestUnit") {
    return details;
  }

  // Handle Solana tokens
  if (details.namespace === "solana") {
    try {
      // For native SOL
      if (details.tokenAddress === "11111111111111111111111111111111") {
        return {
          ...details,
          amountRequired: BigInt(
            Math.floor(
              Number(details.amountRequired) *
                Math.pow(10, solana.NATIVE_SOL_DECIMALS)
            )
          ),
        };
      }

      // For SPL tokens - prepare fetch promises only for missing data
      const fetchPromises = [];
      let needDecimals = details.tokenDecimals === undefined;
      let needSymbol = !details.tokenSymbol;

      // Only fetch token data if something is missing
      if (needDecimals || needSymbol) {
        console.log("Fetching SPL token data for:", details.tokenAddress);
        console.log("SPL token network ID:", details.networkId);

        // Create an array to hold our fetch promises
        if (needDecimals) {
          fetchPromises.push(solana.getTokenDecimals(details.tokenAddress));
        }

        if (needSymbol) {
          // Only try to fetch symbol if the function exists
          if ("getTokenSymbol" in solana) {
            fetchPromises.push(
              (
                solana as {
                  getTokenSymbol: typeof import("./solana/tokenMetadata.js").getTokenSymbol;
                }
              ).getTokenSymbol(details.tokenAddress)
            );
          } else {
            fetchPromises.push(Promise.resolve(undefined));
          }
        }

        // Execute all needed fetches in parallel
        const results = await Promise.all(fetchPromises);

        // Extract results
        let resultIndex = 0;
        const decimals = needDecimals
          ? (results[resultIndex++] as number)
          : details.tokenDecimals;
        const symbol = needSymbol
          ? (results[resultIndex++] as string | undefined)
          : details.tokenSymbol;

        console.log("SPL token decimals:", decimals);
        if (symbol) console.log("SPL token symbol:", symbol);

        if (decimals === undefined) {
          throw new Error(
            `Failed to obtain token decimals for ${details.tokenAddress}`
          );
        }

        return {
          ...details,
          amountRequired: BigInt(
            Math.floor(Number(details.amountRequired) * Math.pow(10, decimals))
          ),
        };
      } else {
        // If we already have all the data we need
        if (details.tokenDecimals === undefined) {
          throw new Error(
            `Token decimals required for ${details.tokenAddress}`
          );
        }

        return {
          ...details,
          amountRequired: BigInt(
            Math.floor(
              Number(details.amountRequired) *
                Math.pow(10, details.tokenDecimals)
            )
          ),
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to parse Solana token data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Handle EVM tokens
  if (
    details.namespace === "evm" &&
    details.amountRequiredFormat === "humanReadable" &&
    details.tokenAddress?.toLowerCase() === evm.ZERO_ADDRESS.toLowerCase()
  ) {
    const chain = evm.chains[details.networkId];
    const decimals = chain.nativeTokenDecimals;

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** decimals)
      ),
    };
  }

  // For EVM tokens that need data fetching
  try {
    // Check if we already have all the data we need
    if (details.tokenDecimals !== undefined) {
      return {
        ...details,
        amountRequired: BigInt(
          Math.floor(
            Number(details.amountRequired) * 10 ** details.tokenDecimals
          )
        ),
      };
    }

    // If client is not available but we're missing data, we can't proceed
    if (!client || !("readContract" in client)) {
      throw new Error(
        `EVM client required for ERC20 token data and missing ${
          !details.tokenDecimals ? "decimals" : ""
        }${!details.tokenDecimals && !details.tokenSymbol ? " and " : ""}${
          !details.tokenSymbol ? "symbol" : ""
        } for ${details.tokenAddress}. ` +
          `Either provide a client, use a known token, or include complete token data in the payment requirements.`
      );
    }

    // Fetch token metadata using shared functions
    const [decimals] = await Promise.all([
      details.tokenDecimals ??
        evm.getTokenDecimals(details.tokenAddress, details.networkId),
    ]);

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * Math.pow(10, decimals))
      ),
    };
  } catch (error) {
    // If we get here, we couldn't determine the token data
    // Default to 18 decimals (most common) with a warning
    console.warn(
      `Warning: Could not determine complete token data for ${details.tokenAddress}. ` +
        `Using default of 18 decimals. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
    );

    // Use default decimals for amount conversion
    const defaultDecimals = 18;
    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** defaultDecimals)
      ),
    };
  }
}
