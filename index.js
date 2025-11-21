import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, './public')));
app.use('/admin', express.static(join(__dirname, './admin')));

// Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Инициализация базы данных
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  // Таблицы
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    project_type TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT UNIQUE NOT NULL,
    title TEXT,
    content TEXT,
    image_url TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Админы
  const adminPassword = process.env.ADMIN_PASSWORD;
  const admin2Password = process.env.ADMIN2_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD не установлен');
    process.exit(1);
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  const hashedPassword2 = bcrypt.hashSync(admin2Password || 'thklty13', 10);

  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, ['admin', hashedPassword]);
  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, ['admin2', hashedPassword2]);

  // Инициализация секций контента (если их ещё нет)
  const sections = ['hero_title', 'hero_subtitle', 'services', 'portfolio', 'contact_info'];
  sections.forEach(sec => {
    db.run(
      `INSERT OR IGNORE INTO site_content (section, title, content) VALUES (?, ?, ?)`,
      [sec, sec, (sec === 'services' || sec === 'portfolio') ? '[]' : '{}']
    );
  });
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Токен доступа отсутствует' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = user;
    next();
  });
};

// ================= API =================

// Contact
app.post('/api/contact', (req, res) => {
  const { name, email, project, message } = req.body;
  if (!name || !email || !project) return res.status(400).json({ error: 'Заполните обязательные поля' });

  db.run(
    `INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)`,
    [name, email, project, message],
    function(err) {
      if (err) return res.status(500).json({ error: 'Ошибка при сохранении сообщения' });
      res.json({ success: true, message: 'Сообщение успешно отправлено!', id: this.lastID });
    }
  );
});

// Messages
app.get('/api/messages', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM messages ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении сообщений' });
    res.json(rows);
  });
});

app.put('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run(`UPDATE messages SET status = ? WHERE id = ?`, [status, id], function(err) {
    if (err) return res.status(500).json({ error: 'Ошибка при обновлении сообщения' });
    res.json({ success: true, message: 'Статус обновлен' });
  });
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM messages WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: 'Ошибка при удалении сообщения' });
    res.json({ success: true, message: 'Сообщение удалено' });
  });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM admins WHERE username = ?`, [username], (err, admin) => {
    if (err || !admin) return res.status(401).json({ error: 'Неверные учетные данные' });

    if (bcrypt.compareSync(password, admin.password)) {
      const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: 'Неверные учетные данные' });
    }
  });
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Контент
app.get('/api/content', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM site_content`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении контента' });
    res.json(rows);
  });
});

app.get('/api/content/:section', authenticateToken, (req, res) => {
  const { section } = req.params;
  db.get(`SELECT * FROM site_content WHERE section = ?`, [section], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Секция не найдена' });
    res.json(row);
  });
});

app.put('/api/content/:section', authenticateToken, (req, res) => {
  const { section } = req.params;
  const { title, content } = req.body;
  db.run(
    `UPDATE site_content SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE section = ?`,
    [title, content, section],
    function(err) {
      if (err) return res.status(500).json({ error: 'Ошибка при обновлении контента' });
      res.json({ success: true, message: 'Контент обновлен' });
    }
  );
});

// Публичный контент
app.get('/api/public/content', (req, res) => {
  db.all(`SELECT section, content FROM site_content`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении контента' });

    const content = {};
    rows.forEach(row => {
      try { content[row.section] = JSON.parse(row.content); }
      catch { content[row.section] = row.content; }
    });
    res.json(content);
  });
});

// ================= Запуск сервера =================
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Основной сайт: http://localhost:${PORT}`);
  console.log(`Админ-панель: http://localhost:${PORT}/admin`);
});
