import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  itemCount: number;
  onCartClick: () => void;
}

const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ itemCount, onCartClick }) => {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onCartClick}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 bg-navy-900 hover:bg-navy-800 text-white rounded-full shadow-xl hover:shadow-gold-glow transition-all duration-300 transform hover:scale-110 z-50 p-3 md:p-4 group border border-navy-900/30"
      aria-label="View cart"
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        <span className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black text-[10px] md:text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center animate-pulse shadow-lg">
          {itemCount}
        </span>
      </div>
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap hidden md:block">
        <div className="bg-gray-900 text-white text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 rounded-lg shadow-lg">
          {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
        </div>
      </div>
    </button>
  );
};

export default FloatingCartButton;
