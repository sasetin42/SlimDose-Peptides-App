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
    <div className="space-y-6 text-left">
      {/* Header action panel with High-Contrast Prominent Action Button */}
      <div className="bg-white rounded-2xl shadow-xs p-5 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-600" />
            PepTalk Educational Video Center Panel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage patient video tutorials, dosing instructions & reconstitution guides.</p>
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
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-wide shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer border border-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Upload New Video</span>
        </button>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search video guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat} ({cat === 'All' ? videos.length : videos.filter(v => v.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Compact Backdrop Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl my-auto border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                {editingVideoId ? 'Edit Educational Video Guide' : 'Upload New Educational Video Guide'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Title, Description */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. How to Reconstitute Semaglutide 5mg"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-slate-900 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Video Description *
                  </label>
                  <textarea
                    value={description || ''}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Provide step-by-step notes and safety instructions covered in this video..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-slate-900 leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Right Column: Category, Movie File Upload / Video URL & Cover Image */}
              <div className="md:col-span-5 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Category Tag *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Video Source Type *
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        uploadMode === 'url'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      YouTube / URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        uploadMode === 'file'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadIcon className="w-3.5 h-3.5" />
                      Movie Upload
                    </button>
                  </div>
                </div>

                {/* Video Input Conditional Fields */}
                {uploadMode === 'url' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      YouTube / Stream URL *
                    </label>
                    <input
                      type="url"
                      value={videoUrl || ''}
                      onChange={(e) => {
                        const urlVal = e.target.value;
                        setVideoUrl(urlVal);
                        const ytThumb = extractYouTubeThumbnail(urlVal);
                        if (ytThumb) {
                          setThumbnailUrl(ytThumb);
                        }
                      }}
                      onBlur={(e) => {
                        const ytThumb = extractYouTubeThumbnail(e.target.value);
                        if (ytThumb) {
                          setThumbnailUrl(ytThumb);
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Upload Movie / Video File (.mp4, .webm, .mov)
                    </label>
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/ogg,video/mkv,.mp4,.webm,.mov,.mkv"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => videoFileInputRef.current?.click()}
                      className="p-4 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl bg-blue-50/40 hover:bg-blue-50 transition-all cursor-pointer text-center space-y-1.5"
                    >
                      {uploadingFile ? (
                        <div className="space-y-2 py-2">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                          <p className="text-xs font-bold text-blue-700">Uploading Movie File... {uploadProgress}%</p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Film className="w-8 h-8 text-blue-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-800">Click to select video file</p>
                          <p className="text-[10px] text-slate-500">Supports MP4, WEBM, MOV (Max 100MB)</p>
                        </>
                      )}
                    </div>

                    {/* Dynamic Video Thumbnail Generation Status Indicator & Regeneration Button */}
                    <div className="mt-2 space-y-2">
                      {generatingThumbnail && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-bold animate-pulse">
                          <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                          <span>Generating video thumbnail...</span>
                        </div>
                      )}

                      {!generatingThumbnail && thumbnailGenerated && (
                        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Video Thumbnail Generated</span>
                          </div>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-md">Auto-Snapshot</span>
                        </div>
                      )}

                      {videoUrl && (
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-blue-800 font-bold truncate">
                            <Video className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">Movie File Ready</span>
                          </div>
                          <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded-md">Attached</span>
                        </div>
                      )}

                      {(currentVideoFile || videoUrl) && (
                        <button
                          type="button"
                          onClick={handleManualRegenerateFrame}
                          disabled={generatingThumbnail || uploadingFile}
                          className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${generatingThumbnail ? 'animate-spin' : ''}`} />
                          <span>🎬 Regenerate Video Frame Thumbnail</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Thumbnail Image Upload Component with showUrlInput={false} */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Custom Thumbnail Upload
                    </label>
                    {uploadMode === 'url' && videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const ytThumb = extractYouTubeThumbnail(videoUrl);
                          if (ytThumb) {
                            setThumbnailUrl(ytThumb);
                          } else {
                            alert('No YouTube video ID found in URL.');
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ Auto-Fetch YouTube Thumbnail
                      </button>
                    )}
                  </div>

                  {!thumbnailUrl && (
                    <ImageUpload
                      currentImage={thumbnailUrl}
                      onImageChange={(newUrl) => {
                        setThumbnailUrl(newUrl || '');
                        setThumbnailGenerated(false);
                      }}
                      folder="peptalk-thumbnails"
                      showUrlInput={false}
                      className="mb-2"
                    />
                  )}
                </div>

                {/* Retained Single High-Contrast Thumbnail Preview Card with Controls */}
                {thumbnailUrl && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Thumbnail Preview
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailUrl('');
                            setThumbnailGenerated(false);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                        >
                          ✕ Remove Image
                        </button>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {thumbnailUrl.includes('img.youtube.com') ? 'YouTube Auto-Thumbnail' : 'Image Active'}
                        </span>
                      </div>
                    </div>

                    <div className="h-32 w-full rounded-xl overflow-hidden border-2 border-slate-300 bg-slate-950 shadow-inner relative group">
                      <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailUrl('');
                            setThumbnailGenerated(false);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                        >
                          Change Thumbnail
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="md:col-span-12 flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
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
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-900">No Video Guides Found</h4>
          <p className="text-slate-500 text-xs mt-1">
            {searchQuery ? 'No video guides matching your query' : 'Upload educational video files or YouTube tutorials to display in the customer center.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(v => (
            <div key={v.id} className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div>
                {/* Thumbnail Preview */}
                <div className="relative w-full h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-950 flex items-center justify-center">
                      <Film className="w-10 h-10 text-slate-600 opacity-50" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                    {v.category}
                  </span>
                  <a
                    href={v.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/90 group-hover:scale-110 flex items-center justify-center shadow-lg transition-transform">
                      <Play className="w-5 h-5 fill-blue-600 text-blue-600 ml-0.5" />
                    </div>
                  </a>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-1">{v.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-3">{v.description}</p>
                  
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(v.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                <a
                  href={v.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Watch Video
                </a>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(v)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
