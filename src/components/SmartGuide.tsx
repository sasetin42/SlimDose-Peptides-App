import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, BookOpen, Calendar, User, ChevronRight, Video as VideoIcon, Play, X, Search, Sparkles, Bookmark, Share2, Calculator, FlaskConical, Check, Clock, ShieldCheck, MessageCircle, ExternalLink, Truck } from 'lucide-react';
import { fireToast } from './ToastNotification';

interface Article {
  id: string;
  title: string;
  preview: string | null;
  author: string;
  published_date: string;
  cover_image: string | null;
  read_time?: string;
  category?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  created_at: string;
  duration?: string;
}

export default function SmartGuide() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'videos'>('articles');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedArticles, setSavedArticles] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('slimdose_saved_articles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchArticles(), fetchVideos()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('guide_topics')
        .select('id, title, preview, author, published_date, cover_image')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setArticles(
          data.map((art, idx) => ({
            ...art,
            read_time: `${3 + (idx % 4)} min read`,
            category: idx % 3 === 0 ? 'RECONSTITUTION' : idx % 3 === 1 ? 'DOSING & USAGE' : 'PEN & NEEDLES'
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('peptalk_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  // Toggle Bookmark
  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        fireToast('Removed from saved bookmarks', 'info');
      } else {
        newSet.add(id);
        fireToast('Saved to your bookmarks!', 'success');
      }
      localStorage.setItem('slimdose_saved_articles', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCategory = selectedCategory === 'All' ? true : art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        (art.preview && art.preview.toLowerCase().includes(q)) ||
        (art.author && art.author.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Filtered Videos
  const filteredVideos = useMemo(() => {
    return videos.filter((vid) => {
      const matchesCategory = selectedCategory === 'All' ? true : vid.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        vid.title.toLowerCase().includes(q) ||
        (vid.description && vid.description.toLowerCase().includes(q)) ||
        (vid.category && vid.category.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [videos, selectedCategory, searchQuery]);

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const telegramUrl = `https://t.me/slimdosedvo`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-[#3C6CA8] border-t-transparent rounded-full" />
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Loading PepTalk Content Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors text-left">
      {/* Sticky Header Nav */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Top Row on Mobile: Back Arrow + Icon + Title + Mobile Tabs */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <a
                href="/"
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all group shrink-0"
                title="Return to Home"
              >
                <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-300 group-hover:text-[#3C6CA8]" />
              </a>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <span className="truncate">PepTalk Content Center</span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] border border-[#3C6CA8]/20 hidden lg:inline-block shrink-0">
                    Peptide Education
                  </span>
                </h1>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 hidden lg:block truncate">
                  Expert Tirzepatide research guides, reconstitution tutorials &amp; video walkthroughs
                </p>
              </div>
            </div>

            {/* Tab Switcher Pills on Mobile */}
            <div className="flex md:hidden bg-gray-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'articles'
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>({filteredArticles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'videos'
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                <VideoIcon className="w-3 h-3" />
                <span>({filteredVideos.length})</span>
              </button>
            </div>
          </div>

          {/* Search Input & Desktop Tab Switcher */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Search Input (Full width on mobile, w-64 on desktop) */}
            <div className="relative flex-1 md:w-64 min-w-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PepTalk guides..."
                className="w-full pl-9 pr-7 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Tab Switcher */}
            <div className="hidden md:flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'articles'
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-[#3C6CA8]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Articles</span> ({filteredArticles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'videos'
                    ? 'bg-[#3C6CA8] text-white shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-[#3C6CA8]'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Videos</span> ({filteredVideos.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Expanded Layout Container (max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Top Hero Feature Showcase */}
        <div className="bg-gradient-to-r from-[#3C6CA8]/15 via-blue-50 to-[#3C6CA8]/5 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 border border-[#3C6CA8]/20 rounded-3xl p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] text-xs font-black uppercase tracking-wider mb-3 border border-[#3C6CA8]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PepTalk Masterclass &amp; Knowledge Base</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              Everything You Need for Safe &amp; Effective Peptide Therapy
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-4">
              Explore step-by-step Tirzepatide reconstitution, insulin pen cartridge loading, dosage calculations, and cold-chain storage guidelines created by our medical team.
            </p>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {['All', 'RECONSTITUTION', 'DOSING & USAGE', 'PEN & NEEDLES'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-[#3C6CA8] text-white border-[#3C6CA8] shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[#3C6CA8]/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Grid Layout (lg:grid-cols-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Articles / Videos Grid (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Search Indicator */}
            {searchQuery && (
              <div className="flex items-center justify-between bg-blue-50/70 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs">
                <span className="font-semibold text-gray-700 dark:text-slate-300">
                  Showing PepTalk results for <span className="font-bold text-[#3C6CA8]">"{searchQuery}"</span> ({activeTab === 'articles' ? filteredArticles.length : filteredVideos.length} found)
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="font-bold text-[#3C6CA8] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {/* ─── Articles Grid ─── */}
            {activeTab === 'articles' && (
              filteredArticles.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-gray-200 dark:border-slate-800">
                  <FileText className="w-12 h-12 text-[#3C6CA8] mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                    No articles found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                    No PepTalk guides match your current filters. Try searching for "reconstitution" or "Tirzepatide".
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="px-4 py-2 bg-[#3C6CA8] text-white rounded-xl text-xs font-bold hover:bg-[#325a8c]"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article) => {
                    const isBookmarked = savedArticles.has(article.id);
                    return (
                      <div
                        key={article.id}
                        onClick={() => navigate(`/peptalk/${article.id}`)}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col justify-between"
                      >
                        <div>
                          {/* Cover Image */}
                          <div className="relative w-full h-48 bg-slate-900 overflow-hidden">
                            {article.cover_image ? (
                              <img
                                src={article.cover_image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#3C6CA8] to-slate-900 flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-white/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            {/* Category & Bookmark Badge */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                              <span className="bg-[#3C6CA8] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                                {article.category || 'GUIDE'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => toggleBookmark(e, article.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                                  isBookmarked
                                    ? 'bg-amber-400 text-gray-950 border-amber-300'
                                    : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                                }`}
                                title={isBookmarked ? 'Bookmarked' : 'Save for later'}
                              >
                                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#3C6CA8] transition-colors leading-snug">
                              {article.title}
                            </h3>
                            {article.preview && (
                              <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                                {article.preview}
                              </p>
                            )}

                            {/* Meta Info */}
                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                              <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-slate-300">
                                <User className="w-3.5 h-3.5 text-[#3C6CA8]" />
                                <span>{article.author}</span>
                              </span>
                              <span className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{article.read_time}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Read Link */}
                        <div className="px-5 pb-5 pt-0">
                          <div className="flex items-center justify-between text-xs font-black text-[#3C6CA8] group-hover:gap-2 transition-all">
                            <span>READ FULL GUIDE</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ─── Videos Grid ─── */}
            {activeTab === 'videos' && (
              filteredVideos.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-sm border border-gray-200 dark:border-slate-800">
                  <VideoIcon className="w-12 h-12 text-[#3C6CA8] mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                    No video tutorials found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                    No videos match your current search. Check back soon for new peptide video tutorials.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="px-4 py-2 bg-[#3C6CA8] text-white rounded-xl text-xs font-bold hover:bg-[#325a8c]"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => setSelectedVideo(vid)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col justify-between"
                    >
                      <div>
                        {/* Video Thumbnail */}
                        <div className="relative w-full h-48 bg-slate-900 flex items-center justify-center overflow-hidden">
                          {vid.thumbnail_url ? (
                            <img
                              src={vid.thumbnail_url}
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#3C6CA8] to-slate-950 opacity-80" />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-[#3C6CA8] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute top-3 left-3 bg-[#3C6CA8] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            {vid.category || 'TUTORIAL'}
                          </span>
                        </div>

                        {/* Card Content */}
                        <div className="p-5">
                          <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-[#3C6CA8] transition-colors leading-snug">
                            {vid.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {vid.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0">
                        <div className="flex items-center gap-1.5 text-[#3C6CA8] font-black text-xs uppercase tracking-wider">
                          <span>WATCH TUTORIAL VIDEO</span>
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Sidebar & Patient Resources (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Patient Resources Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3C6CA8]" />
                <span>Patient Tools &amp; Calculators</span>
              </h3>
              <div className="space-y-3">
                <a
                  href="/calculator"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <Calculator className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Dosage Calculator</p>
                      <p className="text-[10px] text-gray-400">Calculate Tirzepatide units &amp; mg</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>

                <a
                  href="/track-order"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900/40">
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Track My Order</p>
                      <p className="text-[10px] text-gray-400">Real-time J&amp;T &amp; Maxim tracking</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>

                <a
                  href="/coa"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-[#3C6CA8]/10 text-gray-800 dark:text-slate-100 hover:text-[#3C6CA8] border border-gray-100 dark:border-slate-700/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-900/40">
                      <FlaskConical className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs">Purity COA Reports</p>
                      <p className="text-[10px] text-gray-400">99.4%+ Verified Lab Test Results</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#3C6CA8] transition-colors" />
                </a>
              </div>
            </div>

            {/* Saved Bookmarks Box */}
            {savedArticles.size > 0 && (
              <div className="bg-amber-50/70 dark:bg-slate-900 rounded-3xl p-6 border border-amber-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-500 fill-current" />
                    <span>Your Bookmarks ({savedArticles.size})</span>
                  </span>
                  <button
                    onClick={() => {
                      setSavedArticles(new Set());
                      localStorage.removeItem('slimdose_saved_articles');
                    }}
                    className="text-[10px] font-extrabold text-gray-400 hover:text-rose-500"
                  >
                    Clear
                  </button>
                </h3>
                <div className="space-y-2">
                  {articles
                    .filter((a) => savedArticles.has(a.id))
                    .map((a) => (
                      <div
                        key={a.id}
                        onClick={() => navigate(`/peptalk/${a.id}`)}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-gray-900 dark:text-white truncate">{a.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Telegram Medical Support Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-blue-800/40 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Medical Consultation Support</span>
              </div>
              <h4 className="text-base font-black text-white text-[#FFFFFF] mb-2 leading-snug">
                Need Help with Reconstitution or Dosing?
              </h4>
              <p className="text-xs text-blue-100/90 leading-relaxed mb-4">
                Our support team is available on Telegram to answer questions regarding Tirzepatide reconstitution sets, insulin pen pushers, and cold ice pack delivery.
              </p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-[#3C6CA8] hover:bg-[#325a8c] text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MessageCircle className="w-4.5 h-4.5 text-amber-300" />
                <span>Chat on Telegram (@slimdosedvo)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Video Playback Modal Overlay */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <VideoIcon className="w-4 h-4 text-[#3C6CA8]" />
                <h3 className="font-bold text-sm sm:text-base truncate">{selectedVideo.title}</h3>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative pb-[56.25%] h-0 bg-black">
              {selectedVideo.video_url.includes('youtube.com') || selectedVideo.video_url.includes('youtu.be') ? (
                <iframe
                  src={getYoutubeEmbedUrl(selectedVideo.video_url)}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={selectedVideo.video_url}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>

            <div className="p-5 bg-slate-950 text-white text-xs sm:text-sm leading-relaxed text-left border-t border-slate-800">
              <p className="font-bold text-slate-400 mb-1">Tutorial Details</p>
              <p className="text-slate-300">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
