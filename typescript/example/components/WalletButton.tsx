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
      className={`flex items-center justify-center w-full px-4 py-3 rounded-lg border ${
        disabled
          ? "border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 cursor-not-allowed"
          : "border-gray-200 bg-white dark:bg-[color:var(--color-card-bg)] hover:bg-gray-50 dark:hover:bg-[color:var(--color-card-hover)] hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 shadow-sm hover:shadow cursor-pointer"
      } transition-all duration-200`}
      onClick={() => onClick(id)}
      disabled={disabled}
    >
      <div className="flex-shrink-0 mr-3 w-6 h-6 flex items-center justify-center">{icon}</div>
      <span
        className={`${
          disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"
        } font-medium`}
      >
        {label}
      </span>
    </button>
  );
}
