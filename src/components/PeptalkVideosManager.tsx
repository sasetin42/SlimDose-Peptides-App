import React, { useState, useEffect } from 'react';
import { Video, Plus, Edit, Trash2, Play, Film, Search, X, Calendar, Tag, ExternalLink, Upload as UploadIcon, Image as ImageIcon, Link as LinkIcon, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from '../services/firebaseStorage';
import ImageUpload from './ImageUpload';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  created_at: string;
}

export default function PeptalkVideosManager() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('Reconstitution');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);

  const videoFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('peptalk_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Extract YouTube Thumbnail URL from YouTube video links
  const extractYouTubeThumbnail = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`;
    }
    return null;
  };

  // Helper: Automatically capture frame snapshot from uploaded video file using HTML5 Canvas
  const captureVideoFrameAsThumbnail = async (videoFile: File): Promise<string | null> => {
    setGeneratingThumbnail(true);
    setThumbnailGenerated(false);
    return new Promise((resolve) => {
      let objectUrl = '';
      let isCleanedUp = false;

      const cleanup = () => {
        if (!isCleanedUp) {
          isCleanedUp = true;
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        }
      };

      // Safety timeout in case video loading or seeking hangs
      const timeoutId = setTimeout(() => {
        cleanup();
        setGeneratingThumbnail(false);
        resolve(null);
      }, 10000);

      const done = (result: string | null) => {
        clearTimeout(timeoutId);
        cleanup();
        setGeneratingThumbnail(false);
        if (result) setThumbnailGenerated(true);
        resolve(result);
      };

      try {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        objectUrl = URL.createObjectURL(videoFile);
        video.src = objectUrl;

        let frameCaptured = false;

        const processCanvasFrame = () => {
          if (frameCaptured) return;
          frameCaptured = true;

          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              done(null);
              return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 1. Generate immediate data URL so UI preview displays instantly with 0ms latency
            const localDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setThumbnailUrl(localDataUrl);
            setThumbnailGenerated(true);

            canvas.toBlob(async (blob) => {
              if (!blob) {
                done(localDataUrl);
                return;
              }

              try {
                const thumbFileName = `peptalk_thumb_${Date.now()}.jpg`;
                const thumbFile = new File([blob], thumbFileName, { type: 'image/jpeg' });

                // Try Supabase Storage first
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('peptalk-thumbnails')
                  .upload(thumbFileName, thumbFile, { cacheControl: '3600', upsert: true });

                if (!uploadError && uploadData) {
                  const { data: publicUrlData } = supabase.storage
                    .from('peptalk-thumbnails')
                    .getPublicUrl(thumbFileName);

                  if (publicUrlData?.publicUrl) {
                    setThumbnailUrl(publicUrlData.publicUrl);
                    done(publicUrlData.publicUrl);
                    return;
                  }
                }

                // Fallback to Firebase Storage
                const fbUrl = await uploadFileToStorage(thumbFile, 'peptalk-thumbnails', thumbFileName);
                if (fbUrl) {
                  setThumbnailUrl(fbUrl);
                  done(fbUrl);
                } else {
                  done(localDataUrl);
                }
              } catch (uploadErr) {
                console.warn('Thumbnail storage upload failed, keeping local Data URL snapshot:', uploadErr);
                done(localDataUrl);
              }
            }, 'image/jpeg', 0.85);
          } catch (e) {
            console.warn('Canvas snapshot capture failed:', e);
            done(null);
          }
        };

        const handleMetadata = () => {
          if (!video.videoWidth || !video.videoHeight) {
            done(null);
            return;
          }

          const targetTime = isFinite(video.duration) && video.duration > 0
            ? Math.min(1.0, video.duration / 2)
            : 0;

          // Set 2.5s fallback timer in case onseeked does not trigger on some browsers
          setTimeout(() => {
            if (!frameCaptured) {
              processCanvasFrame();
            }
          }, 2500);

          if (video.currentTime === targetTime) {
            processCanvasFrame();
          } else {
            video.currentTime = targetTime;
          }
        };

        video.onloadedmetadata = handleMetadata;
        video.onloadeddata = () => {
          if (!frameCaptured && video.readyState >= 2) {
            handleMetadata();
          }
        };
        video.onseeked = processCanvasFrame;

        video.onerror = (err) => {
          console.warn('Video element playback error during snapshot:', err);
          done(null);
        };
      } catch (e) {
        console.warn('Video thumbnail capture initialization failed:', e);
        done(null);
      }
    });
  };

  const handleVideoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate video file format
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/mkv'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp4', 'webm', 'mov', 'ogg', 'mkv'];

    if (!validVideoTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      alert('Please upload a valid movie/video file (.mp4, .webm, .mov, .mkv).');
      return;
    }

    setCurrentVideoFile(file);

    try {
      setUploadingFile(true);
      setUploadProgress(15);

      // 1. Immediately extract frame snapshot from local file before cloud upload
      const autoThumb = await captureVideoFrameAsThumbnail(file);
      if (autoThumb) {
        setThumbnailUrl(autoThumb);
      }

      // 2. Try Supabase Storage upload
      const fileExt = ext || 'mp4';
      const fileName = `peptalk_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      setUploadProgress(40);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('peptalk-videos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      setUploadProgress(75);

      let finalVideoUrl = '';

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('peptalk-videos')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          finalVideoUrl = publicUrlData.publicUrl;
        }
      }

      if (!finalVideoUrl) {
        // Fallback to Firebase Storage
        finalVideoUrl = await uploadFileToStorage(file, 'peptalk-videos', fileName);
      }

      setVideoUrl(finalVideoUrl);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Video upload error:', err);
      alert(`Movie file upload failed: ${err.message || 'Error processing file'}`);
    } finally {
      setUploadingFile(false);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  const handleManualRegenerateFrame = async () => {
    if (!currentVideoFile) {
      alert('Please upload or select a video file first to extract a thumbnail frame.');
      return;
    }
    const autoThumb = await captureVideoFrameAsThumbnail(currentVideoFile);
    if (autoThumb) {
      setThumbnailUrl(autoThumb);
    }
  };

  const handleEdit = (vid: VideoItem) => {
    setEditingVideoId(vid.id);
    setTitle(vid.title);
    setDescription(vid.description);
    setVideoUrl(vid.video_url);
    setThumbnailUrl(vid.thumbnail_url || '');
    setCategory(vid.category || 'Reconstitution');
    setThumbnailGenerated(false);
    setGeneratingThumbnail(false);
    setCurrentVideoFile(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PepTalk video?')) return;
    try {
      const { error } = await supabase
        .from('peptalk_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim() || !description.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        category: category
      };

      if (editingVideoId) {
        const { error } = await supabase
          .from('peptalk_videos')
          .update(payload)
          .eq('id', editingVideoId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('peptalk_videos')
          .insert([payload]);

        if (error) throw error;
      }

      setIsFormOpen(false);
      setEditingVideoId(null);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setThumbnailUrl('');
      setCategory('Reconstitution');
      await loadData();
    } catch (err: any) {
      alert(`Failed to save video guide: ${err.message}`);
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'All') return matchesSearch;
    return matchesSearch && v.category === selectedCategory;
  });

  const categories = ['All', 'Reconstitution', 'Dosing', 'Storage', 'Faqs'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-inter text-left">
      {/* Header action panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/10 dark:bg-[#3C6CA8]/20 flex items-center justify-center text-[#3C6CA8] dark:text-[#94BBE9] shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#232323] dark:text-white tracking-tight">
              PepTalk Educational Video Gallery
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage patient video tutorials, dosing instructions, and peptide reconstitution guides
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingVideoId(null);
            setTitle('');
            setDescription('');
            setVideoUrl('');
            setThumbnailUrl('');
            setCategory('Reconstitution');
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#3C6CA8] hover:bg-[#315A8E] text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Video</span>
        </button>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="peptalkvideosmanager-search-video-guides" name="search_video_guides" type="text"
            placeholder="Search video guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none transition-all placeholder:text-slate-400 text-[#232323] dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700 w-full sm:w-auto overflow-x-auto">
          {categories.map(cat => {
            const count = cat === 'All' ? videos.length : videos.filter(v => v.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#3C6CA8] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Compact Backdrop Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl my-auto border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-2xl shrink-0">
              <h3 className="text-base font-extrabold text-[#232323] dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-[#3C6CA8]" />
                {editingVideoId ? 'Edit Educational Video' : 'Upload Educational Video'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Title, Description */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label htmlFor="peptalkvideosmanager-video-title" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Video Title *
                  </label>
                  <input id="peptalkvideosmanager-video-title" name="video_title" type="text"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. How to Reconstitute Semaglutide 5mg"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none text-[#232323] dark:text-white bg-white dark:bg-slate-950 font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="peptalkvideosmanager-video-description" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Video Description *
                  </label>
                  <textarea id="peptalkvideosmanager-video-description" name="video_description" value={description || ''}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Provide step-by-step notes and safety instructions covered in this video..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none text-[#232323] dark:text-white bg-white dark:bg-slate-950 leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Right Column: Category, Movie File Upload / Video URL & Cover Image */}
              <div className="md:col-span-5 space-y-3.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div>
                  <label htmlFor="peptalkvideosmanager-category-tag" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Category Tag *
                  </label>
                  <select id="peptalkvideosmanager-category-tag" name="category_tag" value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-950 text-[#232323] dark:text-white font-bold focus:ring-2 focus:ring-[#3C6CA8] focus:border-[#3C6CA8] outline-none"
                    required
                  >
                    <option value="Reconstitution">Reconstitution Guides</option>
                    <option value="Dosing">Dosing Protocols</option>
                    <option value="Storage">Storage & Handling</option>
                    <option value="Faqs">Frequently Asked Questions</option>
                  </select>
                </div>

                {/* Video Source Mode Toggle */}
                <div>
                  <label htmlFor="peptalkvideosmanager-video-source-type-setuploadmod" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Video Source Type *
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        uploadMode === 'url'
                          ? 'bg-[#3C6CA8] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      URL Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        uploadMode === 'file'
                          ? 'bg-[#3C6CA8] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <UploadIcon className="w-3.5 h-3.5" />
                      File Upload
                    </button>
                  </div>
                </div>

                {/* Video Input Conditional Fields */}
                {uploadMode === 'url' ? (
                  <div>
                    <label htmlFor="peptalkvideosmanager-video-source-type-setuploadmod" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                      YouTube / Video URL *
                    </label>
                    <input id="peptalkvideosmanager-video-source-type-setuploadmod" name="video_source_type_setuploadmod" type="url"
                      value={videoUrl || ''}
                      onChange={(e) => {
                        const urlVal = e.target.value;
                        setVideoUrl(urlVal);
                        const ytThumb = extractYouTubeThumbnail(urlVal);
                        if (ytThumb) {
                          setThumbnailUrl(ytThumb);
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#232323] dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-[#3C6CA8]"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="peptalkvideosmanager-video-file-mp4-webm-mov" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                      Video File (.mp4, .webm, .mov)
                    </label>
                    <input id="peptalkvideosmanager-video-file-mp4-webm-mov" name="video_file_mp4_webm_mov" ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/ogg,video/mkv,.mp4,.webm,.mov,.mkv"
                      onChange={handleVideoFileUpload}
                      className="hidden"/>

                    <div
                      onClick={() => videoFileInputRef.current?.click()}
                      className="p-3.5 border-2 border-dashed border-[#3C6CA8]/40 hover:border-[#3C6CA8] rounded-xl bg-blue-50/40 dark:bg-slate-900/60 hover:bg-blue-50/70 transition-all cursor-pointer text-center space-y-1"
                    >
                      {uploadingFile ? (
                        <div className="space-y-1.5 py-1">
                          <div className="animate-spin w-5 h-5 border-2 border-[#3C6CA8] border-t-transparent rounded-full mx-auto" />
                          <p className="text-xs font-bold text-[#3C6CA8]">Uploading... {uploadProgress}%</p>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#3C6CA8] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Film className="w-6 h-6 text-[#3C6CA8] mx-auto" />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Select video file</p>
                          <p className="text-[10px] text-slate-400">MP4, WEBM, MOV (Max 100MB)</p>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Status & Regenerate Button */}
                    <div className="mt-2 space-y-1.5">
                      {generatingThumbnail && (
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-bold animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                          <span>Generating thumbnail frame...</span>
                        </div>
                      )}

                      {!generatingThumbnail && thumbnailGenerated && (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Snapshot Ready</span>
                          </div>
                          <span className="text-[9px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold px-1.5 py-0.5 rounded">Auto</span>
                        </div>
                      )}

                      {videoUrl && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-[#3C6CA8] dark:text-[#94BBE9] font-bold truncate">
                            <Video className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">File Ready</span>
                          </div>
                          <span className="text-[9px] bg-[#3C6CA8]/20 text-[#3C6CA8] dark:text-[#94BBE9] font-bold px-1.5 py-0.5 rounded">Attached</span>
                        </div>
                      )}

                      {(currentVideoFile || videoUrl) && (
                        <button
                          type="button"
                          onClick={handleManualRegenerateFrame}
                          disabled={generatingThumbnail || uploadingFile}
                          className="w-full py-1.5 px-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${generatingThumbnail ? 'animate-spin' : ''}`} />
                          <span>Regenerate Frame</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Thumbnail Upload */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Custom Thumbnail
                  </span>
                  {!thumbnailUrl && (
                    <ImageUpload
                      currentImage={thumbnailUrl}
                      onImageChange={(newUrl) => {
                        setThumbnailUrl(newUrl || '');
                        setThumbnailGenerated(false);
                      }}
                      folder="peptalk-thumbnails"
                      showUrlInput={false}
                      className="mb-1"
                    />
                  )}
                </div>

                {/* Thumbnail Preview Card */}
                {thumbnailUrl && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Preview
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailUrl('');
                          setThumbnailGenerated(false);
                        }}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    </div>

                    <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 relative group">
                      <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="md:col-span-12 flex justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-extrabold rounded-xl text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  {editingVideoId ? 'Save Changes' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Videos List Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 p-10 text-center">
          <Video className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h4 className="text-sm font-extrabold text-[#232323] dark:text-white">No Video Guides Found</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {searchQuery ? 'No video guides matching your query' : 'Upload educational video files or YouTube tutorials to display in the customer center.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredVideos.map(v => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:border-[#3C6CA8]/60 transition-all group"
            >
              <div>
                {/* Thumbnail Preview */}
                <div className="relative w-full h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900/60 to-slate-950 flex items-center justify-center">
                      <Film className="w-8 h-8 text-slate-600 opacity-50" />
                    </div>
                  )}
                  <span className="absolute top-2.5 left-2.5 bg-[#3C6CA8] text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    {v.category}
                  </span>
                  <a
                    href={v.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/90 group-hover:scale-110 flex items-center justify-center shadow-md transition-transform">
                      <Play className="w-4 h-4 fill-[#3C6CA8] text-[#3C6CA8] ml-0.5" />
                    </div>
                  </a>
                </div>

                <div className="p-4">
                  <h4 className="font-extrabold text-[#232323] dark:text-white text-sm mb-1 line-clamp-1">{v.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">{v.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(v.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2">
                <a
                  href={v.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#3C6CA8] dark:text-[#94BBE9] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Watch Video
                </a>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(v)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit className="w-3 h-3 text-[#3C6CA8]" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
