import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface MobileNavProps {
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeCategory, onCategoryClick }) => {
  const { categories } = useCategories();

  return (
    <div className="sticky top-[65px] z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 md:hidden">
      <div className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${activeCategory === category.id
                ? 'bg-theme-accent text-white border-theme-accent'
                : 'bg-transparent text-gray-600 border-gray-200 hover:border-theme-accent'
              }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
