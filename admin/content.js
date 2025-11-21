const API_BASE = '/api';
let currentToken = localStorage.getItem('adminToken');
let siteContent = {};

// Вспомогательная функция для экранирования HTML
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Проверка аутентификации
if (!currentToken) {
    window.location.href = '/admin/login.html';
} else {
    checkAuth();
}

async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                throw new Error('Not authenticated');
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        await loadContent();
    } catch (err) {
        console.error('Auth check failed:', err);
        logout();
    }
}

// Загрузка контента всех секций
async function loadContent() {
    const sections = ['hero_title', 'hero_subtitle', 'services', 'portfolio', 'contact_info'];
    siteContent = {};

    try {
        for (let section of sections) {
            const res = await fetch(`${API_BASE}/content/${section}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                siteContent[section] = data;
            } else {
                siteContent[section] = { content: '' };
            }
        }
        renderContent();
    } catch (err) {
        console.error('Error loading content:', err);
        showError('Ошибка загрузки контента: ' + err.message);
    }
}

// Отображение контента в форме
function renderContent() {
    // Герой секция
    if (siteContent.hero_title && siteContent.hero_title.content) {
        document.getElementById('hero-title').value = siteContent.hero_title.content;
    }
    
    if (siteContent.hero_subtitle && siteContent.hero_subtitle.content) {
        document.getElementById('hero-subtitle').value = siteContent.hero_subtitle.content;
    }

    // Услуги
    if (siteContent.services) {
        try {
            const servicesData = JSON.parse(siteContent.services.content || '[]');
            renderServices(servicesData);
        } catch (e) {
            console.error('Error parsing services:', e);
            renderServices([]);
        }
    }

    // Портфолио
    if (siteContent.portfolio) {
        try {
            const portfolioData = JSON.parse(siteContent.portfolio.content || '[]');
            renderPortfolio(portfolioData);
        } catch (e) {
            console.error('Error parsing portfolio:', e);
            renderPortfolio([]);
        }
    }

    // Контакты
    if (siteContent.contact_info) {
        try {
            const contact = JSON.parse(siteContent.contact_info.content || '{}');
            document.getElementById('contact-email').value = contact.email || '';
            document.getElementById('contact-phone').value = contact.phone || '';
            document.getElementById('contact-address').value = contact.address || '';
        } catch (e) {
            console.error('Error parsing contact info:', e);
        }
    }
}

// Рендеринг услуг
function renderServices(services) {
    const container = document.getElementById('services-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!services || services.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 20px;">Нет услуг. Добавьте первую услугу.</p>';
        return;
    }
    
    services.forEach((service, index) => {
        const html = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Услуга ${index + 1}</h3>
                    <button type="button" class="delete-btn" onclick="deleteService(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input service-title" value="${escapeHtml(service.title || '')}" placeholder="Название услуги">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea service-desc" placeholder="Описание услуги">${escapeHtml(service.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Иконка FontAwesome</label>
                    <input type="text" class="form-input service-icon" value="${escapeHtml(service.icon || 'fas fa-star')}" placeholder="fas fa-star">
                    <small style="color: var(--muted); font-size: 12px;">Используйте классы FontAwesome, например: fas fa-palette, fas fa-video</small>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Рендеринг портфолио
function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 20px;">Нет работ в портфолио. Добавьте первую работу.</p>';
        return;
    }
    
    portfolio.forEach((item, index) => {
        const html = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Работа ${index + 1}</h3>
                    <button type="button" class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Изображение</label>
                    <div class="upload-container">
                        <input type="text" class="form-input portfolio-image" value="${escapeHtml(item.image || '')}" placeholder="URL изображения">
                        <button type="button" class="upload-btn" onclick="uploadPortfolioImage(${index})">Загрузить</button>
                    </div>
                    ${item.image ? `<img src="${item.image}" class="image-preview" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input portfolio-title" value="${escapeHtml(item.title || '')}" placeholder="Название проекта">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea portfolio-desc" placeholder="Описание проекта">${escapeHtml(item.description || '')}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Добавление и удаление элементов
function addService() {
    const currentServices = JSON.parse(siteContent.services?.content || '[]');
    const newService = { 
        id: Date.now(), 
        title: 'Новая услуга', 
        description: 'Описание услуги', 
        icon: 'fas fa-star' 
    };
    
    currentServices.push(newService);
    siteContent.services = { content: JSON.stringify(currentServices) };
    renderServices(currentServices);
}

function addPortfolioItem() {
    const currentPortfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    const newItem = { 
        id: Date.now(), 
        title: 'Новый проект', 
        description: 'Описание проекта', 
        image: '' 
    };
    
    currentPortfolio.push(newItem);
    siteContent.portfolio = { content: JSON.stringify(currentPortfolio) };
    renderPortfolio(currentPortfolio);
}

function deleteService(index) {
    if (!confirm('Удалить эту услугу?')) return;
    
    const currentServices = JSON.parse(siteContent.services?.content || '[]');
    if (index >= 0 && index < currentServices.length) {
        currentServices.splice(index, 1);
        siteContent.services = { content: JSON.stringify(currentServices) };
        renderServices(currentServices);
    }
}

function deletePortfolioItem(index) {
    if (!confirm('Удалить эту работу из портфолио?')) return;
    
    const currentPortfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    if (index >= 0 && index < currentPortfolio.length) {
        currentPortfolio.splice(index, 1);
        siteContent.portfolio = { content: JSON.stringify(currentPortfolio) };
        renderPortfolio(currentPortfolio);
    }
}

// Загрузка изображения для портфолио
async function uploadPortfolioImage(index) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const card = document.querySelector(`#portfolio-list .item-card[data-index="${index}"]`);
        const uploadBtn = card.querySelector('.upload-btn');
        
        // Показываем загрузку
        uploadBtn.textContent = 'Загрузка...';
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: formData
            });

            const data = await response.json();

            if (data.success && data.url) {
                const imageInput = card.querySelector('.portfolio-image');
                imageInput.value = data.url;
                
                // Показываем превью
                const existingImg = card.querySelector('.image-preview');
                if (existingImg) {
                    existingImg.src = data.url;
                } else {
                    const img = document.createElement('img');
                    img.src = data.url;
                    img.className = 'image-preview';
                    imageInput.parentNode.appendChild(img);
                }
                
                showSuccess('Изображение загружено!');
            } else {
                throw new Error(data.message || 'Ошибка загрузки');
            }
        } catch (err) {
            console.error('Upload error:', err);
            showError('Ошибка загрузки изображения: ' + err.message);
        } finally {
            uploadBtn.textContent = 'Загрузить';
            uploadBtn.disabled = false;
        }
    };

    fileInput.click();
}

