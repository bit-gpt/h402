import Image, { StaticImageData } from "next/image";

interface SolanaWalletButtonProps {
  id: string;
  icon: StaticImageData;
  label: string;
  onClick: (walletType: string) => void | Promise<void>;
}

const SolanaWalletButton: React.FC<SolanaWalletButtonProps> = ({
  id,
  icon,
  label,
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(id)}
      className="w-full px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center cursor-pointer"
    >
      <Image src={icon} alt={label} width={20} height={20} className="mr-2" />
      <span>{label}</span>
    </button>
  );
};

export default SolanaWalletButton;
