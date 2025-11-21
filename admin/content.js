const API_BASE = '/api';
let currentToken = localStorage.getItem('adminToken');
let siteContent = {};

// Вспомогательная функция для экранирования HTML (ПЕРЕМЕЩЕНА В НАЧАЛО)
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
        console.log('Checking authentication...');
        const res = await fetch(`${API_BASE}/admin/verify`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                throw new Error('Not authenticated');
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        console.log('Authentication successful');
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
        console.log('Loading content for sections:', sections);
        
        for (let section of sections) {
            const res = await fetch(`${API_BASE}/content/${section}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                siteContent[section] = data;
                console.log(`✅ Loaded ${section}:`, data.content ? 'has content' : 'empty');
            } else {
                console.warn(`❌ Failed to load ${section}, status:`, res.status);
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
    console.log('Rendering content...');
    
    // Герой секция
    const heroTitleEl = document.getElementById('hero-title');
    const heroSubtitleEl = document.getElementById('hero-subtitle');
    
    if (heroTitleEl && siteContent.hero_title && siteContent.hero_title.content) {
        heroTitleEl.value = siteContent.hero_title.content;
    }
    
    if (heroSubtitleEl && siteContent.hero_subtitle && siteContent.hero_subtitle.content) {
        heroSubtitleEl.value = siteContent.hero_subtitle.content;
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
            const emailEl = document.getElementById('contact-email');
            const phoneEl = document.getElementById('contact-phone');
            const addressEl = document.getElementById('contact-address');
            
            if (emailEl) emailEl.value = contact.email || '';
            if (phoneEl) phoneEl.value = contact.phone || '';
            if (addressEl) addressEl.value = contact.address || '';
        } catch (e) {
            console.error('Error parsing contact info:', e);
        }
    }
    
    console.log('Content rendered successfully');
}

// Рендеринг услуг
function renderServices(services) {
    const container = document.getElementById('services-list');
    if (!container) {
        console.error('Services list container not found');
        return;
    }
    
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
    if (!container) {
        console.error('Portfolio list container not found');
        return;
    }
    
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
                    <label class="form-label">Изображение URL</label>
                    <input type="text" class="form-input portfolio-image" value="${escapeHtml(item.image || '')}" placeholder="https://example.com/image.jpg">
                    ${item.image ? `<img src="${item.image}" style="max-width:150px; margin-top:10px; border-radius:4px; border:1px solid var(--border);" onerror="this.style.display='none'">` : ''}
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

// Сохранение контента
async function saveContent(section) {
    let updates = {};
    
    try {
        console.log(`Saving content for section: ${section}`);
        
        switch(section) {
            case 'hero':
                const heroTitle = document.getElementById('hero-title')?.value || '';
                const heroSubtitle = document.getElementById('hero-subtitle')?.value || '';
                
                updates = {
                    hero_title: {
                        title: 'hero_title',
                        content: heroTitle
                    },
                    hero_subtitle: {
                        title: 'hero_subtitle', 
                        content: heroSubtitle
                    }
                };
                break;
                
            case 'services':
                const services = [];
                document.querySelectorAll('#services-list .item-card').forEach((card) => {
                    services.push({
                        id: Date.now() + Math.random(),
                        title: card.querySelector('.service-title')?.value || '',
                        description: card.querySelector('.service-desc')?.value || '',
                        icon: card.querySelector('.service-icon')?.value || 'fas fa-star'
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
                        title: card.querySelector('.portfolio-title')?.value || '',
                        description: card.querySelector('.portfolio-desc')?.value || '',
                        image: card.querySelector('.portfolio-image')?.value || ''
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
                const email = document.getElementById('contact-email')?.value || '';
                const phone = document.getElementById('contact-phone')?.value || '';
                const address = document.getElementById('contact-address')?.value || '';
                
                updates = {
                    contact_info: {
                        title: 'contact_info',
                        content: JSON.stringify({ email, phone, address })
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
                const errorText = await result.text();
                throw new Error(`HTTP error! status: ${result.status}, response: ${errorText}`);
            }
        }
        
        showSuccess('Контент успешно сохранен!');
        
        // Перезагружаем контент чтобы убедиться в синхронизации
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
        // Создаем элемент если его нет
        const container = document.querySelector('.admin-container');
        if (container) {
            el = document.createElement('div');
            el.className = 'success-message';
            el.id = 'successMessage';
            container.insertBefore(el, container.firstChild);
        } else {
            console.warn('Cannot show success message: container not found');
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
        // Создаем элемент если его нет
        const container = document.querySelector('.admin-container');
        if (container) {
            el = document.createElement('div');
            el.className = 'error-message';
            el.id = 'errorMessage';
            container.insertBefore(el, container.firstChild);
        } else {
            console.warn('Cannot show error message: container not found');
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
    console.log('DOM loaded, initializing content manager...');
    
    // Показываем первую секцию
    showSection('hero');
    
    // Активируем первую кнопку
    const firstBtn = document.querySelector('.nav-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
    
    console.log('Content manager initialized');
});