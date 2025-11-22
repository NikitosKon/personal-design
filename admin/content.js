const API_BASE = '/api';
let currentToken = localStorage.getItem('adminToken');
let currentSection = 'hero';
let siteContent = {}; // Initialize siteContent object

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
        logout();
    }
}

// Загрузка контента
async function loadContent() {
    const sections = ['hero_title', 'hero_subtitle', 'services', 'portfolio', 'contact_info'];
    
    for (let section of sections) {
        try {
            const res = await fetch(`${API_BASE}/content/${section}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Сохраняем в siteContent
                siteContent[section] = data;
                
                // Заполняем поля формы
                if (section === 'hero_title') {
                    document.getElementById('hero-title').value = data.content || '';
                } else if (section === 'hero_subtitle') {
                    document.getElementById('hero-subtitle').value = data.content || '';
                } else if (section === 'contact_info') {
                    try {
                        const contact = JSON.parse(data.content || '{}');
                        document.getElementById('contact-email').value = contact.email || '';
                        document.getElementById('contact-phone').value = contact.phone || '';
                        document.getElementById('contact-address').value = contact.address || '';
                    } catch (e) {
                        console.error('Error parsing contact info:', e);
                    }
                } else if (section === 'services') {
                    try {
                        const services = JSON.parse(data.content || '[]');
                        renderServices(services);
                    } catch (e) {
                        console.error('Error parsing services:', e);
                    }
                } else if (section === 'portfolio') {
                    try {
                        const portfolio = JSON.parse(data.content || '[]');
                        renderPortfolio(portfolio);
                    } catch (e) {
                        console.error('Error parsing portfolio:', e);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading:', section, err);
        }
    }
}

// Сохранение контента
async function saveContent(section) {
    try {
        let url, body;

        switch(section) {
            case 'hero':
                // Сохраняем заголовок
                await fetch(`${API_BASE}/content/hero_title`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({
                        content: document.getElementById('hero-title').value
                    })
                });
                
                // Сохраняем подзаголовок
                await fetch(`${API_BASE}/content/hero_subtitle`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({
                        content: document.getElementById('hero-subtitle').value
                    })
                });
                
                showSuccess('✅ Главная секция сохранена!');
                break;

            case 'services':
                const services = [];
                document.querySelectorAll('#services-list .item-card').forEach(card => {
                    services.push({
                        title: card.querySelector('.service-title').value,
                        description: card.querySelector('.service-description').value,
                        icon: card.querySelector('.service-icon').value
                    });
                });
                
                await fetch(`${API_BASE}/content/services`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({
                        content: JSON.stringify(services)
                    })
                });
                
                showSuccess('✅ Услуги сохранены!');
                break;

            case 'portfolio':
                const portfolio = [];
                document.querySelectorAll('#portfolio-list .item-card').forEach(card => {
                    portfolio.push({
                        title: card.querySelector('.portfolio-title').value,
                        description: card.querySelector('.portfolio-description').value,
                        image: card.querySelector('.portfolio-image').value
                    });
                });
                
                await fetch(`${API_BASE}/content/portfolio`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({
                        content: JSON.stringify(portfolio)
                    })
                });
                
                showSuccess('✅ Портфолио сохранено!');
                break;

            case 'contact':
                const contactData = {
                    email: document.getElementById('contact-email').value,
                    phone: document.getElementById('contact-phone').value,
                    address: document.getElementById('contact-address').value
                };
                
                await fetch(`${API_BASE}/content/contact_info`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentToken}`
                    },
                    body: JSON.stringify({
                        content: JSON.stringify(contactData)
                    })
                });
                
                showSuccess('✅ Контакты сохранены!');
                break;
        }
    } catch (err) {
        console.error('Save error:', err);
        showError('❌ Ошибка сохранения');
    }
}

