"use client";

interface PaymentSelectorProps {
  paymentMethod: "evm" | "solana";
  onMethodChange: (method: "evm" | "solana") => void;
  disabled: boolean;
}

const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  paymentMethod,
  onMethodChange,
  disabled,
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-3">Select Payment Method</h2>
      <div className="flex space-x-4">
        <button
          onClick={() => onMethodChange("evm")}
          className={`px-4 py-2 rounded-lg ${
            paymentMethod === "evm"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
          disabled={disabled}
        >
          EVM (BSC)
        </button>
        <button
          onClick={() => onMethodChange("solana")}
          className={`px-4 py-2 rounded-lg ${
            paymentMethod === "solana"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
          disabled={disabled}
        >
          Solana
        </button>
      </div>
    </div>
  );
};

export default PaymentSelector;
