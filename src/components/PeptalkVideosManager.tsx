import React, { useState, useEffect } from 'react';
import { Video, Plus, Edit, Trash2, Play, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('Reconstitution');

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

  const handleEdit = (vid: VideoItem) => {
    setEditingVideoId(vid.id);
    setTitle(vid.title);
    setDescription(vid.description);
    setVideoUrl(vid.video_url);
    setThumbnailUrl(vid.thumbnail_url);
    setCategory(vid.category);
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
      alert('Video guide saved successfully!');
    } catch (err: any) {
      alert(`Failed to save video guide: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header action panel */}
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-150 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Film className="w-4 h-4 text-blue-650" />
          PepTalk Educational Video Center Panel
        </h3>

        <button
          onClick={() => {
            setEditingVideoId(null);
            setTitle('');
            setDescription('');
            setVideoUrl('');
            setThumbnailUrl('');
            setCategory('Reconstitution');
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {isFormOpen ? 'Close Form' : 'Upload New Video'}
        </button>
      </div>

      {/* Upload / Edit Form */}
      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow border border-slate-150 p-6 space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">
            {editingVideoId ? 'Edit Educational Video' : 'Add Educational Video'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Video Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to Reconstitute Semaglutide"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category tag *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                required
              >
                <option value="Reconstitution">Reconstitution Guides</option>
                <option value="Dosing">Dosing Protocols</option>
                <option value="Storage">Storage & Handling</option>
                <option value="Faqs">Frequently Asked Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Video Stream / YouTube URL *</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Thumbnail Cover Image URL</label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/thumbnail.png"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Video Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Explain what this tutorial covers..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Save Guide
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Videos List Grid */}
      {videos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-slate-150 p-12 text-center">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-slate-800">No Video Guides Posted Yet</h4>
          <p className="text-slate-400 text-xs mt-1">Upload educational video files or YouTube tutorials to display in the customer center.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(v => (
            <div key={v.id} className="bg-white rounded-2xl shadow border border-slate-150 overflow-hidden flex flex-col justify-between hover:border-slate-350 transition-all">
              <div>
                {/* Thumbnail Preview */}
                <div className="relative w-full h-40 bg-slate-900 flex items-center justify-center">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover opacity-85" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-950 opacity-80" />
                  )}
                  <span className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {v.category}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-slate-800 text-slate-800 ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{v.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{v.description}</p>
                </div>
              </div>

              <div className="p-4 pt-0 flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(v)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-650 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
