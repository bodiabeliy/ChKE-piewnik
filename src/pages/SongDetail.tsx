import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites';

interface SongDetails {
  title: string;
  lyrics: string;
  audioUrl?: string;
  youtubeUrl?: string;
}

export function SongDetail() {
  const { id } = useParams();
  const { favorites, toggleFavorite } = useFavorites();
  const [song, setSong] = useState<SongDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    fetch(`/api/songs/${encodeURIComponent(id)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
         // Some cleanup just in case there's leftover text from extraction
         if (data.lyrics) {
           data.lyrics = data.lyrics.replace(/Drukuj/g, '').replace(/E-mail/g, '').replace(/\[NUTY\]/g, '');
           data.lyrics = data.lyrics.trim();
         }
         setSong(data);
         setLoading(false);
      })
      .catch(err => {
         console.error(err);
         setError(true);
         setLoading(false);
      });
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Link 
        to="/" 
        className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors mb-8 group"
      >
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Wróć do spisu
      </Link>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Wczytywanie tekstu...</p>
        </div>
      ) : error || !song ? (
        <div className="text-center py-20 text-red-500">
          <p>Nie udało się pobrać tekstu piosenki.</p>
          <p className="text-sm mt-2 text-stone-500">Sprawdź połączenie z internetem.</p>
        </div>
      ) : (
        <article className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-stone-200">
          <div className="border-b border-stone-100 mb-8 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
              {song.title || 'Nieznany tytuł'}
            </h1>
          </div>

          {/* Media Player Section */}
          {(song.audioUrl || song.youtubeUrl) && (
            <div className="mb-10 space-y-4 pt-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Nagranie</h2>
              {song.audioUrl && (
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                  <audio controls className="w-full h-10 outline-none" src={song.audioUrl} preload="none">
                    Twoja przeglądarka nie obsługuje odtwarzacza audio.
                  </audio>
                </div>
              )}
              
              {song.youtubeUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-stone-100 shadow-sm border border-stone-200">
                  <iframe 
                    src={song.youtubeUrl.replace('watch?v=', 'embed/')} 
                    title="YouTube video player" 
                    className="absolute top-0 left-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="prose prose-stone max-w-none space-y-6">
            {song.lyrics.split('\n\n').filter(p => p.trim() !== '').map((paragraph, i) => (
              <p key={i} className="text-stone-800 leading-relaxed whitespace-pre-wrap break-words text-[14px] sm:text-[15px] font-mono bg-stone-50/50 p-4 sm:p-6 rounded-xl border border-stone-100 shadow-sm">
                {paragraph}
              </p>
            ))}
            
            {(!song.lyrics || song.lyrics.length < 5) && (
              <p className="text-stone-400 italic">Brak tekstu dla tej pieśni w źródle.</p>
            )}
          </div>
        </article>
      )}
    </motion.div>
  );
}
