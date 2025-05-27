import type { Coin, Network } from "@/types/payment";

interface DropdownProps {
  type: "network" | "coin";
  items: Network[] | Coin[];
  selected: Network | Coin;
  onSelect: (item: any) => void;
  isOpen: boolean;
  toggleDropdown: () => void;
  isDarkMode: boolean;
}

export const Dropdown = ({
  type,
  items,
  selected,
  onSelect,
  isOpen,
  toggleDropdown,
  isDarkMode,
}: DropdownProps) => {
  if (!selected.id) return null;
  return (
    <div className="mb-4">
      <label
        className={`block text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {type === "network" ? "Network" : "Coin"}
      </label>
      <div className="relative">
        <button
          className={`w-full flex items-center justify-between border rounded-lg px-4 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? "bg-gray-700 border-gray-600"
              : "bg-white border-gray-300"
          }`}
          onClick={toggleDropdown}
          type="button"
        >
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2 flex-shrink-0">
              <img
                src={selected.icon}
                alt={selected.name}
                className="object-contain"
                width={24}
                height={24}
              />
            </div>
            <span>{selected.name}</span>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </button>

        {isOpen && (
          <div
            className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg ${
              isDarkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-300"
            }`}
          >
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center px-4 py-2.5 text-left ${
                  isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-100"
                }`}
                onClick={() => onSelect(item)}
              >
                <div className="w-6 h-6 mr-2 flex-shrink-0">
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="object-contain"
                    width={24}
                    height={24}
                  />
                </div>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ErrorMessage = ({
  message,
  isDarkMode,
}: {
  message: string;
  isDarkMode: boolean;
}) => (
  <div
    className={`text-yellow-500 text-center p-4 border rounded-lg ${
      isDarkMode
        ? "bg-yellow-900/20 border-yellow-900/50"
        : "bg-yellow-50 border-yellow-200"
    }`}
  >
    {message}
  </div>
);

export const NoPaymentOptions = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div
    className={`text-center p-4 border rounded-lg ${
      isDarkMode
        ? "bg-gray-700 border-gray-600 text-gray-300"
        : "bg-gray-50 border-gray-200 text-gray-700"
    }`}
  >
    <p>No payment options available for this resource.</p>
  </div>
);
