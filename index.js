import dotenv from 'dotenv';
import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));

// Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database
const dbPath = './database.db';
const db = new sqlite3.Database(dbPath);

// Init DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT, project_type TEXT, message TEXT,
    status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE, content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE, password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Default content
  const defaultContent = [
    ['hero_title', 'We craft premium logos, posters, social content, promo videos & 3D visuals.'],
    ['hero_subtitle', 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'],
    ['services', '[]'],
    ['portfolio', '[]'],
    ['contact_info', '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}']
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO content (title, content) VALUES (?, ?)');
  defaultContent.forEach(([title, content]) => stmt.run(title, content));
  stmt.finalize();

  // Default admin
  const hash = bcrypt.hashSync('admin123', 10);
  db.run('INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)', ['admin', hash]);
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  db.get('SELECT * FROM admin WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  });
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/admin/create', authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT OR REPLACE INTO admin (username, password) VALUES (?, ?)', [username, hash], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create admin' });
    res.json({ success: true, message: 'Admin created', username, id: this.lastID });
  });
});

// Messages
app.get('/api/messages', authenticateToken, (req, res) => {
  db.all('SELECT * FROM messages ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch messages' });
    res.json(rows);
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, project, message } = req.body;
  if (!name || !email || !project) return res.status(400).json({ error: 'Name, email and project required' });

  db.run('INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)', 
    [name, email, project, message || ''], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to save message' });
    res.json({ success: true, message: 'Message sent', id: this.lastID });
  });
});

app.put('/api/messages/:id', authenticateToken, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });

  db.run('UPDATE messages SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update message' });
    res.json({ success: true, message: 'Message updated' });
  });
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM messages WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to delete message' });
    res.json({ success: true, message: 'Message deleted' });
  });
});

// Content
app.get('/api/content/:section', authenticateToken, (req, res) => {
  db.get('SELECT * FROM content WHERE title = ?', [req.params.section], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch content' });
    res.json(row || { content: '' });
  });
});

app.put('/api/content/:section', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  db.run('INSERT OR REPLACE INTO content (title, content) VALUES (?, ?)', [req.params.section, content], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update content' });
    res.json({ success: true });
  });
});

app.get('/api/public/content/:section', (req, res) => {
  db.get('SELECT * FROM content WHERE title = ?', [req.params.section], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch content' });
    res.json(row || { content: '' });
  });
});

app.get('/api/admin/content', authenticateToken, (req, res) => {
  db.all('SELECT * FROM content ORDER BY title', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch content' });
    res.json(rows);
  });
});

// Upload
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server working!', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Main site: http://localhost:${PORT}`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
});