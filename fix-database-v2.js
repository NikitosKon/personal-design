import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing database structure...');

const contentData = [
    {
        title: 'hero_title',
        section: 'hero',
        content: 'We craft premium logos, posters, social content, promo videos & 3D visuals.'
    },
    {
        title: 'hero_subtitle',
        section: 'hero', 
        content: 'Fast delivery, polished aesthetics, and conversion-driven visuals. Get a free sample for your first project — no strings attached.'
    },
    {
        title: 'services',
        section: 'services',
        content: JSON.stringify([
            {
                id: 1,
                title: "Logo & Branding",
                description: "Logo, typography, color and asset systems.",
                icon: "fas fa-pen-nib"
            },
            {
                id: 2,
                title: "Graphic Design",
                description: "Posters, banners, social content and ad creatives.", 
                icon: "fas fa-image"
            },
            {
                id: 3,
                title: "Video Editing",
                description: "Short-form ads, promos and product videos for socials.",
                icon: "fas fa-film"
            },
            {
                id: 4,
                title: "3D Visualization",
                description: "Product renders, mockups and animated presentations.",
                icon: "fas fa-cube"
            }
        ])
    },
    {
        title: 'portfolio',
        section: 'portfolio',
        content: JSON.stringify([
            {
                id: 1,
                title: "Logo for CoffeeHub",
                description: "Modern mark — applied across packaging and web.",
                image: ""
            },
            {
                id: 2,
                title: "Restaurant Menu",
                description: "Clean layout focused on appetite and conversion.",
                image: ""
            },
            {
                id: 3, 
                title: "Instagram Campaign",
                description: "Coherent visual system for multi-platform ads and posts.",
                image: ""
            },
            {
                id: 4,
                title: "Brand Identity for TechStart",
                description: "Complete branding for tech startup including logo and guidelines.",
                image: ""
            },
            {
                id: 5,
                title: "Product Packaging", 
                description: "Eye-catching packaging design for consumer goods.",
                image: ""
            },
            {
                id: 6,
                title: "Social Media Kit",
                description: "Complete set of templates for social media marketing.",
                image: ""
            }
        ])
    },
    {
        title: 'contact_info',
        section: 'contact',
        content: '{"email":"hello@personaldesign.com","phone":"+353 1 234 5678","address":"Dublin, Ireland"}'
    }
];

async function fixDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Сначала посмотрим структуру таблицы
            db.all("PRAGMA table_info(content)", (err, columns) => {
                if (err) {
                    console.error('Error getting table info:', err);
                    reject(err);
                    return;
                }
                
                console.log('📋 Content table structure:');
                columns.forEach(col => {
                    console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''}`);
                });

                // Пересоздаем таблицу с правильной структурой
                db.run('DROP TABLE IF EXISTS content', (err) => {
                    if (err) {
                        console.error('Error dropping table:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('✅ Old content table dropped');
                    
                    // Создаем новую таблицу с правильной структурой
                    db.run(`CREATE TABLE content (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT UNIQUE NOT NULL,
                        content TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating table:', err);
                            reject(err);
                            return;
                        }
                        
                        console.log('✅ New content table created');
                        
                        // Добавляем данные
                        let completed = 0;
                        contentData.forEach(item => {
                            db.run(
                                'INSERT INTO content (title, content) VALUES (?, ?)',
                                [item.title, item.content],
                                function(err) {
                                    if (err) {
                                        console.error(`❌ Error with ${item.title}:`, err);
                                    } else {
                                        console.log(`✅ ${item.title} added`);
                                    }
                                    
                                    completed++;
                                    if (completed === contentData.length) {
                                        createAdminUser();
                                    }
                                }
                            );
                        });
                    });
                });
            });

            function createAdminUser() {
                const defaultPassword = bcrypt.hashSync('admin123', 10);
                db.run(
                    'INSERT OR IGNORE INTO admin (username, password) VALUES (?, ?)',
                    ['admin', defaultPassword],
                    (err) => {
                        if (err) {
                            console.error('Error creating admin:', err);
                        } else {
                            console.log('✅ Admin user ready (admin / admin123)');
                        }
                        resolve();
                    }
                );
            }
        });
    });
}

fixDatabase().then(() => {
    db.close(() => {
        console.log('🎉 Database fixed successfully!');
        console.log('Start your server: npm start');
    });
}).catch(err => {
    console.error('❌ Error fixing database:', err);
    db.close();
});