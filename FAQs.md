# h402 Frequently asked Questions

Frequently asked questions about the procol, technical and leadership decisions.

## What is h402?
HTTP 402 is the web-native standard for payments. Our mission is to design a frictionless machine-to-machine protocol that allows agents to pay for APIs, compute resources, and data using simple HTTP requests and native blockchain transactions, scaling to billions of sub-cent microtransactions.
This unlocks a previously unattainable economic layer for AI-native commerce, while simultaneously delivering a best-in-class user experience for humans.

## How do you verify task execution? Or is that all trust based?

Task execution success is out of scope for the protocol itself, it’s the responsibility of the AI service, merchant, or provider to define and measure successful execution.

However, the protocol supports deferred settlement mechanisms through EVM Permits and SVM durable nonces or pre-signed transactions. This enables merchants to verify signed payloads, execute tasks, and conditionally broadcast transactions, ensuring payment only if execution succeeds.

## How do you position h402 compared to x402?

The h402 protocol, made by BitGPT, builds on top of x402, with minimal deviations from its schema to ensure the continuation and adoption of a true open standard.

The reason for spinning off into a separate project comes down to a few key points

1. We need to move fast; this protocol is and will be critical for our payment platform, and building independently allows us to iterate quickly
2. Maintaining a separate implementation gives us the freedom to make protocol decisions that aren’t influenced by the priorities of BASE (and by extension, USDC), whose development may naturally lean toward optimizing for their internal use cases or preferred chains, rather than creating a broadly compatible solution for other blockchains

Another major factor is the need to support features not currently handled by x402:
1. x402 assumes the presence of permit-based tokens (EIP-2612), which USDC supports, but USDT doesn't
2. We need to implement post-broadcast validations for cryptocurrencies like Bitcoin
3. We require also polling-based systems, which are essential both as fallback mechanisms for payment providers and for any setup that relies on standalone address verification (e.g deposit systems, exchanges, streamed addresses, automatic offramp configurations, etc), rather than a one-size-fits-all signed payload + broadcast approach

## Why did you decide to create and maintain h402 instead of contributing directly to x402?

We fully respect the foundation x402 provides, but building h402 was a necessary move.
Our approach is simple: preserve the protocol schema, but refuse to be limited by someone else’s tech stack or product roadmap.

While we maintain full compatibility with the open schema, we’re building an implementation that goes far beyond what x402 currently offers:
1. Support for post-broadcasted transactions (e.g. txHash-based workflows), not just signed payloads
2. Integration with infrastructure like Redis queues, NBXplorer, and other systems critical for real-world crypto payments
3. A design philosophy focused on performance, flexibility, and production use, not corporate alignment

We do not want to wait for permission or consensus to ship what the ecosystem needs.

Schema compatibility is at the heart of h402. Our facilitators will always support the same schemas and payloads defined by the open 402 standard (exact, upto, prepaid, etc).

That’s all that matters for interoperability.

Everything beyond that, how we implement, scale, and extend, is ours to innovate.

## How do you foresee maintaining compatibility with x402 and how separate (from x402) maintenance of h402 will be?

While our implementation, planning, and technical direction differ significantly from Coinbase’s, h402 remains fully aligned with the core 402 schema and standard.

That means our supported payloads and schemas, like `exact`, `upto`, `prepaid`, and future extensions, will remain compatible with x402 and other 402 variants, including `L402` for Bitcoin’s Lightning Network. In practice, this makes maintaining compatibility straightforward and seamless.

We like to frame this with a familiar analogy:

### Why h402 Is to x402 what Linux was to UNIX
Linux didn’t try to replace UNIX overnight. Instead, it liberated it from commercial inertia, closed governance, and vendor lock-in. Linux opened the door to community innovation, global infrastructure, and modern open-source ecosystems.
We see h402 following that same path for x402.

Coinbase’s x402 is a strong starting point: a native web protocol for payments via HTTP 402, especially for agent-based and programmatic use cases. But as with any early standard, there are limitations:
1. *Assumptions* around EIP-2612 permits (which restrict token support)
2. *Governance* focused on BASE and USDC (even if expressed otherwise, it will be)
3. *Velocity* capped by enterprise development cycles

We built h402 to move faster, solve broader real-world problems, and support ecosystems beyond USDC and BASE.

We’re not here to compete, we’re here to extend and unlock. Any positive change brought to h402 we hope to be able to merge and implement into x402 as well, but we cannot be limited by Coinbase policies and team to ship quickly.

Just like Linux could run UNIX software, h402 supports the same schema formats and payload structures as x402. That’s by design. Interoperability is not a side-effect, it’s a core goal.

## What does `post-broadcast validations for cryptocurrencies like Bitcoin` mean?

x402 works only for evm-based cryptocurrencies because it uses the "permit function", which means that people can sign a payload and then 402 protocol takes care of broadcasting the transaction live on the blockchain.

This does not support all the use cases where you only have access to the transaction after it's been already broadcast, such as on deposit systems for exchanges (or even prediction markets such as polymarket) and legacy payment systems.

## Do you need adoption to succeed or can we benefit from x402 growth?

We didn’t build h402 to compete with Coinbase, to "win" against them, or simply to be different.

We built it because we believe the future of blockchain-native payments requires speed, openness, and a bold vision, and we weren’t going to wait for permission to shape it.

Our goal is clear: enable a global network of agents that can communicate and transact on behalf of humans, frictionlessly and autonomously. The only way to get there is through a well-defined, open, and interoperable standard, one that’s inclusive of all ecosystems.

If x402 grows and brings visibility and adoption to the 402 concept, that’s a win for everyone. It validates the space, confirms the need, and expands the pie. And if h402 leads the way on multi-chain support, agent-first UX, and pragmatic schema design, that’s also a win for the community, the devs, and the economy we're building.

This isn't a zero-sum game. All it takes is one successful implementation to push the ecosystem forward. And we fully intend to be that implementation.

Adoption of h402 will come naturally as we:
1. Support non-EVM chains like Solana and Bitcoin
2. Enable alternative payment flows (polling, direct transfers, streamed payments, etc.)
3. Provide tools and APIs that developers and platforms can adopt without friction

## In the long run
Names won’t matter. Different repositories won’t matter.
**There won’t be h402, x402, or L402; just 402, a single, trusted protocol for autonomous payments, maintained by the industry, for the industry, just like HTTP is today.**