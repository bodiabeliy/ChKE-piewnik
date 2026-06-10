import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ADMIN_CONFIG_PATH = path.join(process.cwd(), 'data', 'adminConfig.json');

async function getAdminConfig() {
  try {
    const data = await fs.readFile(ADMIN_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { hiddenSongs: [], editedSongs: {}, customSongbooks: [] };
  }
}

async function saveAdminConfig(config: any) {
  try {
    await fs.mkdir(path.dirname(ADMIN_CONFIG_PATH), { recursive: true });
    await fs.writeFile(ADMIN_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save config', err);
  }
}

// In-memory cache for songs
let songsCache: { id: string; title: string; source: string; url: string }[] = [];
let songDetailsCache: Record<string, { title: string; lyrics: string }> = {};

async function scrapeMiastoNaGorze() {
  try {
    const res = await axios.get('https://miastonagorze.pl/spiewnik/');
    const $ = cheerio.load(res.data);
    const newSongs: typeof songsCache = [];
    
    // Select all links in the main content area (e.g., typical elementor wrappers)
    $('.elementor-widget-container a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      // Filter out obvious non-song links
      if (href && text && text.length > 2 && href.includes('miastonagorze.pl') && !href.includes('/kategoria/')) {
        // Exclude navigation items
        const excludeKeywords = ['Poznaj nas', 'Aktualności', 'Kontakt', 'Wesprzyj', 'Logowanie', 'Służby', 'Kurs Alpha', 'Świadectwa', 'Konferencje', 'Zainspiruj się', 'Miecz Ducha', 'Klub ARKA', 'Odpowiedzialni'];
        if (!excludeKeywords.some(kw => text.includes(kw))) {
           const id = Buffer.from(href).toString('base64');
           newSongs.push({ id, title: text, source: 'miastonagorze', url: href });
        }
      }
    });
    
    // filter unique
    const unique = new Map();
    newSongs.forEach(s => unique.set(s.url, s));
    return Array.from(unique.values()).filter(s => s.title !== 'Śpiewnik');
  } catch (err) {
    console.error('Error scraping miastonagorze:', err);
    return [];
  }
}

async function scrapeGiszowiec() {
  const letters = ['a', 'b', 'c', 'd', 'e-f', 'g', 'h', 'i', 'j', 'k', 'l-l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u-v', 'w-y', 'z'];
  const newSongs: typeof songsCache = [];
  
  // Scrape sequentially to not overload
  for (const letter of letters) {
    try {
      const res = await axios.get(`https://www.giszowiec.org/spiewnik/${letter}`);
      const $ = cheerio.load(res.data);
      $('.item-page a, .blog a, table a, .category-list a, .list-striped a, .table-striped a, #adminForm a').each((i, el) => {
         const href = $(el).attr('href');
         const text = $(el).text().trim();
         if (href && text && href.includes('/spiewnik/') && !href.includes('Itemid=') && text.length > 2) {
             const fullUrl = href.startsWith('http') ? href : `https://www.giszowiec.org${href}`;
             const id = Buffer.from(fullUrl).toString('base64');
             newSongs.push({ id, title: text, source: 'giszowiec', url: fullUrl });
         }
      });
    } catch (err: any) {
      console.error(`Error scraping giszowiec letter ${letter}:`, err.message);
    }
  }
  
  const unique = new Map();
  newSongs.forEach(s => unique.set(s.url, s));
  return Array.from(unique.values());
}

async function scrapeGenericSongbook(url: string) {
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const newSongs: typeof songsCache = [];
    
    // try to find links that look like songs
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text && text.length > 2) {
           const exclude = ['kontakt', 'o nas', 'strona główna', 'zaloguj', 'home', 'kategoria', 'tag'];
           if (!exclude.some(kw => text.toLowerCase().includes(kw)) && !href.includes('#')) {
               const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
               const id = Buffer.from(fullUrl).toString('base64');
               try {
                 newSongs.push({ id, title: text, source: new URL(url).hostname, url: fullUrl });
               } catch (e) {} // ignore invalid urls
           }
        }
    });
    
    const unique = new Map();
    newSongs.forEach(s => unique.set(s.url, s));
    return Array.from(unique.values());
  } catch(err) {
    console.error('Error scraping custom songbook:', url);
    return [];
  }
}

async function populateCache(force = false) {
  if (songsCache.length > 0 && !force) return;
  console.log('Populating songs cache...');
  const adminConfig = await getAdminConfig();
  
  const customPromises = (adminConfig.customSongbooks || []).map(scrapeGenericSongbook);
  const results = await Promise.all([
    scrapeMiastoNaGorze(),
    scrapeGiszowiec(),
    ...customPromises
  ]);
  songsCache = results.flat();
  console.log(`Cache populated with ${songsCache.length} songs.`);
}

