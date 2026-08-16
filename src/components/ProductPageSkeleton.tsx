import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * ProductPageSkeleton — shown while ProductPage lazy-chunk + data are loading.
 * Mirrors the two-column product detail layout with shimmer placeholders.
 */
const ProductPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white dark:bg-[#0F1219] animate-fadeIn">
    {/* Back button row */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
      <div className="inline-flex items-center gap-2 text-sm text-gray-400">
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </div>
    </div>

    {/* Main two-column layout */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        
        {/* LEFT: Image skeleton */}
        <div className="w-full">
          <div className="aspect-square rounded-2xl skeleton" />
          {/* Thumbnail strip */}
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-16 h-16 rounded-xl skeleton shrink-0" />
            ))}
          </div>
        </div>

        {/* RIGHT: Details skeleton */}
        <div className="flex flex-col gap-4">
          {/* Category badge */}
          <div className="h-4 w-24 rounded-full skeleton" />
          
          {/* Product name */}
          <div className="space-y-2">
            <div className="h-8 w-3/4 rounded-lg skeleton" />
            <div className="h-8 w-1/2 rounded-lg skeleton" />
          </div>

          {/* Price row */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 rounded-lg skeleton" />
            <div className="h-5 w-20 rounded skeleton" />
          </div>

          {/* Purity + badges */}
          <div className="flex gap-2 flex-wrap">
            <div className="h-6 w-28 rounded-full skeleton" />
            <div className="h-6 w-24 rounded-full skeleton" />
            <div className="h-6 w-20 rounded-full skeleton" />
          </div>

          {/* Description */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full rounded skeleton" />
            <div className="h-3.5 w-full rounded skeleton" />
            <div className="h-3.5 w-5/6 rounded skeleton" />
          </div>

          {/* Variation selector label */}
          <div className="h-4 w-32 rounded skeleton mt-2" />
          {/* Variation buttons */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-24 rounded-xl skeleton" />
            ))}
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex gap-3 mt-2">
            <div className="h-12 w-32 rounded-xl skeleton" />
            <div className="h-12 flex-1 rounded-xl skeleton" />
          </div>

          {/* Trust badges strip */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-12 rounded-xl skeleton" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mt-10 border-b border-gray-100 dark:border-slate-800">
        <div className="flex gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 w-16 rounded skeleton mb-3" />
          ))}
        </div>
      </div>

      {/* Tab content skeleton */}
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-5/6 rounded skeleton" />
        <div className="h-4 w-4/5 rounded skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-3/4 rounded skeleton" />
      </div>
    </div>
  </div>
);

export default ProductPageSkeleton;
