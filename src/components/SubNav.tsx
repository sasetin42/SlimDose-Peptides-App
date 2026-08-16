import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface SubNavProps {
  selectedCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const SubNav: React.FC<SubNavProps> = ({ selectedCategory, onCategoryClick }) => {
  const { categories, loading } = useCategories();

  if (loading) {
    return (
      <div className="bg-white">
        <div className="container-global py-3">
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-cream-100 h-11 w-36 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className="bg-white sticky top-[60px] lg:top-[64px] z-40">
      <div className="container-global">
        <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 border-[1.5px] cursor-pointer ${
                  isSelected
                    ? 'bg-theme-accent text-white border-theme-accent shadow-luxury'
                    : 'bg-white dark:bg-[#161B26] text-theme-accent border-gray-250 dark:border-gray-700 shadow-soft hover:bg-gray-50/50 dark:hover:bg-gray-800/40'
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

export default SubNav;
