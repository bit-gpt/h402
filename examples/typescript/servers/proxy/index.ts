import express from "express";
import { readFile } from "fs/promises";
import { h402Proxy, createRouteConfigFromPrice } from "@bit-gpt/h402-proxy";
import { FacilitatorConfig } from "@bit-gpt/h402/types";

interface ProxyConfig {
  targetURL: string;
  amount: string;
  evmAddress: string;
  solanaAddress: string;
  description?: string;
  facilitator?: FacilitatorConfig;
  headers?: Record<string, string>;
  network?: string;
}

async function loadConfig(configPath: string): Promise<ProxyConfig> {
  try {
    const data = await readFile(configPath, "utf-8");
    const config: ProxyConfig = JSON.parse(data);

    const defaultUrl = "https://facilitator.bitgpt.xyz";
    if (!config.facilitator) {
      config.facilitator = { url: defaultUrl };
    } else if (!config.facilitator.url) {
      config.facilitator.url = defaultUrl;
    }
    config.network = config.network || "base";

    if (
      !config.targetURL ||
      !config.amount ||
      (!config.evmAddress && !config.solanaAddress)
    ) {
      throw new Error("Config is missing required fields: targetURL, amount, or evmAddress or solanaAddress");
    }

    if (config.network === "solana" && !config.solanaAddress) {
      throw new Error("Config is missing required fields: solanaAddress");
    }

    if (config.network !== "solana" && !config.evmAddress) {
      throw new Error("Config is missing required fields: evmAddress");
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error loading config file: ${error.message}`);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    console.error("Please provide a config file path as an argument");
    console.error("Usage: npm run dev <config-file-path>");
    process.exit(1);
  }

  let config: ProxyConfig;
  try {
    config = await loadConfig(argv[0]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unknown error loading config");
    process.exit(1);
  }

  const app = express();

  // Use the h402-proxy package
  app.use(
    h402Proxy({
      target: config.targetURL,
      routes: {
        "/*": createRouteConfigFromPrice(
          config.amount,
          config.network as any,
          config.evmAddress as `0x${string}`,
          config.solanaAddress,
        ),
      },
      headers: config.headers,
      facilitator: config.facilitator,
    })
  );

  const port = 4021;
  app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
    console.log(`Forwarding requests to: ${config.targetURL}`);
  });
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
