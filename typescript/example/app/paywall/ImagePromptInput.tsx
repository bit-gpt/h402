"use client";

import React from "react";

interface ImagePromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  minLength: number;
  paymentMethod: "evm" | "solana";
  walletConnected: boolean;
}

const ImagePromptInput: React.FC<ImagePromptInputProps> = ({
  value,
  onChange,
  disabled,
  minLength,
  paymentMethod,
  walletConnected,
}) => {
  if (!walletConnected) {
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-gray-800 mt-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Generate an AI Image</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Image Prompt
            </label>
            <input
              type="text"
              id="prompt"
              placeholder="Describe the image you want to generate"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={disabled}
            />
            {value.trim().length > 0 && value.trim().length < minLength && (
              <p className="text-red-500 text-xs mt-1">
                Prompt must be at least {minLength} characters
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {paymentMethod === "evm" ? (
                <>Cost: 0.001 BNB (~$0.30)</>
              ) : (
                <>Cost: 0.001 SOL (~$0.10)</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePromptInput;
