import type {
  PaymentPayload as ImportedPaymentPayloadType,
  Hex,
} from "../../../index.js";

export type NativeTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  nonce: number;
};

export type TokenTransferParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: number;
};

export type AuthorizationParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  version: string;
};

export type SignAndSendTransactionParameters = {
  from: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
  nonce: Hex;
};

export type NativeTransferPayload = {
  type: "nativeTransfer";
  signature: Hex;
  transaction: NativeTransferParameters;
};

export type TokenTransferPayload = {
  type: "tokenTransfer";
  signature: Hex;
  transaction: TokenTransferParameters;
};

export type AuthorizationPayload = {
  type: "authorization";
  signature: Hex;
  authorization: AuthorizationParameters;
};

export type SignAndSendTransactionPayload = {
  type: "signAndSendTransaction";
  signedMessage: Hex;
  transactionHash: Hex;
};

export type Payload =
  | AuthorizationPayload
  | NativeTransferPayload
  | TokenTransferPayload
  | SignAndSendTransactionPayload;

export type NativeTransferPaymentPayload =
  ImportedPaymentPayloadType<NativeTransferPayload>;

export type TokenTransferPaymentPayload =
  ImportedPaymentPayloadType<TokenTransferPayload>;

export type AuthorizationPaymentPayload =
  ImportedPaymentPayloadType<AuthorizationPayload>;

export type SignAndSendTransactionPaymentPayload =
  ImportedPaymentPayloadType<SignAndSendTransactionPayload>;
