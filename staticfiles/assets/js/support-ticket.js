// Функция для получения CSRF токена
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return '';
}

// Получение ID тикета из URL
function getTicketIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || null;
}

// Загрузка тикета с API
async function loadTicket(ticketId) {
  try {
    const response = await fetch(`/api/tickets/${ticketId}/`, {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Ошибка загрузки тикета');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка загрузки тикета:', error);
    return null;
  }
}

// Преобразование сообщений из API в формат для отображения
function formatMessages(apiMessages) {
  return apiMessages.map(msg => ({
    id: msg.id,
    author: msg.author,
    authorType: msg.is_admin ? 'support' : 'user',
    date: new Date(msg.created_at),
    text: msg.message,
    attachments: []
  }));
}

function generateDefaultTicketMessages() {
  const today = new Date();
  return [
    {
      id: 'msg-1',
      author: 'Иван Петров',
      authorType: 'user',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      text: 'Здравствуйте! После обновления не отображаются данные за последние несколько дней в дашборде продаж. Что можно сделать?',
      attachments: []
    },
    {
      id: 'msg-2',
      author: 'Анна Смирнова',
      authorType: 'support',
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      text: 'Здравствуйте, Иван! Спасибо за обращение. Проверяю проблему на нашей стороне. Это может быть связано с синхронизацией данных с маркетплейсом. Свяжусь с вами после проверки.',
      attachments: []
    }
  ];
}

// Генерация всех тикетов для поиска (та же функция, что и в support.js)
function generateAllTickets() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tickets = [];
  
  const subjects = [
    'Не работает дашборд продаж',
    'Вопрос по настройке рекламы',
    'Проблема с подключением к Wildberries',
    'Нужна помощь с аналитикой',
    'Вопрос по подписке',
    'Ошибка в отчёте по логистике',
    'Как экспортировать данные?',
    'Проблема с синхронизацией',
    'Вопрос по тарифам',
    'Нужна консультация по API'
  ];

  const previews = [
    'Здравствуйте! После обновления не отображаются данные за последние несколько дней...',
    'Подскажите, пожалуйста, как настроить автоматическую оптимизацию рекламных кампаний...',
    'Не могу подключить кабинет Wildberries. Выдаёт ошибку при авторизации...',
    'Хотел бы получить более детальную аналитику по продажам за последний месяц...',
    'Можно ли изменить тариф подписки в середине периода?',
    'В отчёте по логистике отображаются неверные данные по складским остаткам...',
    'Какие форматы экспорта поддерживаются? Нужен Excel для дальнейшей обработки...',
    'Данные не синхронизируются с маркетплейсом уже 2 дня. Что делать?',
    'Интересует информация о возможностях расширенного тарифа...',
    'Планирую интегрировать вашу систему через API. Есть ли документация?'
  ];

  const statuses = ['open', 'pending', 'closed'];
  const statusLabels = {
    'open': 'Открыт',
    'pending': 'В ожидании',
    'closed': 'Закрыт'
  };

  // Используем ту же логику генерации, что и в support.js для согласованности
  for (let monthOffset = 0; monthOffset < 8; monthOffset++) {
    const ticketsPerMonth = 4;
    
    for (let i = 0; i < ticketsPerMonth; i++) {
      const ticketDate = new Date(today);
      ticketDate.setMonth(today.getMonth() - monthOffset);
      
      const day = 5 + i * 7;
      ticketDate.setDate(day > 28 ? 28 : day);
      ticketDate.setHours(9 + (i % 8), (i * 13) % 60, 0, 0);
      
      if (ticketDate <= new Date()) {
        const subjectIndex = (monthOffset * ticketsPerMonth + i) % subjects.length;
        const statusIndex = (monthOffset * ticketsPerMonth + i) % statuses.length;
        const status = statuses[statusIndex];
        const hasUnread = status === 'open' && (monthOffset * ticketsPerMonth + i) % 3 === 0;
        
        const ticketId = `TKT-${String(10000 + monthOffset * 100 + i).slice(1)}`;
        
        tickets.push({
          id: ticketId,
          subject: subjects[subjectIndex],
          preview: previews[subjectIndex],
          date: new Date(ticketDate),
          status: status,
          statusLabel: statusLabels[status],
          unread: hasUnread,
          lastMessageDate: new Date(ticketDate.getTime() + (i % 7) * 24 * 60 * 60 * 1000)
        });
      }
    }
  }
  
  return tickets;
}

