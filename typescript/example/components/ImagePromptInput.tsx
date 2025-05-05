"use client";
import React from "react";

interface ImagePromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  minLength: number;
  paymentMethod: "evm" | "solana";
  walletConnected: boolean;
  onGenerateImage?: () => Promise<void>;
  isProcessing: boolean;
  canProcessPayment: boolean;
}

const ImagePromptInput: React.FC<ImagePromptInputProps> = ({
  value,
  onChange,
  disabled,
  minLength,
  paymentMethod,
  walletConnected,
  onGenerateImage,
  isProcessing,
  canProcessPayment,
}) => {
  if (!walletConnected) {
    return null;
  }

  return (
    <div className="card mt-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-primary">
          Generate an AI Image
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-tertiary mb-1"
            >
              Image Prompt
            </label>
            <input
              type="text"
              id="prompt"
              placeholder="Describe the image you want to generate"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-4 py-2.5 text-base border-2 border-[var(--color-border)] rounded-lg focus:ring-4 focus:ring-[var(--color-primary-light)] focus:border-[var(--color-primary)] bg-white text-[var(--color-text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--color-text-secondary)] placeholder:opacity-70"
              disabled={disabled}
            />
            {value.trim().length > 0 && value.trim().length < minLength && (
              <p className="text-[var(--color-red-text)] text-xs mt-1">
                Prompt must be at least {minLength} characters
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-secondary mb-2">
              {paymentMethod === "evm" ? (
                <>Cost: 0.001 BNB (~$0.30)</>
              ) : (
                <>Cost: 0.001 SOL (~$0.10)</>
              )}
            </p>
          </div>
          {/* Generate Image Button */}
          <button
            onClick={onGenerateImage}
            disabled={!canProcessPayment || isProcessing}
            className={`button w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              canProcessPayment && !isProcessing
                ? paymentMethod === "evm"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
                : ""
            }`}
            style={{
              backgroundColor:
                !canProcessPayment || isProcessing
                  ? "var(--color-button-bg-disabled)"
                  : undefined,
              color:
                !canProcessPayment || isProcessing
                  ? "var(--color-text-disabled)"
                  : undefined,
            }}
          >
            {isProcessing ? "Processing..." : "Generate Image"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePromptInput;
