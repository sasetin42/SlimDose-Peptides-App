import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Package, CreditCard, Truck, ArrowLeft, MessageCircle, HelpCircle, Search, Sparkles, Calculator, ShieldCheck, ExternalLink } from 'lucide-react';
import { useFAQs } from '../hooks/useFAQs';

const categoryIcons: { [key: string]: React.ReactElement } = {
  'PRODUCT & USAGE': <FlaskConical className="w-5 h-5" />,
  'ORDERING & PACKAGING': <Package className="w-5 h-5" />,
  'PAYMENT METHODS': <CreditCard className="w-5 h-5" />,
  'SHIPPING & DELIVERY': <Truck className="w-5 h-5" />,
};

const FAQ: React.FC = () => {
  const { faqs, categories, loading } = useFAQs();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['1', '2'])); // Open first 2 items by default
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggle individual FAQ item
  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Expand all items
  const expandAll = () => {
    setOpenItems(new Set(faqs.map((item) => item.id)));
  };

  // Collapse all items
  const collapseAll = () => {
    setOpenItems(new Set());
  };

  // Filtered FAQs based on Category and Search Query
  const filteredFAQs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory ? faq.category === activeCategory : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchQuery]);

  const telegramUrl = `https://t.me/slimdose_mnl`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-[#3C6CA8] border-t-transparent rounded-full" />
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Loading Frequently Asked Questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
      {/* Sticky Header Nav */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all group"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#3C6CA8]" />
            </a>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Frequently Asked Questions</span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] border border-[#3C6CA8]/20 hidden sm:inline-block">
                    Knowledge Base
                  </span>
                </h1>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 hidden sm:block">
                  Verified Tirzepatide research, ordering, reconstitution & shipping guide
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-[#3C6CA8] hover:bg-[#325a8c] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
            >
              <MessageCircle className="w-4 h-4 text-amber-300" />
              <span>Ask Telegram Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Expanded Layout Container (max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Top Hero Banner & Search */}
        <div className="bg-gradient-to-r from-[#3C6CA8]/10 via-blue-50 to-[#3C6CA8]/5 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border border-[#3C6CA8]/20 rounded-3xl p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] text-xs font-black uppercase tracking-wider mb-3 border border-[#3C6CA8]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Search Center</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              How can we help your Tirzepatide journey today?
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 mb-6">
              Find instant answers regarding reconstitution, cold-chain shipping, insulin pen needles, dosing schedules, and payment methods.
            </p>

            {/* Wide Search Bar */}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input id="faq-search" name="search" type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs by keywords e.g., 'reconstitution', 'shipping', 'needles', 'Tirzepatide'..."
                className="w-full pl-12 pr-10 py-3.5 text-sm md:text-base border border-gray-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none shadow-md transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Grid Layout (lg:grid-cols-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main FAQ Content (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Category Filter Pills & Controls Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all shrink-0 cursor-pointer ${
                    activeCategory === null
                      ? 'bg-[#3C6CA8] text-white shadow-md shadow-[#3C6CA8]/20'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8]'
                  }`}
                >
                  All ({faqs.length})
                </button>
                {categories.map((category) => {
                  const count = faqs.filter((f) => f.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        activeCategory === category
                          ? 'bg-[#3C6CA8] text-white shadow-md shadow-[#3C6CA8]/20'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-[#3C6CA8]/10 hover:text-[#3C6CA8]'
                      }`}
                    >
                      <span>{categoryIcons[category]}</span>
                      <span>{category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-slate-700/50">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Expand / Collapse Controls */}
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-slate-800">
                <button
                  onClick={expandAll}
                  className="text-xs font-bold text-[#3C6CA8] hover:bg-[#3C6CA8]/10 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  Expand All
                </button>
                <span className="text-gray-300 dark:text-slate-700">|</span>
                <button
                  onClick={collapseAll}
                  className="text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* No Search Results Notice */}
            {filteredFAQs.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-800 text-center shadow-sm">
                <HelpCircle className="w-12 h-12 text-[#3C6CA8] mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                  No matching questions found
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                  We couldn't find any questions matching "{searchQuery}". Try searching for keywords like "reconstitution", "needles", or "Metro Manila".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory(null);
                  }}
                  className="px-4 py-2 bg-[#3C6CA8] text-white rounded-xl text-xs font-bold hover:bg-[#325a8c] transition-all"
                >
                  Reset Search Filters
                </button>
              </div>
            )}

            {/* FAQ Accordions Grouped by Category */}
            {(activeCategory ? [activeCategory] : categories).map((category) => {
              const categoryFaqs = filteredFAQs.filter((faq) => faq.category === category);
              if (categoryFaqs.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0">
                        {categoryIcons[category] || <HelpCircle className="w-4 h-4" />}
                      </div>
                      <h3 className="font-extrabold text-xs md:text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                        {category}
                      </h3>
                    </div>
                    <span className="text-[11px] font-black text-[#3C6CA8] px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 border border-[#3C6CA8]/20">
                      {categoryFaqs.length} {categoryFaqs.length === 1 ? 'Topic' : 'Topics'}
                    </span>
                  </div>

                  {/* Accordion List */}
                  <div className="space-y-3">
                    {categoryFaqs.map((faq) => {
                      const isOpen = openItems.has(faq.id);
                      return (
                        <div
                          key={faq.id}
                          id={`faq-${faq.id}`}
                          className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
                            isOpen
                              ? 'border-[#3C6CA8] shadow-md ring-1 ring-[#3C6CA8]/20'
                              : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/40 shadow-sm'
                          }`}
                        >
                          {/* Question Button */}
                          <button
                            onClick={() => toggleItem(faq.id)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left group gap-4 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#3C6CA8] shrink-0" />
                              <span className="font-extrabold text-sm md:text-base text-gray-900 dark:text-slate-100 group-hover:text-[#3C6CA8] transition-colors leading-snug">
                                {faq.question}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  isOpen
                                    ? 'bg-[#3C6CA8] text-white'
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-400 group-hover:text-[#3C6CA8]'
                                }`}
                              >
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Answer Content */}
                          {isOpen && (
                            <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-slate-800/80 mt-1">
                              <div className="py-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-line">
                                {faq.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: Interactive Related Patient Resources & Support Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Patient Tools Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3C6CA8]" />
                <span>Related Patient Tools</span>
              </h3>
              <div className="space-y-3">
                <a
                  href="/calculator"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Dosage Calculator</p>
                      <p className="text-[10px] text-gray-400">Calculate tirzepatide units & mg</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>

                <a
                  href="/track"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Track Order Status</p>
                      <p className="text-[10px] text-gray-400">Real-time J&T / Maxim tracking</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>

                <a
                  href="/lab-tests"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Lab Test Reports</p>
                      <p className="text-[10px] text-gray-400">99.4%+ Purity COA verification</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>
              </div>
            </div>

            {/* Telegram Customer Order Support Card */}
            <div className="bg-[#0C1931] text-white rounded-[26px] p-6 shadow-xl border border-blue-900/40 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider mb-2.5">
                <ShieldCheck className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                <span>CUSTOMER ORDER SUPPORT</span>
              </div>
              <h4 className="text-lg font-black text-white mb-2 leading-snug">
                Have a Question About Your Order?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                Our support team is available on Telegram to assist with questions about your order, set inclusions and delivery.
              </p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#3365A5] hover:bg-[#285287] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md group"
              >
                <MessageCircle className="w-5 h-5 text-amber-400 fill-transparent" />
                <span>Chat on Telegram</span>
              </a>
            </div>

            {/* Quick Category Jump Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                Quick Category Jump
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-[#3C6CA8] text-white'
                        : 'bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-700 dark:text-slate-300 hover:text-[#3C6CA8]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {categoryIcons[cat]}
                      <span className="truncate">{cat}</span>
                    </span>
                    <span className="text-[10px] font-black opacity-80">
                      {faqs.filter((f) => f.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
