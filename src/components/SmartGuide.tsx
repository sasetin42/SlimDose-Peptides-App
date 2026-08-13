import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, ArrowLeft, BookOpen, Calendar, User, ChevronRight, Video as VideoIcon, Play, X, Search } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    preview: string | null;
    author: string;
    published_date: string;
    cover_image: string | null;
}

interface Video {
    id: string;
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    category: string;
    created_at: string;
}

export default function SmartGuide() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'articles' | 'videos'>('articles');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
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
            if (data) setArticles(data);
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

    const filteredArticles = articles.filter(art => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            art.title.toLowerCase().includes(q) ||
            (art.preview && art.preview.toLowerCase().includes(q)) ||
            (art.author && art.author.toLowerCase().includes(q))
        );
    });

    const filteredVideos = videos.filter(vid => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            vid.title.toLowerCase().includes(q) ||
            (vid.description && vid.description.toLowerCase().includes(q)) ||
            (vid.category && vid.category.toLowerCase().includes(q))
        );
    });

    const getYoutubeEmbedUrl = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        return url;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-left">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-150 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4 max-w-6xl">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <a
                                href="/"
                                className="p-2 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-xl transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-blue-600" />
                            </a>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-900 dark:text-white">PepTalk Content Center</h1>
                            </div>
                        </div>

                        {/* Right Header Section: Search Widget & Tabs */}
                        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
                            {/* Search Widget */}
                            <div className="relative flex-1 sm:w-64 max-w-full">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={activeTab === 'articles' ? "Search articles & guides..." : "Search video tutorials..."}
                                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Tabs Selector */}
                            <div className="flex bg-gray-100 dark:bg-slate-950 rounded-xl p-1 border border-gray-200 dark:border-slate-850 shrink-0 select-none">
                              <button
                                type="button"
                                onClick={() => setActiveTab('articles')}
                                className={`px-4 sm:px-5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                                  activeTab === 'articles'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Articles &amp; Guides</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                  activeTab === 'articles'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                }`}>
                                  {filteredArticles.length}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTab('videos')}
                                className={`px-4 sm:px-5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                                  activeTab === 'videos'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                                }`}
                              >
                                <VideoIcon className="w-3.5 h-3.5" />
                                <span>Videos &amp; Tutorials</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                  activeTab === 'videos'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                }`}>
                                  {filteredVideos.length}
                                </span>
                              </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Search Active Indicator Header */}
                {searchQuery && (
                    <div className="mb-6 flex items-center justify-between bg-blue-50/60 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-slate-300">
                            Showing results for <span className="font-bold text-blue-600 dark:text-blue-400">"{searchQuery}"</span> ({activeTab === 'articles' ? filteredArticles.length : filteredVideos.length} found)
                        </span>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                            Clear Search
                        </button>
                    </div>
                )}

                {/* ─── Articles Tab ─── */}
                {activeTab === 'articles' && (
                    filteredArticles.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow border border-gray-150 dark:border-slate-800">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-navy-900 dark:text-white mb-2">
                                {searchQuery ? 'No Matching Articles Found' : 'No Articles Available Yet'}
                            </h3>
                            <p className="text-gray-600 dark:text-slate-400">
                                {searchQuery ? `No articles matching "${searchQuery}". Try searching with a different term.` : 'Check back soon for educational content about peptides.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredArticles.map((article) => (
                                <div
                                    key={article.id}
                                    onClick={() => navigate(`/peptalk/${article.id}`)}
                                    className="bg-white dark:bg-slate-900 rounded-2xl shadow hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group border border-gray-150 dark:border-slate-800/80"
                                >
                                    {/* Cover Image */}
                                    {article.cover_image ? (
                                        <div className="relative w-full h-48 bg-gray-250 overflow-hidden">
                                            <img
                                                src={article.cover_image}
                                                alt={article.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 bg-gradient-to-br from-blue-600 to-indigo-750 flex items-center justify-center">
                                            <BookOpen className="w-12 h-12 text-white opacity-40" />
                                        </div>
                                    )}

                                    {/* Card Content */}
                                    <div className="p-6">
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {article.title}
                                        </h3>

                                        {article.preview && (
                                            <p className="text-gray-600 dark:text-slate-450 text-xs sm:text-sm mb-4 line-clamp-3 leading-relaxed">
                                                {article.preview}
                                            </p>
                                        )}

                                        {/* Meta Information */}
                                        <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-blue-500" />
                                                <span>{article.author}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                <span>{new Date(article.published_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}</span>
                                            </div>
                                        </div>

                                        {/* Read More */}
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-xs group-hover:gap-3 transition-all uppercase tracking-wider">
                                            <span>Read Article</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* ─── Videos Tab ─── */}
                {activeTab === 'videos' && (
                    filteredVideos.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow border border-gray-150 dark:border-slate-800">
                            <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-navy-900 dark:text-white mb-2">
                                {searchQuery ? 'No Matching Videos Found' : 'No Videos Available Yet'}
                            </h3>
                            <p className="text-gray-600 dark:text-slate-400">
                                {searchQuery ? `No video tutorials matching "${searchQuery}". Try searching with a different keyword.` : 'Check back soon for video tutorials and guide videos.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredVideos.map((vid) => (
                                <div
                                    key={vid.id}
                                    onClick={() => setSelectedVideo(vid)}
                                    className="bg-white dark:bg-slate-900 rounded-2xl shadow hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group border border-gray-150 dark:border-slate-800/80 flex flex-col justify-between"
                                >
                                    <div>
                                      {/* Thumbnail / Play trigger */}
                                      <div className="relative w-full h-48 bg-slate-900 flex items-center justify-center overflow-hidden">
                                          {vid.thumbnail_url ? (
                                              <img
                                                  src={vid.thumbnail_url}
                                                  alt={vid.title}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                                              />
                                          ) : (
                                              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-950 opacity-80" />
                                          )}
                                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                              <Play className="w-6 h-6 fill-white ml-0.5" />
                                            </div>
                                          </div>
                                          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                            {vid.category}
                                          </span>
                                      </div>

                                      {/* Card Content */}
                                      <div className="p-6">
                                          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2.5 line-clamp-2">
                                              {vid.title}
                                          </h3>
                                          <p className="text-gray-600 dark:text-slate-450 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                                              {vid.description}
                                          </p>
                                      </div>
                                    </div>

                                    <div className="p-6 pt-0">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider">
                                            <span>Watch Tutorial</span>
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Video Playback Modal Overlay */}
            {selectedVideo && (
              <div 
                className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
                onClick={() => setSelectedVideo(null)}
              >
                <div 
                  className="relative w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
                    <h3 className="font-bold text-sm sm:text-base truncate">{selectedVideo.title}</h3>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Video aspect ratio container */}
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
                  <div className="p-5 bg-slate-900 text-white text-xs sm:text-sm leading-relaxed text-left border-t border-slate-800">
                    <p className="font-semibold text-slate-400 mb-1">Description</p>
                    <p>{selectedVideo.description}</p>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
}
