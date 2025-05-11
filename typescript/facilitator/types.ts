class TransactionExistsError extends Error {
  constructor(txHash: string) {
    super(`Transaction ${txHash} already exists`);
    this.name = "TransactionExistsError";
  }
}

type LogContext = {
  service: "facilitator" | "worker";
  operation: string;
  txHash?: string;
  jobId?: string | number;
  [key: string]: any;
};

export { TransactionExistsError, LogContext };
