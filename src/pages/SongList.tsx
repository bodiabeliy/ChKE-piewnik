import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites';

export interface Song {
  id: string;
  title: string;
  source: string;
  url: string;
}

export function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { favorites, toggleFavorite } = useFavorites();
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => {
        // Sort alphabetically
        data.sort((a: Song, b: Song) => a.title.localeCompare(b.title, 'pl'));
        setSongs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load songs:', err);
        setLoading(false);
      });
  }, []);

  const [visibleCount, setVisibleCount] = useState(20);

  const filteredSongs = useMemo(() => {
    let result = songs;
    if (showOnlyFavorites) {
      result = result.filter(s => favorites.includes(s.id));
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(query));
    }
    return result;
  }, [songs, search, showOnlyFavorites, favorites]);

  const visibleSongs = useMemo(() => {
    return filteredSongs.slice(0, visibleCount);
  }, [filteredSongs, visibleCount]);

  const groupedVisibleSongs = useMemo(() => {
    const groups: { letter: string; songs: Song[] }[] = [];
    let currentLetter = '';
    
    // Create a copy to sort, wait visibleSongs are already sorted overall, 
    // but we can just group sequentially since it's pre-sorted.
    visibleSongs.forEach(song => {
      let firstLetter = song.title.trim().charAt(0).toUpperCase();
      if (!/[A-ZŚĆŹŻĄĘŁÓŃ]/.test(firstLetter)) {
        firstLetter = '#';
      }
      
      // Since data is sorted locale-aware, A and Ą might interleave or follow each other.
      // E.g. 'A' then 'Ą' then 'A' is unlikely but possible due to localeCompare rules depending on the exact string.
      // To strictly avoid splitting groups, we can find if the group already exists.
      let group = groups.find(g => g.letter === firstLetter);
      if (!group) {
        group = { letter: firstLetter, songs: [] };
        groups.push(group);
      }
      group.songs.push(song);
    });
    
    return groups;
  }, [visibleSongs]);

  useEffect(() => {
    // Reset count when search changes
    setVisibleCount(20);
  }, [search, showOnlyFavorites]);

  // Lazy loading on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 200
      ) {
        setVisibleCount(prev => Math.min(prev + 20, filteredSongs.length));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredSongs.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <AnimatePresence>
        {loading && (
          <motion.div 
            className="fixed inset-0 z-50 bg-stone-50 flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
              className="text-3xl font-serif font-medium text-stone-800 mb-6 flex items-center justify-center gap-3"
            >
              <span className="text-4xl">†</span>
              <span>ChKE Śpiewnik</span>
            </motion.div>
            <div className="flex items-center gap-3 text-stone-400 font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Wczytywanie pieśni...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-stone-50/95 backdrop-blur-sm pb-4 pt-4 -mt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-stone-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-stone-300 rounded-xl leading-5 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition-all shadow-sm"
              placeholder="Szukaj pieśni (np. Abba Ojcze)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowOnlyFavorites(prev => !prev)}
            className={`px-4 rounded-xl border flex items-center justify-center transition-colors ${showOnlyFavorites ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-stone-300 text-stone-400 hover:text-stone-600 hover:bg-stone-50 shadow-sm'}`}
            title="Pokaż tylko ulubione"
          >
            <Heart className={`w-5 h-5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
          </button>
        </div>
        {!loading && (
          <div className="text-sm text-stone-500 font-medium whitespace-nowrap bg-stone-100 px-4 py-2 rounded-lg border border-stone-200">
            {showOnlyFavorites 
              ? (search.trim() ? `Znalezione ulubione: ${filteredSongs.length}` : `Ulubione pieśni: ${filteredSongs.length}`)
              : (search.trim() ? `Znaleziono: ${filteredSongs.length}` : `Wszystkie pieśni: ${songs.length}`)
            }
          </div>
        )}
      </div>

      <div className="space-y-8">
        {groupedVisibleSongs.length > 0 ? (
            groupedVisibleSongs.map(group => (
              <div key={group.letter} className="space-y-4">
                <h2 className="text-xl font-bold bg-stone-100/50 text-stone-400 px-4 py-2 rounded-lg inline-block">{group.letter}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.songs.map(song => (
                    <div key={song.id}>
                      <Link
                        to={`/song/${encodeURIComponent(song.id)}`}
                        className="block p-5 bg-white rounded-xl border border-stone-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-stone-300 transition-all active:scale-[0.99] relative group"
                      >
                        <div className="pr-8">
                          <h3 className="font-medium text-stone-800 line-clamp-1 group-hover:text-stone-900 transition-colors">{song.title || 'Nieznany tytuł'}</h3>
                          <p className="text-xs text-stone-500 mt-1 capitalize">{song.source}</p>
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(song.id, e)}
                          className="absolute top-4 right-3 p-1.5 rounded-full text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label={favorites.includes(song.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                        >
                          <Heart className={`w-5 h-5 ${favorites.includes(song.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-stone-500">
              {search.trim() ? `Nie znaleziono pieśni pasujących do "${search}"` : (showOnlyFavorites ? "Nie masz jeszcze dodanych ulubionych pieśni." : "Brak pieśni.")}
            </div>
          )}
        </div>
    </motion.div>
  );
}