// Получение данных тикета
function getTicketById(ticketId) {
  // В реальном приложении здесь был бы запрос к API
  // Для прототипа ищем в сгенерированных данных
  const allTickets = generateAllTickets();
  return allTickets.find(t => t.id === ticketId) || null;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getInitials(name) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function highlightSearch(text, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function renderMessages(messages, searchTerm = '') {
  const container = document.getElementById('ticketMessages');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="support-empty">Сообщения не найдены</p>';
    return;
  }

  container.innerHTML = '';

  messages.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ticket-message ticket-message--${message.authorType}`;
    messageDiv.setAttribute('data-message-id', message.id);

    const highlightedText = highlightSearch(message.text, searchTerm);

    messageDiv.innerHTML = `
      <div class="ticket-message__avatar">${getInitials(message.author)}</div>
      <div class="ticket-message__content">
        <div class="ticket-message__header">
          <span class="ticket-message__author">${message.authorType === 'support' ? '👤 ' : ''}${message.author}</span>
          <span class="ticket-message__date">${formatDate(message.date)}</span>
        </div>
        <div class="ticket-message__text">${highlightedText}</div>
        ${message.attachments && message.attachments.length > 0 ? `
          <div class="ticket-message__attachments">
            ${message.attachments.map(att => `
              <a href="${att.url}" class="ticket-message__attachment" target="_blank">
                📎 ${att.name}
              </a>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(messageDiv);
  });

  // Прокручиваем к последнему сообщению
  const lastMessage = container.lastElementChild;
  if (lastMessage) {
    lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

function filterMessages(messages, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) {
    return messages;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  return messages.filter(msg => {
    return msg.text.toLowerCase().includes(searchLower) ||
           msg.author.toLowerCase().includes(searchLower);
  });
}

async function setupTicketInfo(ticketId) {
  const ticketTitle = document.getElementById('ticketTitle');
  const ticketIdSpan = document.getElementById('ticketId');
  const ticketDate = document.getElementById('ticketDate');
  const ticketStatus = document.getElementById('ticketStatus');

  // Загружаем данные тикета с API
  const ticket = await loadTicket(ticketId);
  
  if (!ticket) {
    alert('Тикет не найден. Перенаправление на список тикетов...');
    window.location.href = '/support/';
    return null;
  }

  if (ticketTitle) {
    ticketTitle.textContent = ticket.subject || 'Загрузка тикета...';
  }
  
  if (ticketIdSpan) {
    ticketIdSpan.textContent = `Тикет #${ticket.id || ticketId || '—'}`;
  }
  
  if (ticketDate) {
    const createdDate = new Date(ticket.created_at);
    ticketDate.textContent = formatDateShort(createdDate);
  }
  
  if (ticketStatus) {
    ticketStatus.textContent = ticket.status_display || ticket.status || '—';
  }
  
  return ticket;
}

function setupSearch() {
  const searchInput = document.getElementById('messagesSearch');
  if (!searchInput) return;

  let messages = [];
  let currentSearchTerm = '';

  const applySearch = () => {
    currentSearchTerm = searchInput.value;
    const filtered = filterMessages(messages, currentSearchTerm);
    renderMessages(filtered, currentSearchTerm);
  };

  searchInput.addEventListener('input', () => {
    applySearch();
  });

  // Экспортируем функцию для обновления сообщений
  window.updateTicketMessages = (newMessages) => {
    messages = newMessages;
    applySearch();
  };
}

function setupReplyForm(ticketId) {
  const form = document.getElementById('ticketReplyForm');
  const textarea = document.getElementById('replyText');
  if (!form || !textarea) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = textarea.value.trim();
    if (!text) {
      alert('Пожалуйста, введите сообщение');
      return;
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          message: text
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Очищаем форму
        textarea.value = '';
        
        // Перезагружаем тикет для получения новых сообщений
        const ticket = await loadTicket(ticketId);
        if (ticket && ticket.messages) {
          const messages = formatMessages(ticket.messages);
          if (window.updateTicketMessages) {
            window.updateTicketMessages(messages);
          } else {
            renderMessages(messages);
          }
        }
      } else {
        alert('Ошибка при отправке сообщения: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при отправке сообщения: ' + error.message);
    }
  });
}

function setupPowerBI() {
  const copyButtons = document.querySelectorAll('.powerbi-block__copy');
  const toggleButton = document.querySelector('.powerbi-block__toggle');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.closest('.powerbi-block__field');
      const code = field.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent).then(() => {
          const originalText = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1000);
        });
      }
    });
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const field = toggleButton.closest('.powerbi-block__field');
      const code = field.querySelector('code');
      if (code.textContent === '••••••••') {
        code.textContent = 'PowerBI2025!';
        toggleButton.textContent = '🙈';
      } else {
        code.textContent = '••••••••';
        toggleButton.textContent = '👁';
      }
    });
  }
}

function updateUnreadCount() {
  // Используем ту же функцию, что и в app.js для согласованности
  if (typeof updateUnreadSupportCount === 'function') {
    updateUnreadSupportCount();
  } else {
    // Fallback: просто обновляем счётчик
    const badges = document.querySelectorAll('#unreadSupportCount');
    badges.forEach(badge => {
      badge.textContent = '0';
      badge.style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const ticketId = getTicketIdFromURL();
  
  if (!ticketId) {
    alert('Тикет не найден. Перенаправление на список тикетов...');
    window.location.href = '/support/';
    return;
  }

  setupSearch();
  setupReplyForm(ticketId);
  setupPowerBI();
  updateUnreadCount();

  // Загружаем тикет и его сообщения
  const ticket = await setupTicketInfo(ticketId);
  if (ticket && ticket.messages) {
    const messages = formatMessages(ticket.messages);
    if (window.updateTicketMessages) {
      window.updateTicketMessages(messages);
    } else {
      renderMessages(messages);
    }
  }
});

