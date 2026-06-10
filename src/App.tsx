import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SongList } from './pages/SongList';
import { SongDetail } from './pages/SongDetail';
import { Admin } from './pages/Admin';
import Logo from '../public/logo.jpg';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <header className="bg-white shadow-sm border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-800">
                <img src={Logo} alt="Logo" />
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
