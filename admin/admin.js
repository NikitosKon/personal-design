const API_BASE = '/api';

let currentToken = localStorage.getItem('adminToken');

// Проверка аутентификации при загрузке
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
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(data => {
        loadMessages();
        loadStats();
    })
    .catch(error => {
        console.error('Auth check failed:', error);
        logout();
    });
}

function loadStats() {
    fetch(`${API_BASE}/messages`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        return response.json();
    })
    .then(messages => {
        const total = messages.length;
        const newMessages = messages.filter(m => m.status === 'new').length;
        const repliedMessages = messages.filter(m => m.status === 'replied').length;

        document.getElementById('totalMessages').textContent = total;
        document.getElementById('newMessages').textContent = newMessages;
        document.getElementById('repliedMessages').textContent = repliedMessages;
    })
    .catch(error => {
        console.error('Error loading stats:', error);
        showError('Failed to load statistics');
    });
}

function loadMessages() {
    fetch(`${API_BASE}/messages`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        return response.json();
    })
    .then(messages => {
        renderMessages(messages);
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        showError('Failed to load messages');
    });
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="loading">Нет сообщений</div>';
        return;
    }

    let tableHTML = `
        <table class="messages-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Тип проекта</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    messages.forEach(message => {
        const date = new Date(message.created_at).toLocaleString('ru-RU');
        const statusClass = `status-${message.status}`;
        
        tableHTML += `
            <tr>
                <td>${message.id}</td>
                <td>${escapeHtml(message.name)}</td>
                <td>${escapeHtml(message.email)}</td>
                <td>${escapeHtml(message.project_type)}</td>
                <td><span class="${statusClass}">${getStatusText(message.status)}</span></td>
                <td>${date}</td>
                <td>
                    <button class="action-btn" onclick="viewMessage(${message.id})">Просмотр</button>
                    <button class="action-btn" onclick="updateStatus(${message.id}, 'read')">Прочитано</button>
                    <button class="action-btn" onclick="updateStatus(${message.id}, 'replied')">Отвечено</button>
                    <button class="action-btn delete-btn" onclick="deleteMessage(${message.id})">Удалить</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

function getStatusText(status) {
    const statusMap = {
        'new': 'Новое',
        'read': 'Прочитано', 
        'replied': 'Отвечено'
    };
    return statusMap[status] || status;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function viewMessage(id) {
    fetch(`${API_BASE}/messages`, {
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => response.json())
    .then(messages => {
        const message = messages.find(m => m.id === id);
        if (message) {
            showMessageModal(message);
        }
    })
    .catch(error => {
        console.error('Error fetching message:', error);
        showError('Failed to load message details');
    });
}

function showMessageModal(message) {
    const modal = document.getElementById('messageModal');
    const modalBody = document.getElementById('modalBody');
    
    const date = new Date(message.created_at).toLocaleString('ru-RU');
    
    modalBody.innerHTML = `
        <div class="message-field">
            <div class="field-label">Имя</div>
            <div class="field-value">${escapeHtml(message.name)}</div>
        </div>
        <div class="message-field">
            <div class="field-label">Email</div>
            <div class="field-value">${escapeHtml(message.email)}</div>
        </div>
        <div class="message-field">
            <div class="field-label">Тип проекта</div>
            <div class="field-value">${escapeHtml(message.project_type)}</div>
        </div>
        <div class="message-field">
            <div class="field-label">Сообщение</div>
            <div class="field-value">${escapeHtml(message.message || '—')}</div>
        </div>
        <div class="message-field">
            <div class="field-label">Дата отправки</div>
            <div class="field-value">${date}</div>
        </div>
        <div class="message-field">
            <div class="field-label">Статус</div>
            <div class="field-value">${getStatusText(message.status)}</div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('messageModal').style.display = 'none';
}

function updateStatus(id, status) {
    fetch(`${API_BASE}/messages/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        return response.json();
    })
    .then(data => {
        loadMessages();
        loadStats();
    })
    .catch(error => {
        console.error('Error updating status:', error);
        showError('Failed to update status');
    });
}

function deleteMessage(id) {
    if (!confirm('Вы уверены, что хотите удалить это сообщение?')) {
        return;
    }
    
    fetch(`${API_BASE}/messages/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${currentToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete message');
        }
        return response.json();
    })
    .then(data => {
        loadMessages();
        loadStats();
    })
    .catch(error => {
        console.error('Error deleting message:', error);
        showError('Failed to delete message');
    });
}

function refreshMessages() {
    loadMessages();
    loadStats();
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

function showError(message) {
    alert(message);
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('messageModal');
    if (event.target === modal) {
        closeModal();
    }
}