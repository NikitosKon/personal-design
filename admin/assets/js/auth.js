// admin/assets/js/auth.js - ЕДИНАЯ СИСТЕМА АУТЕНТИФИКАЦИИ
console.log('🔐 Auth system loaded');

// Проверка аутентификации при загрузке ЛЮБОЙ страницы
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    const token = localStorage.getItem('admin_token');
    
    console.log('🔄 Auth check:', { currentPath, isLoginPage, hasToken: !!token });
    
    // Если на странице логина И есть токен - редирект на главную
    if (isLoginPage && token) {
        console.log('✅ Already logged in, redirecting to index');
        window.location.href = 'index.html';
        return;
    }
    
    // Если НЕ на странице логина И нет токена - редирект на логин
    if (!isLoginPage && !token) {
        console.log('❌ No token, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    // Если НЕ на странице логина И есть токен - проверяем его валидность
    if (!isLoginPage && token) {
        verifyToken(token);
    }
});

// Проверка токена с сервером
async function verifyToken(token) {
    try {
        console.log('🔍 Verifying token...');
        const response = await fetch('/api/admin/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token invalid');
        }
        
        console.log('✅ Token is valid');
        // Токен валидный - страница продолжает загружаться
        
    } catch (error) {
        console.error('❌ Token verification failed:', error);
        // Токен невалидный - очищаем и редиректим
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token_timestamp');
        window.location.href = 'login.html';
    }
}

// Глобальные функции для всех страниц
window.getAuthHeaders = function() {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

window.logout = function() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_timestamp');
    window.location.href = 'login.html';
};