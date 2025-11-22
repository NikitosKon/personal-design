import dotenv from 'dotenv';
import express from 'express';
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

// In-memory storage (простая замена SQLite)
let messages = [];
let content = {};
let admins = [{ id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) }];

// Default content
const defaultContent = {
  hero_title: 'We craft premium logos, posters, social content, promo videos & 3D visuals.',
  hero_subtitle: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.',
  services: '[]',
  portfolio: '[]',
  contact_info: '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}'
};

Object.assign(content, defaultContent);

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

  const user = admins.find(a => a.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: { id: user.id, username: user.username } });
});

app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/admin/create', authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const hash = bcrypt.hashSync(password, 10);
  const existingIndex = admins.findIndex(a => a.username === username);
  
  if (existingIndex >= 0) {
    admins[existingIndex].password = hash;
  } else {
    admins.push({ id: Date.now(), username, password: hash });
  }
  
  res.json({ success: true, message: 'Admin created', username });
});

// Messages
app.get('/api/messages', authenticateToken, (req, res) => {
  res.json(messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/contact', (req, res) => {
  const { name, email, project, message } = req.body;
  if (!name || !email || !project) return res.status(400).json({ error: 'Name, email and project required' });

  const newMessage = {
    id: Date.now(),
    name,
    email, 
    project_type: project,
    message: message || '',
    status: 'new',
    created_at: new Date().toISOString()
  };
  
  messages.push(newMessage);
  res.json({ success: true, message: 'Message sent', id: newMessage.id });
});

app.put('/api/messages/:id', authenticateToken, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });

  const message = messages.find(m => m.id == req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });
  
  message.status = status;
  res.json({ success: true, message: 'Message updated' });
});

app.delete('/api/messages/:id', authenticateToken, (req, res) => {
  const index = messages.findIndex(m => m.id == req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Message not found' });
  
  messages.splice(index, 1);
  res.json({ success: true, message: 'Message deleted' });
});

// Content
app.get('/api/content/:section', authenticateToken, (req, res) => {
  res.json({ content: content[req.params.section] || '' });
});

app.put('/api/content/:section', authenticateToken, (req, res) => {
  const { content: newContent } = req.body;
  if (!newContent) return res.status(400).json({ error: 'Content required' });

  content[req.params.section] = newContent;
  res.json({ success: true });
});

app.get('/api/public/content/:section', (req, res) => {
  res.json({ content: content[req.params.section] || '' });
});

app.get('/api/admin/content', authenticateToken, (req, res) => {
  const result = Object.entries(content).map(([title, content]) => ({ title, content }));
  res.json(result);
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
  res.json({ 
    message: 'Server working!', 
    timestamp: new Date().toISOString(),
    storage: 'In-memory'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Main site: http://localhost:${PORT}`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
  console.log(`💾 Storage: In-memory (no SQLite needed)`);
});