const API_BASE = window.location.origin + '/api';
let currentToken = localStorage.getItem('adminToken');
let siteContent = {};

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
        if (!res.ok) throw new Error('Not authenticated');
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
            if (!res.ok) continue;
            const data = await res.json();
            siteContent[section] = data;
        }
        renderContent();
    } catch (err) {
        console.error('Error loading content:', err);
        showError('Ошибка загрузки контента');
    }
}

// Отображение контента в форме
function renderContent() {
    if (siteContent.hero_title) document.getElementById('hero-title').value = siteContent.hero_title.content || '';
    if (siteContent.hero_subtitle) document.getElementById('hero-subtitle').value = siteContent.hero_subtitle.content || '';

    if (siteContent.services) renderServices(JSON.parse(siteContent.services.content || '[]'));
    if (siteContent.portfolio) renderPortfolio(JSON.parse(siteContent.portfolio.content || '[]'));

    if (siteContent.contact_info) {
        const contact = JSON.parse(siteContent.contact_info.content || '{}');
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-address').value = contact.address || '';
    }
}

// Рендеринг услуг
function renderServices(services) {
    const container = document.getElementById('services-list');
    container.innerHTML = '';
    services.forEach((service, index) => {
        const html = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Услуга ${index + 1}</h3>
                    <button type="button" class="delete-btn" onclick="deleteService(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label>Название</label>
                    <input type="text" class="service-title" value="${service.title || ''}">
                </div>
                <div class="form-group">
                    <label>Описание</label>
                    <textarea class="service-desc">${service.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Иконка</label>
                    <input type="text" class="service-icon" value="${service.icon || ''}">
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Рендеринг портфолио
function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-list');
    container.innerHTML = '';
    portfolio.forEach((item, index) => {
        const html = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Работа ${index + 1}</h3>
                    <button type="button" class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label>Изображение</label>
                    <input type="file" class="portfolio-image" accept="image/*" onchange="uploadPortfolioImage(this, ${index})">
                    ${item.image ? `<img src="${item.image}" style="max-width:150px; margin-top:5px;">` : ''}
                </div>
                <div class="form-group">
                    <label>Название</label>
                    <input type="text" class="portfolio-title" value="${item.title || ''}">
                </div>
                <div class="form-group">
                    <label>Описание</label>
                    <textarea class="portfolio-desc">${item.description || ''}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Добавление и удаление элементов
function addService() {
    const services = JSON.parse(siteContent.services?.content || '[]');
    services.push({ id: Date.now(), title: '', description: '', icon: 'fas fa-star' });
    renderServices(services);
}

function addPortfolioItem() {
    const portfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    portfolio.push({ id: Date.now(), title: '', description: '', image: '' });
    renderPortfolio(portfolio);
}

function deleteService(index) {
    const services = JSON.parse(siteContent.services?.content || '[]');
    services.splice(index, 1);
    renderServices(services);
}

function deletePortfolioItem(index) {
    const portfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    portfolio.splice(index, 1);
    renderPortfolio(portfolio);
}

// Сохранение контента
async function saveContent(section) {
    let contentData = {};

    switch(section) {
        case 'hero':
            contentData = {
                hero_title: document.getElementById('hero-title').value,
                hero_subtitle: document.getElementById('hero-subtitle').value
            };
            break;
        case 'services':
            const services = [];
            document.querySelectorAll('#services-list .item-card').forEach((card, i) => {
                services.push({
                    id: JSON.parse(siteContent.services?.content || '[]')[i]?.id || Date.now(),
                    title: card.querySelector('.service-title').value,
                    description: card.querySelector('.service-desc').value,
                    icon: card.querySelector('.service-icon').value
                });
            });
            contentData = { services: JSON.stringify(services) };
            break;
        case 'portfolio':
            const portfolio = [];
            document.querySelectorAll('#portfolio-list .item-card').forEach((card, i) => {
                portfolio.push({
                    id: JSON.parse(siteContent.portfolio?.content || '[]')[i]?.id || Date.now(),
                    title: card.querySelector('.portfolio-title').value,
                    description: card.querySelector('.portfolio-desc').value,
                    image: card.querySelector('.portfolio-image').value
                });
            });
            contentData = { portfolio: JSON.stringify(portfolio) };
            break;
        case 'contact':
            contentData = {
                contact_info: JSON.stringify({
                    email: document.getElementById('contact-email').value,
                    phone: document.getElementById('contact-phone').value,
                    address: document.getElementById('contact-address').value
                })
            };
            break;
    }

    try {
        for (let key of Object.keys(contentData)) {
            await fetch(`${API_BASE}/content/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    title: key,
                    content: contentData[key]
                })
            });
        }
        showSuccess('Контент успешно сохранен!');
        await loadContent();
    } catch (err) {
        console.error('Error saving content:', err);
        showError('Ошибка сохранения контента');
    }
}

// Навигация по секциям
function showSection(section, button) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${section}-section`).style.display = 'block';
    if (button) button.classList.add('active');
}

// Сообщения успеха/ошибки
function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Загрузка изображения для портфолио
function uploadPortfolioImage(input, index) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}` },
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.url) {
            const card = document.querySelector(`#portfolio-list .item-card[data-index="${index}"]`);
            card.querySelector('.portfolio-image').value = data.url;
        } else {
            showError('Ошибка загрузки изображения');
        }
    })
    .catch(err => {
        console.error('Upload error:', err);
        showError('Ошибка загрузки изображения');
    });
}

// Инициализация интерфейса
document.addEventListener('DOMContentLoaded', () => {
    showSection('hero');
    const firstBtn = document.querySelector('.nav-btn');
    if (firstBtn) firstBtn.classList.add('active');
});
