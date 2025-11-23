import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getPool } from './database.js';
import uploadRoutes from './routes/upload.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));
app.use('/uploads', express.static('uploads'));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
};

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);

// Content routes
app.get('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const section = req.params.section;
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM content WHERE title = ?', [section]);
    
    if (rows.length === 0) {
      return res.json({ content: '' });
    }
    
    res.json({ content: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

app.put('/api/content/:section', authenticateToken, async (req, res) => {
  try {
    const section = req.params.section;
    const { content } = req.body;
    
    const db = await getPool();
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      [section, content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

// Public content
app.get('/api/public/content/:key', async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM content WHERE title = ?', [req.params.key]);
    
    if (rows.length === 0) {
      return res.json({ value: '' });
    }
    
    res.json({ value: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, project, message } = req.body;
    if (!name || !email || !project) {
      return res.status(400).json({ error: 'Name, email and project required' });
    }

    const db = await getPool();
    const [result] = await db.query(
      'INSERT INTO messages (name, email, project_type, message) VALUES (?, ?, ?, ?)',
      [name, email, project, message || '']
    );
    
    res.json({ success: true, message: 'Message sent', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/api/content/hero', authenticateToken, async (req, res) => {
  try {
    const db = await getPool();
    
    // Загружаем оба поля для hero секции
    const [titleRow] = await db.query('SELECT * FROM content WHERE title = ?', ['hero_title']);
    const [subtitleRow] = await db.query('SELECT * FROM content WHERE title = ?', ['hero_subtitle']);
    
    res.json({ 
      hero_title: titleRow[0]?.content || '',
      hero_subtitle: subtitleRow[0]?.content || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load hero content' });
  }
});

app.get('/api/content/services', authenticateToken, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM content WHERE title = ?', ['services']);
    
    if (rows.length === 0) {
      return res.json({ content: '[]' });
    }
    
    res.json({ content: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

app.get('/api/content/portfolio', authenticateToken, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM content WHERE title = ?', ['portfolio']);
    
    if (rows.length === 0) {
      return res.json({ content: '[]' });
    }
    
    res.json({ content: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

app.get('/api/content/contact', authenticateToken, async (req, res) => {
  try {
    const db = await getPool();
    const [rows] = await db.query('SELECT * FROM content WHERE title = ?', ['contact_info']);
    
    if (rows.length === 0) {
      return res.json({ content: '{}' });
    }
    
    res.json({ content: rows[0].content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load contact info' });
  }
});

// PUT роуты для каждого раздела админки
app.put('/api/content/hero_title', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const db = await getPool();
    
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      ['hero_title', content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save hero title' });
  }
});

app.put('/api/content/hero_subtitle', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const db = await getPool();
    
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      ['hero_subtitle', content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save hero subtitle' });
  }
});

app.put('/api/content/services', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const db = await getPool();
    
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      ['services', content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save services' });
  }
});

app.put('/api/content/portfolio', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const db = await getPool();
    
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      ['portfolio', content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save portfolio' });
  }
});

app.put('/api/content/contact_info', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const db = await getPool();
    
    await db.query(
      'INSERT INTO content (title, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      ['contact_info', content, content]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save contact info' });
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