app.get('/api/songs', async (req, res) => {
  await populateCache();
  const adminConfig = await getAdminConfig();
  const hidden = new Set(adminConfig.hiddenSongs || []);
  const edited = adminConfig.editedSongs || {};
  
  let visible = songsCache.filter(s => !hidden.has(s.id));
  visible = visible.map(s => {
    if (edited[s.id] && edited[s.id].title) {
      return { ...s, title: edited[s.id].title };
    }
    return s;
  });
  
  res.json(visible);
});

app.get('/api/songs/:id', async (req, res) => {
  const id = req.params.id;
  if (songDetailsCache[id]) {
    return res.json(songDetailsCache[id]);
  }
  
  const url = Buffer.from(id, 'base64').toString('ascii');
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    let lyrics = '';
    let title = '';
    let audioUrl = '';
    let youtubeUrl = '';
    
    // Extract media
    $('audio').each((i, el) => {
      if (!audioUrl) {
        audioUrl = $(el).attr('src') || $(el).find('source').attr('src') || '';
      }
    });
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('youtube.com')) {
        youtubeUrl = src;
      }
    });
    
    if (url.includes('miastonagorze.pl')) {
      title = $('h1').first().text().trim() || $('h2').first().text().trim();
      const content = $('.elementor-widget-text-editor, .elementor-text-editor');
      content.find('br').replaceWith('\n');
      content.find('p, div, li').each((i, el) => {
        $(el).prepend('\n');
        $(el).append('\n');
      });
      lyrics = content.text().trim();
    } else {
      title = $('.page-header h1, .item-page-title, .page-header h2, .item-page h2').first().text().trim();
      const content = $('.item-page');
      
      // Remove unwanted elements like print, email buttons, and 'Drukuj', 'E-mail' text
      content.find('.actions, .buttonheading, .print-icon, .email-icon, div.btn-group').remove();
      
      content.find('br').replaceWith('\n');
      content.find('p, div, li').each((i, el) => {
        $(el).prepend('\n');
        $(el).append('\n');
      });
      
      lyrics = content.text().trim();
      
      // Clean up common artifacts string replacements
      lyrics = lyrics.replace(/Drukuj/g, '').replace(/E-mail/g, '').replace(/\[NUTY\]/g, '');
      lyrics = lyrics.replace(/Piosenka z.? śpiewnika:/gi, '');
      lyrics = lyrics.replace(/WIĘCEJ\s*»/gi, '');
      lyrics = lyrics.replace(/\u00A0/g, ' '); // replace non-breaking spaces with normal spaces
      
      // Remove the title from lyrics if it's there
      if (lyrics.startsWith(title)) {
        lyrics = lyrics.replace(title, '').trim();
      }
    }
    
    // basic cleanup removing extra newlines
    lyrics = lyrics.replace(/\t/g, ' ');
    lyrics = lyrics.replace(/\u00A0/g, ' ');
    lyrics = lyrics.replace(/\n([ \t]*\n){2,}/g, '\n\n').trim();
    
    // Apply admin overrides
    const adminConfig = await getAdminConfig();
    if (adminConfig.editedSongs && adminConfig.editedSongs[id]) {
        const edits = adminConfig.editedSongs[id];
        if (edits.title) title = edits.title;
        if (edits.lyrics) lyrics = edits.lyrics;
    }
    
    songDetailsCache[id] = { title, lyrics, audioUrl, youtubeUrl } as any;
    res.json(songDetailsCache[id]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch song details' });
  }
});

// Admin API
app.get('/api/admin/config', async (req, res) => {
  const config = await getAdminConfig();
  res.json(config);
});

app.get('/api/admin/songs', async (req, res) => {
  await populateCache();
  
  // Return all with their original titles + override titles
  const adminConfig = await getAdminConfig();
  const hidden = new Set(adminConfig.hiddenSongs || []);
  const edited = adminConfig.editedSongs || {};
  
  const all = songsCache.map(s => {
    return {
      ...s,
      isHidden: hidden.has(s.id),
      editedTitle: edited[s.id]?.title,
    };
  });
  
  res.json(all);
});

app.post('/api/admin/config', async (req, res) => {
  const newConfig = req.body;
  await saveAdminConfig(newConfig);
  // Clear details cache to refresh strings
  songDetailsCache = {};
  res.json({ success: true });
});

app.post('/api/admin/refresh', async (req, res) => {
  await populateCache(true);
  res.json({ success: true, count: songsCache.length });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    populateCache(); // start fetching in background
  });
}

startServer();
