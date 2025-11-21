import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database content...');

// Проверяем все таблицы
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log('📋 Tables found:', tables.map(t => t.name));
    
    // Проверяем контент
    db.all("SELECT * FROM content", (err, rows) => {
        if (err) {
            console.error('Error reading content:', err);
            return;
        }
        
        console.log('📝 Content table:');
        rows.forEach(row => {
            console.log(`- ${row.title}: ${row.content ? 'has content' : 'empty'}`);
            if (row.content) {
                try {
                    const parsed = JSON.parse(row.content);
                    console.log(`  ${Array.isArray(parsed) ? `Items: ${parsed.length}` : 'Object'}`);
                } catch (e) {
                    console.log(`  Text: ${row.content.substring(0, 50)}...`);
                }
            }
        });
        
        // Проверяем сообщения
        db.all("SELECT * FROM messages", (err, messages) => {
            if (err) {
                console.error('Error reading messages:', err);
                return;
            }
            
            console.log(`✉️ Messages: ${messages.length} found`);
            
            db.close();
        });
    });
});