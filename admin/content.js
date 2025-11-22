const API_BASE = '/api';
let currentToken = localStorage.getItem('adminToken');

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
                    } catch (e) {}
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
        if (section === 'hero') {
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
            
            alert('✅ Главная секция сохранена!');
        }
    } catch (err) {
        console.error('Save error:', err);
        alert('❌ Ошибка сохранения');
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
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Показываем первую секцию при загрузке
    showSection('hero');
    
    // Делаем первую кнопку активной
    const firstBtn = document.querySelector('.nav-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
    
    // Добавляем обработчики для кнопок навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('onclick').match(/showSection\('([^']+)'/)[1];
            showSection(section, this);
        });
    });
});