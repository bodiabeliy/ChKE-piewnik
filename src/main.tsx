import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nowa wersja śpiewnika jest dostępna. Odświeżyć?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Śpiewnik jest gotowy do działania w trybie offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
