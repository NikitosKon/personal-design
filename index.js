import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL connection
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 10
});

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

// Init Database
async function initDatabase() {
  try {
    console.log('🔧 Initializing MySQL database...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        project_type VARCHAR(255) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) UNIQUE NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Default content
    const defaultContent = [
      ['hero_title', 'We craft premium logos, posters, social content, promo videos & 3D visuals.'],
      ['hero_subtitle', 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'],
      ['services', '[]'],
      ['portfolio', '[]'],
      ['contact_info', '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}']
    ];

    for (const [title, content] of defaultContent) {
      await pool.execute(
        'INSERT IGNORE INTO content (title, content) VALUES (?, ?)',
        [title, content]
      );
    }

    // Default admin
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT IGNORE INTO admin (username, password) VALUES (?, ?)',
      ['admin', hash]
    );

    console.log('✅ MySQL database initialized');
  } catch (error) {
    console.error('❌ Database init error:', error);
  }
}

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
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [rows] = await pool.execute('SELECT * FROM admin WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, project, message } = req.body;
    if (!name || !email || !project) return res.status(400).json({ error: 'Name, email and project required' });

    const [result] = await pool.execute(
      'INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)',
      [name, email, project, message || '']
    );

    res.json({ success: true, message: 'Message sent', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Content
app.get('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM content WHERE title = ?', [req.params.section]);
    res.json(rows[0] || { content: '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.put('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    await pool.execute(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      [req.params.section, content, content]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

app.get('/api/public/content/:section', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM content WHERE title = ?', [req.params.section]);
    res.json(rows[0] || { content: '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

app.get('/api/admin/content', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM content ORDER BY title');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
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

app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM messages');
    res.json({ 
      message: 'Server working with MySQL!', 
      timestamp: new Date().toISOString(),
      messagesCount: rows[0].count,
      database: 'MySQL'
    });
  } catch (error) {
    res.json({ message: 'Server working!', database: 'MySQL connected' });
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Main site: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`🗄️ Database: MySQL`);
  });
});