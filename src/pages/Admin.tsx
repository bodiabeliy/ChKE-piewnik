import { useState, useEffect } from 'react';
import { Loader2, Save, X, Eye, EyeOff, Edit2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminSong {
  id: string;
  title: string;
  source: string;
  url: string;
  isHidden: boolean;
  editedTitle?: string;
}

interface AdminConfig {
  hiddenSongs: string[];
  editedSongs: Record<string, { title?: string; lyrics?: string }>;
  customSongbooks: string[];
}

export function Admin() {
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editingSong, setEditingSong] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add custom URL
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [songsRes, configRes] = await Promise.all([
        fetch('/api/admin/songs'),
        fetch('/api/admin/config')
      ]);
      setSongs(await songsRes.json());
      setConfig(await configRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: AdminConfig) => {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setConfig(newConfig);
      // update local songs state to reflect new visibility
      setSongs(prev => prev.map(s => ({
        ...s,
        isHidden: newConfig.hiddenSongs.includes(s.id),
        editedTitle: newConfig.editedSongs[s.id]?.title
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (id: string) => {
    if (!config) return;
    const isHidden = config.hiddenSongs.includes(id);
    const newHidden = isHidden 
      ? config.hiddenSongs.filter(x => x !== id)
      : [...config.hiddenSongs, id];
    saveConfig({ ...config, hiddenSongs: newHidden });
  };

  const openEditor = async (id: string) => {
    setEditingSong(id);
    setLoadingDetails(true);
    setEditTitle('');
    setEditLyrics('');
    try {
      const res = await fetch(`/api/songs/${encodeURIComponent(id)}`);
      const details = await res.json();
      setEditTitle(details.title || '');
      setEditLyrics(details.lyrics || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const saveEdits = () => {
    if (!config || !editingSong) return;
    const newEdited = { ...config.editedSongs };
    newEdited[editingSong] = {
      ...(newEdited[editingSong] || {}),
      title: editTitle,
      lyrics: editLyrics
    };
    saveConfig({ ...config, editedSongs: newEdited });
    setEditingSong(null);
  };

  const addCustomLink = () => {
    if (!config || !newUrl.trim()) return;
    if (config.customSongbooks.includes(newUrl.trim())) return;
    
    saveConfig({ 
      ...config, 
      customSongbooks: [...config.customSongbooks, newUrl.trim()] 
    });
    setNewUrl('');
  };

  const removeCustomLink = (url: string) => {
    if (!config) return;
    saveConfig({
      ...config,
      customSongbooks: config.customSongbooks.filter(u => u !== url)
    });
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/admin/refresh', { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Wczytywanie ustawień...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Panel Administracyjny</h1>
          <p className="text-stone-500 mt-1">Zarządzaj widocznością i edytuj teksty</p>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Odświeżanie...' : 'Odśwież Listę'}
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-stone-200">
        <h2 className="text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <LinkIcon className="flex-shrink-0 w-5 h-5" />
          Dodatkowe linki do śpiewników
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://example.com/spiewnik"
            className="w-full sm:flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-stone-500 outline-none"
          />
          <button
            onClick={addCustomLink}
            disabled={!newUrl.trim() || saving}
            className="w-full sm:w-auto px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Dodaj
          </button>
        </div>
        {config?.customSongbooks && config.customSongbooks.length > 0 && (
          <ul className="space-y-2 mt-4">
            {config.customSongbooks.map(u => (
              <li key={u} className="flex justify-between items-center bg-stone-50 px-4 py-2 rounded-lg text-sm text-stone-600">
                <span className="truncate mr-4">{u}</span>
                <button onClick={() => removeCustomLink(u)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200">
          <h2 className="font-semibold text-stone-800">Baza pieśni ({songs.length})</h2>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 border-b border-stone-200 z-10">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-stone-500">Tytuł</th>
                <th className="px-5 py-3 text-sm font-medium text-stone-500 w-32">Źródło</th>
                <th className="px-5 py-3 text-sm font-medium text-stone-500 w-24 text-center">Widoczność</th>
                <th className="px-5 py-3 text-sm font-medium text-stone-500 w-20 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {songs.map(song => (
                <tr key={song.id} className={`hover:bg-stone-50/50 transition-colors ${song.isHidden ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-stone-800">
                      {song.editedTitle || song.title || 'Brak tytułu'}
                      {song.editedTitle && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Zmieniono</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-stone-500 uppercase">{song.source}</td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggleVisibility(song.id)}
                      className={`p-2 rounded-lg transition-colors ${song.isHidden ? 'bg-stone-200 text-stone-500 hover:bg-stone-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      title={song.isHidden ? 'Pokaż pieśń' : 'Ukryj pieśń'}
                    >
                      {song.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => openEditor(song.id)}
                      className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                      title="Edytuj tekst"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editingSong && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold text-stone-800">Edycja pieśni</h2>
              <button 
                onClick={() => setEditingSong(null)} 
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingDetails ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Tytuł</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-stone-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Tekst (zachowaj zwrotki oddzielone pustą linią)</label>
                    <textarea
                      value={editLyrics}
                      onChange={e => setEditLyrics(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-stone-500 outline-none resize-y"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setEditingSong(null)}
                className="px-5 py-2 text-stone-600 hover:bg-stone-200 rounded-xl transition-colors font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={saveEdits}
                disabled={loadingDetails}
                className="flex items-center gap-2 px-5 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Zapisz zmiany
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
