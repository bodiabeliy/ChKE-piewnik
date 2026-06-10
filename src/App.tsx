import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SongList } from './pages/SongList';
import { SongDetail } from './pages/SongDetail';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <header className="bg-white shadow-sm border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18M7 8h10"/>
                </svg>
              </div>
              <h1 className="text-xl font-medium tracking-tight text-stone-800">ChKE Śpiewnik</h1>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<SongList />} />
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
