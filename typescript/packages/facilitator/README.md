# h402 Facilitator

This is an implementation of an h402 facilitator service that handles payment verification and settlement for the h402 payment protocol.

## Overview

The facilitator provides two main endpoints:

- `/verify`: Verifies x402 payment payloads
- `/settle`: Settles x402 payments by signing and broadcasting transactions

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file with the following variables:

```env
PRIVATE_KEY=0xYourPrivateKey
PORT=3000
```

3. Start the server:

```bash
pnpm dev
```

The server will start on http://localhost:3000

## API Endpoints

### POST /verify

Verifies an h402 payment payload.

Request body:

```typescript
{
  payload: string; // h402 payment payload
  paymentRequirements: PaymentRequirements;
}
```

### POST /settle

Settles an h402 payment by signing and broadcasting the transaction.

Request body:

```typescript
{
  payload: string; // h402 payment payload
  paymentRequirements: PaymentRequirements;
}
```
