import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для проверки что база данных существует и валидна
function verifyDatabase() {
  const dbPath = path.join(__dirname, 'database.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found!');
    return false;
  }
  
  try {
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      console.log('❌ Database file is empty!');
      return false;
    }
    console.log('✅ Database verified successfully');
    return true;
  } catch (error) {
    console.log('❌ Error verifying database:', error.message);
    return false;
  }
}

// Функция для создания резервной копии
function createBackup() {
  const dbPath = path.join(__dirname, 'database.db');
  const backupPath = path.join(__dirname, 'database.backup');
  
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Database backup created: database.backup');
  } else {
    console.log('⚠️ No database found to backup');
  }
}

// Основная функция
function main() {
  console.log('🔍 Verifying database before deploy...');
  
  if (verifyDatabase()) {
    console.log('🚀 Database is ready for deploy!');
    createBackup();
  } else {
    console.log('❌ Database issues detected! Please check database.db file');
    process.exit(1);
  }
}

main();