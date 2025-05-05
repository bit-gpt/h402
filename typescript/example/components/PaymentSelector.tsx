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
      <h2 className="text-lg font-medium mb-3 text-primary">
        Select Payment Method
      </h2>
      <div className="flex gap-4">
        <button
          onClick={() => onMethodChange("evm")}
          className={`button px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            paymentMethod === "evm"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]"
          }`}
          disabled={disabled}
        >
          EVM (BSC)
        </button>
        <button
          onClick={() => onMethodChange("solana")}
          className={`button px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            paymentMethod === "solana"
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]"
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
