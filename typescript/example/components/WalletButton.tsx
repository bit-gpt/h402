import { GenericWalletId } from "../config/walletOptions";

interface Props<T extends GenericWalletId> {
  id: T;
  icon: React.ReactNode;
  label: string;
  onClick: (id: T) => void | Promise<void>;
  disabled?: boolean;
}

export default function WalletButton<T extends GenericWalletId>({
  id,
  icon,
  label,
  onClick,
  disabled = false,
}: Props<T>) {
  return (
    <button
      className={`flex items-center w-full px-4 py-3 rounded-lg border ${
        disabled
          ? "border-gray-300 bg-gray-100 cursor-not-allowed"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      } transition-colors duration-200`}
      onClick={() => onClick(id)}
      disabled={disabled}
    >
      <div className="flex-shrink-0 mr-3 w-6 h-6">{icon}</div>
      <span
        className={`${disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}
      >
        {label}
      </span>
    </button>
  );
}
