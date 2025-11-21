// Создание таблицы контента
db.run(`CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Начальные данные
const initialContent = [
  { title: 'hero_title', content: 'We craft premium logos, posters, social content, promo videos & 3D visuals.' },
  { title: 'hero_subtitle', content: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.' },
  { title: 'services', content: '[]' },
  { title: 'portfolio', content: '[]' },
  { title: 'contact_info', content: '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}' }
];

initialContent.forEach(item => {
  db.run(
    'INSERT OR IGNORE INTO content (title, content) VALUES (?, ?)',
    [item.title, item.content]
  );
});