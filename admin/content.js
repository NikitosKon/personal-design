const API_BASE = '/api';
let currentToken = localStorage.getItem('adminToken');
let siteContent = {};

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
        logout();
    }
}

async function loadContent() {
    const sections = ['hero_title', 'hero_subtitle', 'services', 'portfolio', 'contact_info'];
    for (let section of sections) {
        try {
            const res = await fetch(`${API_BASE}/content/${section}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            siteContent[section] = res.ok ? await res.json() : { content: '' };
        } catch (err) {
            siteContent[section] = { content: '' };
        }
    }
    renderContent();
}

function renderContent() {
    if (siteContent.hero_title) {
        document.getElementById('hero-title').value = siteContent.hero_title.content || '';
    }
    if (siteContent.hero_subtitle) {
        document.getElementById('hero-subtitle').value = siteContent.hero_subtitle.content || '';
    }

    try {
        if (siteContent.services) {
            renderServices(JSON.parse(siteContent.services.content || '[]'));
        }
        if (siteContent.portfolio) {
            renderPortfolio(JSON.parse(siteContent.portfolio.content || '[]'));
        }
        if (siteContent.contact_info) {
            const contact = JSON.parse(siteContent.contact_info.content || '{}');
            document.getElementById('contact-email').value = contact.email || '';
            document.getElementById('contact-phone').value = contact.phone || '';
            document.getElementById('contact-address').value = contact.address || '';
        }
    } catch (e) {
        console.error('Error parsing content:', e);
    }
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    if (!container) return;
    
    container.innerHTML = services.length ? services.map((service, index) => `
        <div class="item-card">
            <div class="item-header">
                <h3>Услуга ${index + 1}</h3>
                <button type="button" class="delete-btn" onclick="deleteService(${index})">Удалить</button>
            </div>
            <div class="form-group">
                <label class="form-label">Название</label>
                <input type="text" class="form-input service-title" value="${escapeHtml(service.title || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-textarea service-desc">${escapeHtml(service.description || '')}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Иконка</label>
                <input type="text" class="form-input service-icon" value="${escapeHtml(service.icon || 'fas fa-star')}">
            </div>
        </div>
    `).join('') : '<p style="color: var(--muted); text-align: center; padding: 20px;">Нет услуг</p>';
}

function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-list');
    if (!container) return;
    
    container.innerHTML = portfolio.length ? portfolio.map((item, index) => `
        <div class="item-card">
            <div class="item-header">
                <h3>Работа ${index + 1}</h3>
                <button type="button" class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
            </div>
            <div class="form-group">
                <label class="form-label">Изображение</label>
                <div class="upload-container">
                    <input type="text" class="form-input portfolio-image" value="${escapeHtml(item.image || '')}">
                    <button type="button" class="upload-btn" onclick="uploadPortfolioImage(${index})">Загрузить</button>
                </div>
                ${item.image ? `<img src="${item.image}" class="image-preview" style="max-width: 200px; margin-top: 10px;">` : ''}
            </div>
            <div class="form-group">
                <label class="form-label">Название</label>
                <input type="text" class="form-input portfolio-title" value="${escapeHtml(item.title || '')}">
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-textarea portfolio-desc">${escapeHtml(item.description || '')}</textarea>
            </div>
        </div>
    `).join('') : '<p style="color: var(--muted); text-align: center; padding: 20px;">Нет работ в портфолио</p>';
}

function addService() {
    const services = JSON.parse(siteContent.services?.content || '[]');
    services.push({ title: 'Новая услуга', description: 'Описание услуги', icon: 'fas fa-star' });
    siteContent.services = { content: JSON.stringify(services) };
    renderServices(services);
}

function addPortfolioItem() {
    const portfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    portfolio.push({ title: 'Новый проект', description: 'Описание проекта', image: '' });
    siteContent.portfolio = { content: JSON.stringify(portfolio) };
    renderPortfolio(portfolio);
}

function deleteService(index) {
    if (!confirm('Удалить эту услугу?')) return;
    const services = JSON.parse(siteContent.services?.content || '[]');
    services.splice(index, 1);
    siteContent.services = { content: JSON.stringify(services) };
    renderServices(services);
}

function deletePortfolioItem(index) {
    if (!confirm('Удалить эту работу?')) return;
    const portfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    portfolio.splice(index, 1);
    siteContent.portfolio = { content: JSON.stringify(portfolio) };
    renderPortfolio(portfolio);
}

async function uploadPortfolioImage(index) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const card = document.querySelectorAll('#portfolio-list .item-card')[index];
        const uploadBtn = card.querySelector('.upload-btn');
        uploadBtn.textContent = 'Загрузка...';
        uploadBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentToken}` },
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                card.querySelector('.portfolio-image').value = data.url;
                showSuccess('Изображение загружено!');
            }
        } catch (err) {
            showError('Ошибка загрузки');
        } finally {
            uploadBtn.textContent = 'Загрузить';
            uploadBtn.disabled = false;
        }
    };
    fileInput.click();
}

async function saveContent(section) {
    try {
        let content;
        switch(section) {
            case 'hero':
                await fetch(`${API_BASE}/content/hero_title`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ content: document.getElementById('hero-title').value })
                });
                await fetch(`${API_BASE}/content/hero_subtitle`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ content: document.getElementById('hero-subtitle').value })
                });
                break;
            case 'services':
                const services = Array.from(document.querySelectorAll('#services-list .item-card')).map(card => ({
                    title: card.querySelector('.service-title').value,
                    description: card.querySelector('.service-desc').value,
                    icon: card.querySelector('.service-icon').value
                }));
                await fetch(`${API_BASE}/content/services`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ content: JSON.stringify(services) })
                });
                break;
            case 'portfolio':
                const portfolio = Array.from(document.querySelectorAll('#portfolio-list .item-card')).map(card => ({
                    title: card.querySelector('.portfolio-title').value,
                    description: card.querySelector('.portfolio-desc').value,
                    image: card.querySelector('.portfolio-image').value
                }));
                await fetch(`${API_BASE}/content/portfolio`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ content: JSON.stringify(portfolio) })
                });
                break;
            case 'contact':
                const contact = {
                    email: document.getElementById('contact-email').value,
                    phone: document.getElementById('contact-phone').value,
                    address: document.getElementById('contact-address').value
                };
                await fetch(`${API_BASE}/content/contact_info`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
                    body: JSON.stringify({ content: JSON.stringify(contact) })
                });
                break;
        }
        showSuccess('Контент сохранен!');
        setTimeout(() => loadContent(), 1000);
    } catch (err) {
        showError('Ошибка сохранения');
    }
}

function showSection(section, button) {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${section}-section`).style.display = 'block';
    if (button) button.classList.add('active');
}

function showSuccess(msg) {
    alert('✅ ' + msg);
}

function showError(msg) {
    alert('❌ ' + msg);
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('hero');
    document.querySelector('.nav-btn').classList.add('active');
});