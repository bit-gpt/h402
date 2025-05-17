## Roadmap

Our vision for h402 is to establish a robust, open-source protocol for blockchain-native payments, not just as a solution for the ecosystem, but to fulfill a real need we face ourselves in standardizing agent-based blockchain transactions.

### General

- [ ] Expand this README with detailed scheme documentation, code examples, and functionality breakdowns
- [x] Add real-world examples
- [ ] Add unit tests
- [ ] Add vulnerability protocol inside SECURITY.md
- [ ] Add security best practices (detailed about what goes with what), such as
  - [ ] Payload comes from the client and paymentRequirements are from the server
  - [ ] Have verify and settle in a signle route as payload may be tampered with on the client
- [ ] Document functions with JSDoc
- [ ] Release public facilitator APIs for open use

### Schemes

- [ ] Add scheme specific documentation and explain them separately
- [x] Add `exact`
- [ ] Add `upto`
- [ ] Add `prepaid`
- [ ] Add `streamed`
- [ ] Add `subscription`
- [ ] Add `postpaid`
- [ ] `[WIP]` Support Solana
- [ ] Support Sui
- [ ] Support Bitcoin
- [ ] Support Ripple
- [ ] Support Tron

### Protocol

- [ ] Change namespaces name to be more friendly e.g. "evm", "bitcoin", etc.
- [ ] Support for single-chain and cross-chain swaps
- [ ] How to handle failed attempts after action on non-permit protocols? Example: image generation fails after already-broadcasted tx

### Packages

- [ ] Provide an HTML page that users can serve when returning a 402 status code to humans served directly by our package
- [ ] Improve packages so that they enable users to implement 402 with one LOC for both Client and Server
- [ ] Add SDKs for languages beyond TypeScript
- [ ] Add handling for failed action when settle and permits are available
- [x] Add support for WalletConnect and other implementations
- [x] `await settle` after onSuccess?

### Examples

- [ ] More examples for Node and TS
- [ ] Improve documentation on how to start them (env vars and compute requirements), how to modify them and how to re-use them
- [ ] Improve current examples with real-life payment implementation issues
  - [ ] Signature matching with an Invoice/Payment ID to avoid duplicated payments
  - [ ] Check creation date txHash vs creation date invoice/payment
  - [ ] Sync queue for txHash processing to avoid race conditions
  - [ ] Price matching on required vs sent from
  - [ ] Real DB implementation that simulate a payment environment, since certain implementations cannot be stateless
  - [ ] More information and comments on stateless vs stateful implementations for these type of payments (signed payload vs txHash)

### Updates checklist

- [ ] Facilitator support
- [ ] Verify/settle
- [ ] Scheme-specific documentation
