"use client";

interface TransactionStatusProps {
  onCancel?: () => void;
  txHash: string;
  status: string;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  onCancel,
  txHash,
  status,
}) => {
  const isPending = status === "processing" || status === "awaiting_approval";
  const isSuccess = status === "paid";
  const isFailed = status === "failed";

  // Use theme classes for different states
  const getStatusClasses = () => {
    if (isSuccess) return "status-success border-[var(--color-success)]";
    if (isFailed) return "status-error border-[var(--color-error)]";
    return "status-warning border-[var(--color-warning)]";
  };

  const getHeaderColor = () => {
    if (isSuccess) return "text-[var(--color-success)]";
    if (isFailed) return "text-[var(--color-error)]";
    return "text-[var(--color-warning)]";
  };

  const getTitleText = () => {
    if (isSuccess) return "Payment Confirmed";
    if (isFailed) return "Payment Failed";
    return "Waiting for wallet approval";
  };

  const getDescriptionText = () => {
    if (isSuccess) return "Your payment has been confirmed. Redirecting...";
    if (isFailed)
      return "There was an error processing your payment. Please try again.";
    return "Please approve the transaction in your wallet. This page will automatically update once the transaction is confirmed.";
  };

  return (
    <div className={`mt-4 p-4 rounded-lg border ${getStatusClasses()}`}>
      <h3 className={`text-lg font-medium ${getHeaderColor()}`}>
        {getTitleText()}
      </h3>
      <p className="text-sm mt-1 text-[var(--color-text-primary)]">
        {getDescriptionText()}
      </p>
      {txHash && (
        <div className="mt-2">
          <p className="text-xs text-secondary">
            Transaction ID:{" "}
            {txHash.length > 12 ? `${txHash.substring(0, 12)}...` : txHash}
          </p>
          {txHash.length > 10 && (
            <a
              href={`https://solscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-text hover:underline transition-colors"
            >
              View on Solana Explorer
            </a>
          )}
        </div>
      )}
      {isPending && (
        <div className="mt-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-warning)] mr-2"></div>
          <span className="text-sm text-[var(--color-warning)]">
            Waiting for confirmation...
          </span>
        </div>
      )}
      {isPending && onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 text-sm text-[var(--color-red-text)] hover:text-[var(--color-red)] transition-colors"
        >
          Cancel payment
        </button>
      )}
    </div>
  );
};

export default TransactionStatus;
