# HTTP 402 protocol

![402 preview](./images/site/preview.png)

HTTP 402 is the web-native standard for payments. Our mission is to design a frictionless machine-to-machine protocol that allows agents to pay for APIs, compute resources, and data using simple HTTP requests and native blockchain transactions scaling to billions of sub-cent microtransactions.

This unlocks a previously unattainable economic layer for AI-native commerce, while simultaneously delivering a best-in-class user experience for humans.

```js
// This is an example of how our package can be integrated
// You can check out the sections below to find more implementation options
// Or reach out to us at hello@bitgpt.xyz

app.use(
  "/generate-image",
  monetize({
    amount: 0.001,    // defaults to scheme exact
    token: "USDT",    // certain tokenAddresses are baked in the protocol for easier dev implementation
    chainId: 56,      // BSC mainnet
    namespace: "evm",
  })
);
```

This protocol builds on top of the scheme from [x402](https://github.com/coinbase/x402), to ensure the continuation and adoption of a true open standard. You can check our [FAQs](https://bitgpt.xyz/faq402) to learn more.

![playground sequence diagram explanations](./images/playground/explanation.png)

## Supported networks and schemes

Currently, h402 supports:

Networks:

- All EVM-compatible chains (Ethereum, Binance Smart Chain, Base, etc.)
- Solana (mainnet)

Payment Types:

- Signed payloads (permit-based tokens like USDC)
- Broadcasted transactions (for tokens like USDT and native currencies like BNB/ETH)
- Solana transactions with memo (for SOL and SPL tokens)

Payment schemes:

- `exact`: Fixed amount payments with predefined values

We're actively expanding support for additional networks, tokens, and payment schemes. See our [roadmap](#roadmap) for upcoming implementations including Bitcoin, and new payment models like `upto`, `streamed`, and `subscription`.

## Protocol

HTTP 402 is the web-native standard for payments. Our mission is to design a frictionless machine-to-machine protocol that allows agents to pay for APIs, compute resources, and data using simple HTTP requests and native blockchain transactions, scaling to billions of sub-cent microtransactions.

This unlocks a previously unattainable economic layer for AI-native commerce, while simultaneously delivering a best-in-class user experience for humans.

We decided to create `h402`, which simply stands for `HTTP 402`, based on the open schemes provided by [x402](https://github.com/coinbase/x402).

The reason for spinning off into a separate project comes down to a few key points, you can read them in our [FAQs.md](./FAQs.md) or at our website [h402.xyz](https://h402.xyz).

> We're a fairly small team, so this repo is evolving rapidly we'll be updating it weekly (or even daily) with new details, schemes, and examples.
> In the meantime, if anything's missing or underspecified, you can check out the original x402 repository for reference.
> Eventually, this message will disappear because we genuinely believe this will become the leading implementation of the 402 protocol, or we will find a way to merge with x402.

## Example Next application

In the `example/` folder we've provided a simple demo of a Next webapp integrating both the facilitator (server) and the client to restrict access to a specific page under a 402 payment required response.

It works utilizing this package and its functionalities and provides a quick example of how such an integration can be made, including the UI for the wallet connection & send.

## Development Setup

This project is set up as a pnpm monorepo workspace, allowing for seamless development across multiple packages.

### Prerequisites

- [Node.js](https://nodejs.org/) (see `.nvmrc` for version)
- [pnpm](https://pnpm.io/) package manager

### Workspace Structure

The monorepo contains the following workspaces:

- `typescript/package`: The main `@bit-gpt/h402` package
- `typescript/example`: Example Next.js application using the package
- `typescript/facilitator`: Facilitator implementation

### Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the example application:
   ```bash
   pnpm dev:example
   ```

### Development Workflow

The monorepo is configured with the following workflow:

1. **Dependency Management**:

   - All dependencies are hoisted to the root `node_modules` directory
   - Workspace packages reference each other using `workspace:*` syntax
   - No need for manual linking between packages

2. **Build Process**:

   - `pnpm build`: Builds all packages in the monorepo (use when you need to build everything)
   - `pnpm build:package`: Builds only the main `@bit-gpt/h402` package (sufficient for most development)
   - `pnpm clean`: Cleans build artifacts from all packages

3. **Development Commands**:

   - `pnpm dev:example`: Builds the main package and starts the example Next.js application
   - Changes to the package code require rebuilding before they're available to the example

4. **Configuration**:
   - The root `.npmrc` file contains important configuration for the monorepo
   - `pnpm-workspace.yaml` defines the workspace package locations

### Adding New Packages

To add a new package to the monorepo:

1. Create a new directory in the appropriate location
2. Add a `package.json` with the package details
3. Add the package path to `pnpm-workspace.yaml`
4. Run `pnpm install` to update the workspace

### Troubleshooting

If you encounter "Module not found" errors when running the example:

1. Make sure all packages are built: `pnpm build`
2. Check that the package exports are correctly defined in the package.json
3. Verify that the imports in your code match the export paths

## Current schemes and types

The only available scheme for now is `exact`, the types are the following.

All the types can be found [here](https://github.com/bit-gpt/h402/tree/main/typescript/package/src/types)

### Protocol

```typescript
type PaymentDetails = {
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string | null;
  // Network of the blockchain to send payment on
  networkId: string;
  // Amount required to access the resource in atomic units
  amountRequired: number | bigint;
  // Format of the amount required
  amountRequiredFormat: "smallestUnit" | "humanReadable";
  // Address to pay for accessing the resource
  payToAddress: string;
  // Token contract
  tokenAddress: string;
  // Identifier of what the user pays for
  resource: string;
  // Description of the resource
  description: string;
  // Mime type of the rescource response
  mimeType: string;
  // Output schema of the resource response
  outputSchema: object | null;
  // Time in seconds it may be before the payment can be settaled
  requiredDeadlineSeconds: number;
  // Extra informations about the payment for the scheme
  extra: Record<string, any> | null;

  // Fields for support to other standards
  // Maximum amount required to access the resource in amount ** 10 ** decimals
  maxAmountRequired?: bigint | null; // converts into amountRequired
};

type PaymentRequired = {
  // Version of the h402 payment protocol
  version: number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentDetails[];
  // Message for error(s) that occured while processing payment
  error: string | null;

  // Fields for support to other standards
  // Version of the x402 payment protocol
  x402Version?: number | null;
};

type PaymentPayload<T> = {
  // Version of the h402 payment protocol
  version: number;
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Netowrk of the blockchain to send payment on
  networkId: string;
  // Payload of the payment protocol
  payload: T;
  // Identifier of what the user pays for
  resource: string;
};
```

### Facilitator

```typescript
type FacilitatorRequest = {
  paymentHeader: string;
  paymentDetails: PaymentDetails;
};

type FacilitatorResponse<T> = {
  data: T;
  error?: string;
};

type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
};

type VerifyResponse = {
  isValid: boolean;
  type?: "payload" | "transaction";
  txHash?: string;
  errorMessage?: string | undefined;
};
```

### EVM `exact`

```typescript
type NativeTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  nonce: number;
};

type TokenTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: number;
};

type AuthorizationParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  version: string;
};

type SignAndSendTransactionParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: Hex;
};

type NativeTransferPayload = {
  type: "nativeTransfer";
  signature: Hex;
  transaction: NativeTransferParameters;
};

type TokenTransferPayload = {
  type: "tokenTransfer";
  signature: Hex;
  transaction: TokenTransferParameters;
};

type AuthorizationPayload = {
  type: "authorization";
  signature: Hex;
  authorization: AuthorizationParameters;
};

type SignAndSendTransactionPayload = {
  type: "signAndSendTransaction";
  signedMessage: Hex;
  transactionHash: Hex;
};

type Payload =
  | AuthorizationPayload
  | NativeTransferPayload
  | TokenTransferPayload
  | SignAndSendTransactionPayload;

type NativeTransferPaymentPayload =
  ImportedPaymentPayloadType<NativeTransferPayload>;

type TokenTransferPaymentPayload =
  ImportedPaymentPayloadType<TokenTransferPayload>;

type AuthorizationPaymentPayload =
  ImportedPaymentPayloadType<AuthorizationPayload>;

type SignAndSendTransactionPaymentPayload =
  ImportedPaymentPayloadType<SignAndSendTransactionPayload>;
```

## FAQs

See [FAQs.md](./FAQs.md) or our website [h402.xyz](https://h402.xyz)

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

## Community

Join our [Discord community](https://bitgpt.xyz/discord) to stay up to date, contribute to feature development, and connect directly with our team.

## Playground

To detail and showcase our idea of the 402 protocol, we've built a public playground available at [play.bitgpt.xyz](https://play.bitgpt.xyz). It demonstrates how the 402 payment flow works in comparison to traditional human checkouts.

In a typical crypto checkout, users go through multiple steps: connecting a wallet, signing a transaction, and broadcasting it.

![human checkout](./images/playground/human-checkout.png)

While this flow mirrors traditional credit card payments, it’s unsuitable for machine-based transactions. Agents require a native protocol built for programmatic interaction, not one retrofitted from human-centric experiences.

Our playground illustrates the 402 flow from the agent's perspective: initiating payments on the user's behalf, negotiating terms, and requesting final confirmation from the user.

This interface is demo-only; in real-world use, these interactions occur purely via HTTP between the agent (acting for the user) and the server (BitGPT or any service provider).

![playground sequence diagram](./images/playground/agent-sequence-diagram.png)

The 402 flow can vary based on the payment scheme and user-agent configuration. For instance, in the absence of a default payment method, the user must manually select one.

- `exact`: Simple flow with known amount.
- `upto`, `prepaid`, `streamed`, `subscription`, `postpaid`: More dynamic, require negotiation or ongoing interaction.

The playground is still under active development. While it currently mocks the protocol and checkout interface, more examples and features will be added soon, both here and in the soon-to-be-open-sourced repository.

![playground sequence diagram explanations](./images/playground/examples.png)

## License

The h402 protocol is licensed under the [Apache-2.0](https://github.com/coinbase/x402/blob/main/LICENSE.md) license.