// Навигация
function showSection(section, button) {
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Убираем активность со всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем нужную секцию
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Активируем кнопку
    if (button) {
        button.classList.add('active');
    }

    currentSection = section;
    
    // Загружаем данные для секции
    loadSectionData(section);
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Добавление и удаление элементов
function addService() {
    const servicesList = document.getElementById('services-list');
    const index = servicesList.children.length;
    
    const serviceHtml = `
        <div class="item-card" data-index="${index}">
            <div class="item-header">
                <h3>Услуга ${index + 1}</h3>
                <button type="button" class="delete-btn" onclick="deleteService(${index})">Удалить</button>
            </div>
            <div class="form-group">
                <label class="form-label">Название</label>
                <input type="text" class="form-input service-title" placeholder="Название услуги">
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-textarea service-description" placeholder="Описание услуги"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Иконка FontAwesome</label>
                <input type="text" class="form-input service-icon" placeholder="fas fa-star" value="fas fa-star">
            </div>
        </div>
    `;
    
    servicesList.innerHTML += serviceHtml;
}

function addPortfolioItem() {
    const portfolioList = document.getElementById('portfolio-list');
    const index = portfolioList.children.length;
    
    const portfolioHtml = `
        <div class="item-card" data-index="${index}">
            <div class="item-header">
                <h3>Работа ${index + 1}</h3>
                <button type="button" class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
            </div>
            <div class="form-group">
                <label class="form-label">Название проекта</label>
                <input type="text" class="form-input portfolio-title" placeholder="Название проекта">
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea class="form-textarea portfolio-description" placeholder="Описание проекта"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Изображение</label>
                <div class="upload-container">
                    <input type="text" class="form-input portfolio-image" placeholder="URL изображения">
                    <button type="button" class="upload-btn" onclick="uploadImage(this, 'portfolio')">Загрузить</button>
                </div>
            </div>
        </div>
    `;
    
    portfolioList.innerHTML += portfolioHtml;
}

function deleteService(index) {
    if (!confirm('Удалить эту услугу?')) return;
    
    const servicesList = document.getElementById('services-list');
    const itemToRemove = servicesList.querySelector(`[data-index="${index}"]`);
    if (itemToRemove) {
        itemToRemove.remove();
    }
}

function deletePortfolioItem(index) {
    if (!confirm('Удалить эту работу из портфолио?')) return;
    
    const portfolioList = document.getElementById('portfolio-list');
    const itemToRemove = portfolioList.querySelector(`[data-index="${index}"]`);
    if (itemToRemove) {
        itemToRemove.remove();
    }
}

// Функции рендеринга
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
                    <textarea class="form-textarea service-description" placeholder="Описание услуги">${escapeHtml(service.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Иконка FontAwesome</label>
                    <input type="text" class="form-input service-icon" value="${escapeHtml(service.icon || 'fas fa-star')}" placeholder="fas fa-star">
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

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
                        <button type="button" class="upload-btn" onclick="uploadImage(this, 'portfolio')">Загрузить</button>
                    </div>
                    ${item.image ? `
                        <div class="image-preview-container">
                            <div class="image-with-remove">
                                <img src="${item.image}" alt="Preview" class="image-preview" onerror="this.style.display='none'">
                                <button type="button" class="remove-image-btn" onclick="removeImage(this)">×</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input portfolio-title" value="${escapeHtml(item.title || '')}" placeholder="Название проекта">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea portfolio-description" placeholder="Описание проекта">${escapeHtml(item.description || '')}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Вспомогательные функции
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    setTimeout(() => {
        successEl.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Загрузка изображения
async function uploadImage(button, type) {
    const input = button.previousElementSibling;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        button.disabled = true;
        button.textContent = 'Загрузка...';
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                input.value = data.url;
                
                // Показать превью
                const previewContainer = input.closest('.form-group').querySelector('.image-preview-container');
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <div class="image-with-remove">
                            <img src="${data.url}" alt="Preview" class="image-preview">
                            <button type="button" class="remove-image-btn" onclick="removeImage(this)">×</button>
                        </div>
                    `;
                } else {
                    const container = document.createElement('div');
                    container.className = 'image-preview-container';
                    container.innerHTML = `
                        <div class="image-with-remove">
                            <img src="${data.url}" alt="Preview" class="image-preview">
                            <button type="button" class="remove-image-btn" onclick="removeImage(this)">×</button>
                        </div>
                    `;
                    input.closest('.form-group').appendChild(container);
                }
                
                showSuccess('Изображение загружено успешно');
            } else {
                throw new Error(data.error || 'Ошибка загрузки');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showError('Ошибка загрузки изображения');
        } finally {
            button.disabled = false;
            button.textContent = 'Загрузить';
        }
    };
    
    fileInput.click();
}

// Удалить изображение
function removeImage(button) {
    const container = button.closest('.image-preview-container');
    const input = container.closest('.form-group').querySelector('.portfolio-image');
    
    if (input) {
        input.value = '';
    }
    container.remove();
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Показываем первую секцию при загрузке
    showSection('hero');
    
    // Делаем первую кнопку активной
    const firstBtn = document.querySelector('.admin-nav .nav-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
    
    // Добавляем обработчики для кнопок навигации - FIXED VERSION
    document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const onclickAttr = this.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/showSection\('([^']+)'/);
                if (match && match[1]) {
                    showSection(match[1], this);
                }
            }
        });
    });
});

// Функция для загрузки данных секции
async function loadSectionData(section) {
    try {
        const response = await fetch(`/api/content/${section}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await response.json();
        
        switch(section) {
            case 'hero':
                document.getElementById('hero-title').value = data.content || '';
                document.getElementById('hero-subtitle').value = data.content || '';
                break;
            case 'services':
                loadServices(data.content);
                break;
            case 'portfolio':
                loadPortfolio(data.content);
                break;
            case 'contact':
                loadContactInfo(data.content);
                break;
        }
    } catch (error) {
        console.error('Error loading section data:', error);
        showError('Ошибка загрузки данных');
    }
}

// Загрузить услуги
function loadServices(servicesContent) {
    try {
        const services = JSON.parse(servicesContent || '[]');
        renderServices(services);
    } catch (error) {
        console.error('Error parsing services:', error);
        const container = document.getElementById('services-list');
        if (container) {
            container.innerHTML = '<p>Ошибка загрузки услуг</p>';
        }
    }
}

// Загрузить портфолио
function loadPortfolio(portfolioContent) {
    try {
        const portfolio = JSON.parse(portfolioContent || '[]');
        renderPortfolio(portfolio);
    } catch (error) {
        console.error('Error parsing portfolio:', error);
        const container = document.getElementById('portfolio-list');
        if (container) {
            container.innerHTML = '<p>Ошибка загрузки портфолио</p>';
        }
    }
}

// Загрузить контактную информацию
function loadContactInfo(contactContent) {
    if (!contactContent) return;
    
    try {
        const contact = JSON.parse(contactContent || '{}');
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-address').value = contact.address || '';
    } catch (error) {
        console.error('Error parsing contact info:', error);
    }
}