// Сохранение контента
async function saveContent(section) {
    let updates = {};
    
    try {
        switch(section) {
            case 'hero':
                updates = {
                    hero_title: {
                        title: 'hero_title',
                        content: document.getElementById('hero-title').value
                    },
                    hero_subtitle: {
                        title: 'hero_subtitle', 
                        content: document.getElementById('hero-subtitle').value
                    }
                };
                break;
                
            case 'services':
                const services = [];
                document.querySelectorAll('#services-list .item-card').forEach((card) => {
                    services.push({
                        id: Date.now() + Math.random(),
                        title: card.querySelector('.service-title').value,
                        description: card.querySelector('.service-desc').value,
                        icon: card.querySelector('.service-icon').value
                    });
                });
                updates = {
                    services: {
                        title: 'services',
                        content: JSON.stringify(services)
                    }
                };
                break;
                
            case 'portfolio':
                const portfolio = [];
                document.querySelectorAll('#portfolio-list .item-card').forEach((card) => {
                    portfolio.push({
                        id: Date.now() + Math.random(),
                        title: card.querySelector('.portfolio-title').value,
                        description: card.querySelector('.portfolio-desc').value,
                        image: card.querySelector('.portfolio-image').value
                    });
                });
                updates = {
                    portfolio: {
                        title: 'portfolio',
                        content: JSON.stringify(portfolio)
                    }
                };
                break;
                
            case 'contact':
                updates = {
                    contact_info: {
                        title: 'contact_info',
                        content: JSON.stringify({
                            email: document.getElementById('contact-email').value,
                            phone: document.getElementById('contact-phone').value,
                            address: document.getElementById('contact-address').value
                        })
                    }
                };
                break;
                
            default:
                throw new Error(`Unknown section: ${section}`);
        }
        
        // Сохраняем все обновления для секции
        const savePromises = Object.values(updates).map(update => 
            fetch(`${API_BASE}/content/${update.title}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(update)
            })
        );
        
        const results = await Promise.all(savePromises);
        
        // Проверяем все ответы
        for (let result of results) {
            if (!result.ok) {
                throw new Error(`HTTP error! status: ${result.status}`);
            }
        }
        
        showSuccess('Контент успешно сохранен!');
        
        // Перезагружаем контент
        setTimeout(() => loadContent(), 1000);
        
    } catch (err) {
        console.error('Error saving content:', err);
        showError('Ошибка сохранения контента: ' + err.message);
    }
}

// Навигация по секциям
function showSection(section, button) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    if (button) {
        button.classList.add('active');
    }
}

// Сообщения успеха/ошибки
function showSuccess(msg) {
    let el = document.getElementById('successMessage');
    if (!el) {
        const container = document.querySelector('.admin-container');
        if (container) {
            el = document.createElement('div');
            el.className = 'success-message';
            el.id = 'successMessage';
            container.insertBefore(el, container.firstChild);
        } else {
            return;
        }
    }
    
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}

function showError(msg) {
    let el = document.getElementById('errorMessage');
    if (!el) {
        const container = document.querySelector('.admin-container');
        if (container) {
            el = document.createElement('div');
            el.className = 'error-message';
            el.id = 'errorMessage';
            container.insertBefore(el, container.firstChild);
        } else {
            return;
        }
    }
    
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Инициализация интерфейса
document.addEventListener('DOMContentLoaded', () => {
    showSection('hero');
    
    const firstBtn = document.querySelector('.nav-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
});

// Функция удаления изображения из портфолио
function removePortfolioImage(index) {
    if (!confirm('Удалить это изображение?')) return;
    
    const card = document.querySelector(`#portfolio-list .item-card[data-index="${index}"]`);
    if (card) {
        const imageInput = card.querySelector('.portfolio-image');
        const previewContainer = card.querySelector('.image-preview-container');
        
        // Очищаем поле ввода
        imageInput.value = '';
        
        // Удаляем превью
        previewContainer.innerHTML = '';
        
        showSuccess('Изображение удалено');
    }
}

// Обновите функцию renderPortfolio для нового HTML:
function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 20px;">Нет работ в портфолио. Добавьте первую работу.</p>';
        return;
    }
    
    portfolio.forEach((item, index) => {
        const html = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Работа ${index + 1}</h3>
                    <button type="button" class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Изображение</label>
                    <div class="upload-container">
                        <input type="text" class="form-input portfolio-image" value="${escapeHtml(item.image || '')}" placeholder="URL изображения">
                        <button type="button" class="upload-btn" onclick="uploadPortfolioImage(${index})">Загрузить</button>
                    </div>
                    <div class="image-preview-container">
                        ${item.image ? `
                            <div class="image-with-remove">
                                <img src="${item.image}" class="image-preview" onerror="this.style.display='none'">
                                <button type="button" class="remove-image-btn" onclick="removePortfolioImage(${index})" title="Удалить изображение">×</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input portfolio-title" value="${escapeHtml(item.title || '')}" placeholder="Название проекта">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea portfolio-desc" placeholder="Описание проекта">${escapeHtml(item.description || '')}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Обновите функцию uploadPortfolioImage для нового HTML:
async function uploadPortfolioImage(index) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const card = document.querySelector(`#portfolio-list .item-card[data-index="${index}"]`);
        const uploadBtn = card.querySelector('.upload-btn');
        
        // Показываем загрузку
        uploadBtn.textContent = 'Загрузка...';
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: formData
            });

            const data = await response.json();

            if (data.success && data.url) {
                const imageInput = card.querySelector('.portfolio-image');
                const previewContainer = card.querySelector('.image-preview-container');
                
                // Обновляем поле ввода
                imageInput.value = data.url;
                
                // Обновляем превью
                previewContainer.innerHTML = `
                    <div class="image-with-remove">
                        <img src="${data.url}" class="image-preview" onerror="this.style.display='none'">
                        <button type="button" class="remove-image-btn" onclick="removePortfolioImage(${index})" title="Удалить изображение">×</button>
                    </div>
                `;
                
                showSuccess('Изображение загружено!');
            } else {
                throw new Error(data.message || 'Ошибка загрузки');
            }
        } catch (err) {
            console.error('Upload error:', err);
            showError('Ошибка загрузки изображения: ' + err.message);
        } finally {
            uploadBtn.textContent = 'Загрузить';
            uploadBtn.disabled = false;
        }
    };

    fileInput.click();
}

