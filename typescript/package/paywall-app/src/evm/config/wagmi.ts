import { type Config, createConfig, http } from "wagmi";
import { bsc } from "viem/chains";
import { injected, coinbaseWallet, metaMask,walletConnect } from "wagmi/connectors";

const config = createConfig({
  chains: [bsc],
  connectors: [
    metaMask(),
    coinbaseWallet({ appName: "BitGPT H402" }),
    walletConnect({ projectId: "233c440b08a2b78d6b3e76370b979bed" }),
    injected({ shimDisconnect: true })
  ],
  transports: {
    [bsc.id]: http(),
  },
}) as Config;

export { config };
