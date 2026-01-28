/**
 * AJAX-отправка сообщений в тикетах из админки
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Проверяем, что мы на странице редактирования тикета
        const ticketIdMatch = window.location.pathname.match(/\/admin\/dashboards\/ticket\/(\d+)\/change\//);
        if (!ticketIdMatch) return;
        
        const ticketId = ticketIdMatch[1];
        
        // Убираем возможность сворачивания inline блока
        const inlineGroup = document.querySelector('.inline-group');
        if (inlineGroup) {
            // Убираем класс collapsed если есть
            inlineGroup.classList.remove('collapsed');
            
            // Убираем все кнопки сворачивания
            const collapseToggles = inlineGroup.querySelectorAll('.collapse-toggle, [data-toggle="collapse"]');
            collapseToggles.forEach(el => el.remove());
            
            // Убираем обработчики клика на заголовке
            const header = inlineGroup.querySelector('h2');
            if (header) {
                header.style.cursor = 'default';
                const newHeader = header.cloneNode(true);
                header.parentNode.replaceChild(newHeader, header);
            }
        }
        
        // Функция инициализации кнопки отправки
        function initSendButton() {
            // Если кнопка уже есть, не создаём повторно
            if (document.querySelector('.ajax-send-btn')) return;
            
            const inlineGroup = document.querySelector('.inline-group');
            if (!inlineGroup) return;
            
            // Находим textarea для сообщения
            const textarea = inlineGroup.querySelector('textarea[name$="-message"]');
            if (!textarea) return;
            
            // Создаём кнопку отправки
            const sendButton = document.createElement('button');
            sendButton.type = 'button';
            sendButton.textContent = 'Отправить';
            sendButton.className = 'ajax-send-btn';
            sendButton.style.cssText = `
                background: #417690;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
                transition: background 0.2s;
            `;
            
            sendButton.addEventListener('mouseenter', function() {
                this.style.background = '#205067';
            });
            sendButton.addEventListener('mouseleave', function() {
                this.style.background = '#417690';
            });
            
            // Вставляем кнопку после textarea
            textarea.parentNode.insertBefore(sendButton, textarea.nextSibling);
            
            // Создаём элемент для статуса
            const statusEl = document.createElement('span');
            statusEl.className = 'ajax-status';
            statusEl.style.cssText = 'margin-left: 10px; font-size: 13px;';
            sendButton.parentNode.insertBefore(statusEl, sendButton.nextSibling);
            
            // Привязываем обработчики
            bindSendHandler(sendButton, textarea, statusEl, ticketId);
        }
        
        // Получаем CSRF токен
        function getCsrfToken() {
            const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
            if (cookie) {
                return cookie.split('=')[1];
            }
            const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
            return input ? input.value : '';
        }
        
        // Функция привязки обработчиков
        function bindSendHandler(sendButton, textarea, statusEl, ticketId) {
            // Обработчик отправки
            sendButton.addEventListener('click', function() {
                const message = textarea.value.trim();
                
                if (!message) {
                    statusEl.textContent = 'Введите сообщение';
                    statusEl.style.color = '#dc3545';
                    return;
                }
                
                // Блокируем кнопку
                sendButton.disabled = true;
                sendButton.textContent = 'Отправка...';
                statusEl.textContent = '';
                
                // Отправляем AJAX запрос
                fetch(`/api/admin/tickets/${ticketId}/message/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                    },
                    body: JSON.stringify({ message: message })
                })
                .then(response => response.json().then(data => ({ ok: response.ok, data })))
                .then(({ ok, data }) => {
                    if (ok && data.success) {
                        // Успешно отправлено
                        statusEl.textContent = 'Отправлено!';
                        statusEl.style.color = '#28a745';
                        
                        // Очищаем textarea
                        textarea.value = '';
                        
                        // Добавляем сообщение в чат
                        const chatContainer = document.querySelector('.chat-container');
                        if (chatContainer && data.message_html) {
                            chatContainer.insertAdjacentHTML('beforeend', data.message_html);
                            // Прокручиваем вниз
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                        
                        // Скрываем статус через 3 секунды
                        setTimeout(() => {
                            statusEl.textContent = '';
                        }, 3000);
                    } else {
                        // Ошибка
                        statusEl.textContent = data.error || 'Ошибка отправки';
                        statusEl.style.color = '#dc3545';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    statusEl.textContent = 'Ошибка сети';
                    statusEl.style.color = '#dc3545';
                })
                .finally(() => {
                    // Разблокируем кнопку
                    sendButton.disabled = false;
                    sendButton.textContent = 'Отправить';
                });
            });
            
            // Отправка по Ctrl+Enter
            textarea.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    sendButton.click();
                }
            });
        }
        
        // Инициализируем кнопку
        initSendButton();
    });
})();
