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

  return (
    <div className={`mt-4 p-4 rounded-md border ${isSuccess ? 'bg-green-50 border-green-200' : isFailed ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
      <h3 className={`text-lg font-medium ${isSuccess ? 'text-green-800' : isFailed ? 'text-red-800' : 'text-yellow-800'}`}>
        {isSuccess ? 'Payment Confirmed' : isFailed ? 'Payment Failed' : 'Waiting for wallet approval'}
      </h3>
      <p className={`text-sm mt-1 ${isSuccess ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-yellow-600'}`}>
        {isSuccess ? 'Your payment has been confirmed. Redirecting...' : 
         isFailed ? 'There was an error processing your payment. Please try again.' :
         'Please approve the transaction in your wallet. This page will automatically update once the transaction is confirmed.'}
      </p>
      {txHash && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Transaction ID: {txHash.length > 12 ? `${txHash.substring(0, 12)}...` : txHash}
          </p>
          {txHash.length > 10 && (
            <a 
              href={`https://solscan.io/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View on Solana Explorer
            </a>
          )}
        </div>
      )}
      {isPending && (
        <div className="mt-3 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
          <span className="text-sm text-yellow-700">
            Waiting for confirmation...
          </span>
        </div>
      )}
      {isPending && onCancel && (
        <button
          onClick={onCancel}
          className="mt-3 text-sm text-red-600 hover:text-red-800"
        >
          Cancel payment
        </button>
      )}
    </div>
  );
};

export default TransactionStatus;
