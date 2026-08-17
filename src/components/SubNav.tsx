import React, { useMemo } from 'react';
import { useCategories } from '../hooks/useCategories';

interface SubNavProps {
  selectedCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const SubNav: React.FC<SubNavProps> = ({ selectedCategory, onCategoryClick }) => {
  const { categories } = useCategories();

  const displayCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    // Ensure "all" / "All Products" is available at the start if not present in list
    if (!categories.some(c => c.id.toLowerCase() === 'all')) {
      return [{ id: 'all', name: 'All Products', icon: '🔬', sort_order: 0, active: true }, ...categories];
    }
    return categories;
  }, [categories]);

  if (displayCategories.length === 0) {
    return null;
  }

  return (
    <nav className="bg-white dark:bg-[#0F1219] sticky top-[60px] lg:top-[64px] z-40 border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="container-global">
        <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide">
          {displayCategories.map((category) => {
            const isSelected = selectedCategory.toLowerCase() === category.id.toLowerCase();

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryClick(category.id)}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-95 border cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#3C6CA8] text-white border-[#3C6CA8] shadow-sm'
                    : 'bg-white dark:bg-[#161B26] text-slate-700 dark:text-slate-200 border-slate-250 dark:border-slate-700 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </nav>
  );
};

export default React.memo(SubNav);
