const API_BASE = window.location.origin + '/api';
let currentToken = localStorage.getItem('adminToken');
let siteContent = {};

// Проверка аутентификации
if (!currentToken) {
    window.location.href = '/admin/login.html';
} else {
    checkAuth();
}

function checkAuth() {
    fetch(`${API_BASE}/admin/verify`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Not authenticated');
        loadContent();
    })
    .catch(error => {
        console.error('Auth check failed:', error);
        logout();
    });
}

function loadContent() {
    fetch(`${API_BASE}/content`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => response.json())
    .then(content => {
        siteContent = {};
        content.forEach(item => {
            siteContent[item.section] = item;
        });
        renderContent();
    })
    .catch(error => {
        console.error('Error loading content:', error);
        showError('Ошибка загрузки контента');
    });
}

function renderContent() {
    // Hero section
    if (siteContent.hero_title) {
        document.getElementById('hero-title').value = siteContent.hero_title.content || '';
    }
    if (siteContent.hero_subtitle) {
        document.getElementById('hero-subtitle').value = siteContent.hero_subtitle.content || '';
    }

    // Services section
    if (siteContent.services) {
        renderServices(JSON.parse(siteContent.services.content || '[]'));
    }

    // Portfolio section
    if (siteContent.portfolio) {
        renderPortfolio(JSON.parse(siteContent.portfolio.content || '[]'));
    }

    // Contact section
    if (siteContent.contact_info) {
        const contact = JSON.parse(siteContent.contact_info.content || '{}');
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-phone').value = contact.phone || '';
        document.getElementById('contact-address').value = contact.address || '';
    }
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    container.innerHTML = '';

    services.forEach((service, index) => {
        const serviceHTML = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Услуга ${index + 1}</h3>
                    <button class="delete-btn" onclick="deleteService(${index})">Удалить</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input service-title" value="${service.title || ''}" placeholder="Название услуги">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea service-desc" placeholder="Описание услуги">${service.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Иконка (FontAwesome класс)</label>
                    <input type="text" class="form-input service-icon" value="${service.icon || ''}" placeholder="fas fa-icon">
                </div>
            </div>
        `;
        container.innerHTML += serviceHTML;
    });
}

function renderPortfolio(portfolio) {
    const container = document.getElementById('portfolio-list');
    container.innerHTML = '';

    portfolio.forEach((item, index) => {
        const portfolioHTML = `
            <div class="item-card" data-index="${index}">
                <div class="item-header">
                    <h3>Работа ${index + 1}</h3>
                    <button class="delete-btn" onclick="deletePortfolioItem(${index})">Удалить</button>
                </div>

<div class="form-group">
    <label class="form-label">Изображение</label>
    <input type="file" class="form-input portfolio-image" accept="image/*" onchange="uploadPortfolioImage(this, ${index})">
    ${item.image ? `<img src="${item.image}" style="margin-top:10px; max-width:150px;">` : ''}
</div>


                <div class="form-group">
                    <label class="form-label">Название проекта</label>
                    <input type="text" class="form-input portfolio-title" value="${item.title || ''}" placeholder="Название проекта">
                </div>
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-textarea portfolio-desc" placeholder="Описание проекта">${item.description || ''}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += portfolioHTML;
    });
}

function addService() {
    const services = JSON.parse(siteContent.services?.content || '[]');
    services.push({
        id: Date.now(),
        title: '',
        description: '',
        icon: 'fas fa-star'
    });
    renderServices(services);
}

function addPortfolioItem() {
    const portfolio = JSON.parse(siteContent.portfolio?.content || '[]');
    portfolio.push({
        id: Date.now(),
        title: '',
        description: '',
        image: '' // поле для URL изображения
    });
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

function saveContent(section) {
    let contentData;

    switch(section) {
        case 'hero':
            contentData = {
                'hero_title': document.getElementById('hero-title').value,
                'hero_subtitle': document.getElementById('hero-subtitle').value
            };
            break;
        case 'services':
            const services = [];
            document.querySelectorAll('#services-list .item-card').forEach(card => {
                const index = card.dataset.index;
                services.push({
                    id: JSON.parse(siteContent.services?.content || '[]')[index]?.id || Date.now(),
                    title: card.querySelector('.service-title').value,
                    description: card.querySelector('.service-desc').value,
                    icon: card.querySelector('.service-icon').value
                });
            });
            contentData = { services: JSON.stringify(services) };
            break;
        case 'portfolio':
            const portfolio = [];
            document.querySelectorAll('#portfolio-list .item-card').forEach(card => {
                const index = card.dataset.index;
                portfolio.push({
    id: JSON.parse(siteContent.portfolio?.content || '[]')[index]?.id || Date.now(),
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

    // Сохраняем каждый элемент контента
    const promises = Object.keys(contentData).map(section => {
        return fetch(`${API_BASE}/content/${section}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                title: section,
                content: contentData[section]
            })
        });
    });

    Promise.all(promises)
        .then(() => {
            showSuccess('Контент успешно сохранен!');
            loadContent(); // Перезагружаем контент
        })
        .catch(error => {
            console.error('Error saving content:', error);
            showError('Ошибка сохранения контента');
        });
}

function showSection(section, buttonElement) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section and activate button
    document.getElementById(`${section}-section`).style.display = 'block';
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
}

function showSuccess(message) {
    const el = document.getElementById('successMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function showError(message) {
    const el = document.getElementById('errorMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Показываем первую секцию по умолчанию
document.addEventListener('DOMContentLoaded', () => {
    showSection('hero');
    // Активируем первую кнопку
    document.querySelector('.nav-btn').classList.add('active');
});

function uploadPortfolioImage(input, index) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentToken}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.url) {
            // ставим URL в текстовое поле
            const card = document.querySelector(`#portfolio-list .item-card[data-index="${index}"]`);
            card.querySelector('.portfolio-image').value = data.url;
        } else {
            showError('Ошибка загрузки изображения');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showError('Ошибка загрузки изображения');
    });
}
