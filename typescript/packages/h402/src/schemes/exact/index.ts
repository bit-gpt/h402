import * as evmHandlers from "./evm/index.js";
import * as solanaHandlers from "./solana/index.js";

export const handlers = {
  evm: evmHandlers,
  solana: solanaHandlers,
};

export const SCHEME = "exact";