// content.js - Backend API
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.db');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Создаем директорию для загрузок
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Инициализация таблиц для контента
function initContentDatabase() {
    const db = new sqlite3.Database(dbPath);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT UNIQUE NOT NULL,
            content TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.close();
}

// Сохранение/обновление контента
function saveContent(title, content) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        db.run(
            `INSERT OR REPLACE INTO content (title, content, updated_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [title, content],
            function(err) {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            }
        );
    });
}

// Получение контента
function getContent(title) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        db.get(
            "SELECT * FROM content WHERE title = ?",
            [title],
            (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(row || { content: '' });
                }
            }
        );
    });
}

// Сохранение информации о загруженном файле
function saveUploadInfo(fileInfo) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        const { filename, originalName, filePath, fileSize, mimeType } = fileInfo;
        
        db.run(
            `INSERT INTO uploads (filename, original_name, file_path, file_size, mime_type) 
             VALUES (?, ?, ?, ?, ?)`,
            [filename, originalName, filePath, fileSize, mimeType],
            function(err) {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...fileInfo });
                }
            }
        );
    });
}

// Получение информации о файле
function getUploadInfo(filename) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        db.get(
            "SELECT * FROM uploads WHERE filename = ?",
            [filename],
            (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
}

module.exports = {
    initContentDatabase,
    saveContent,
    getContent,
    saveUploadInfo,
    getUploadInfo
};