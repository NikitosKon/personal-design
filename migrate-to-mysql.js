import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function migrateToMySQL() {
  console.log('🚀 Starting migration from SQLite to MySQL...');
  
  let sqliteDb;
  let mysqlDb;
  
  try {
    // Подключаемся к SQLite
    sqliteDb = await open({
      filename: './database.db',
      driver: sqlite3.Database
    });
    console.log('✅ Connected to SQLite');
    
    // Подключаемся к MySQL
    const mysqlConfig = {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT
    };
    
    mysqlDb = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL');
    
    // Мигрируем данные
    console.log('📦 Migrating data...');
    
    // Мигрируем контент
    const content = await sqliteDb.all('SELECT * FROM content');
    for (const item of content) {
      await mysqlDb.execute(
        'INSERT IGNORE INTO content (title, content) VALUES (?, ?)',
        [item.title, item.content]
      );
    }
    console.log(`✅ Migrated ${content.length} content items`);
    
    // Мигрируем сообщения
    const messages = await sqliteDb.all('SELECT * FROM messages');
    for (const message of messages) {
      await mysqlDb.execute(
        'INSERT INTO messages (name, email, project_type, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [message.name, message.email, message.project_type, message.message, message.status, message.created_at]
      );
    }
    console.log(`✅ Migrated ${messages.length} messages`);
    
    // Мигрируем админов
    const admins = await sqliteDb.all('SELECT * FROM admin');
    for (const admin of admins) {
      const hash = await bcrypt.hash(admin.password, 10);
      await mysqlDb.execute(
        'INSERT IGNORE INTO admins (username, password_hash) VALUES (?, ?)',
        [admin.username, hash]
      );
    }
    console.log(`✅ Migrated ${admins.length} admin users`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (sqliteDb) await sqliteDb.close();
    if (mysqlDb) await mysqlDb.end();
  }
}

migrateToMySQL();