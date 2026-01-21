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

// Получение email пользователя
function getUserEmail() {
  const emailElement = document.getElementById('userEmail');
  return emailElement ? emailElement.getAttribute('data-user-email') : null;
}

// Проверка, является ли пользователь админом
function isAdminUser() {
  const email = getUserEmail();
  return email === 'admin@example.com';
}

// Загрузка тикетов с API
let ticketsData = [];

async function loadTickets() {
  showLoading();
  try {
    const response = await fetch('/api/tickets/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки тикетов');
    }

    const data = await response.json();
    ticketsData = data.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      preview: ticket.subject, // Используем тему как превью
      date: new Date(ticket.created_at),
      status: ticket.status,
      statusLabel: ticket.status_display,
      unread: ticket.has_unread || false,
      unreadCount: ticket.unread_count || 0,
      lastMessageDate: new Date(ticket.updated_at)
    }));
    
    hideLoading();
    return ticketsData;
  } catch (error) {
    hideLoading();
    console.error('Ошибка загрузки тикетов:', error);
    ticketsData = [];
    return [];
  }
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

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function groupTicketsByMonth(tickets) {
  const grouped = {};
  tickets.forEach(ticket => {
    const ticketDate = new Date(ticket.date);
    const monthKey = `${ticketDate.getFullYear()}-${ticketDate.getMonth()}`;
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: new Date(ticketDate),
        tickets: []
      };
    }
    grouped[monthKey].tickets.push(ticket);
  });
  return Object.values(grouped).sort((a, b) => b.month.getTime() - a.month.getTime());
}

function filterTickets(tickets, filter) {
  let filtered = tickets;

  // Фильтр по периоду
  if (filter.period && filter.period !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter.period) {
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        filtered = filtered.filter(t => {
          const ticketDate = new Date(t.date);
          ticketDate.setHours(0, 0, 0, 0);
          return ticketDate >= weekAgo;
        });
        break;
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(t => {
          const ticketDate = new Date(t.date);
          ticketDate.setHours(0, 0, 0, 0);
          return ticketDate >= startOfMonth;
        });
        break;
      }
      case 'custom': {
        if (filter.dateFrom && filter.dateTo) {
          const from = new Date(filter.dateFrom);
          from.setHours(0, 0, 0, 0);
          const to = new Date(filter.dateTo);
          to.setHours(23, 59, 59, 999);
          filtered = filtered.filter(t => {
            const ticketDate = new Date(t.date);
            ticketDate.setHours(0, 0, 0, 0);
            return ticketDate >= from && ticketDate <= to;
          });
        }
        break;
      }
    }
  }

  // Фильтр по поисковому запросу
  if (filter.search && filter.search.trim()) {
    const searchLower = filter.search.toLowerCase().trim();
    filtered = filtered.filter(t => {
      return t.subject.toLowerCase().includes(searchLower) ||
             t.preview.toLowerCase().includes(searchLower) ||
             t.id.toLowerCase().includes(searchLower);
    });
  }

  return filtered;
}

function renderTickets(tickets) {
  const container = document.getElementById('ticketsList');
  if (!container) return;

  if (!tickets || tickets.length === 0) {
    const emptyMessage = isAdminUser()
      ? '<p class="support-empty">Тикеты не найдены</p>'
      : '<p class="support-empty">У вас ещё нет тикетов.</p><p>Вы можете создать тикет, нажав кнопку "Создать тикет" выше.</p>';
    container.innerHTML = emptyMessage;
    return;
  }

  const grouped = groupTicketsByMonth(tickets);
  container.innerHTML = '';

  grouped.forEach(group => {
    const monthSection = document.createElement('div');
    monthSection.className = 'support-month';

    const monthHeader = document.createElement('div');
    monthHeader.className = 'support-month__header';
    monthHeader.innerHTML = `<h3>${formatMonthYear(group.month)}</h3>`;
    monthSection.appendChild(monthHeader);

    const monthList = document.createElement('div');
    monthList.className = 'support-month__list';

    group.tickets.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime()).forEach(ticket => {
      const card = document.createElement('a');
      card.href = `/support/support-ticket/?id=${ticket.id}`;
      card.className = 'ticket-card';
      if (ticket.unread) {
        card.classList.add('ticket-card--unread');
      }

      // Формируем текст для непрочитанных сообщений
      let unreadBadge = '';
      if (ticket.unread && ticket.unreadCount > 0) {
        const msgWord = ticket.unreadCount === 1 ? 'новое сообщение' : 
                        (ticket.unreadCount >= 2 && ticket.unreadCount <= 4) ? 'новых сообщения' : 'новых сообщений';
        unreadBadge = `<span class="ticket-card__unread-badge">${ticket.unreadCount} ${msgWord}</span>`;
      }

      card.innerHTML = `
        <div class="ticket-card__header">
          <h3 class="ticket-card__title">${ticket.subject}</h3>
          <div class="ticket-card__meta">
            <span class="ticket-card__date">${formatDateShort(ticket.lastMessageDate)}</span>
            <span class="ticket-card__badge ticket-card__badge--${ticket.status}">${ticket.statusLabel}</span>
          </div>
        </div>
        <p class="ticket-card__preview">${ticket.preview}</p>
        <div class="ticket-card__footer">
          <div class="ticket-card__info">
            <span class="ticket-card__info-item">#${ticket.id}</span>
          </div>
          ${unreadBadge}
        </div>
      `;
      monthList.appendChild(card);
    });

    monthSection.appendChild(monthList);
    container.appendChild(monthSection);
  });

  // Обновляем счётчик непрочитанных через общую функцию из app.js
  if (typeof updateUnreadSupportCount === 'function') {
    updateUnreadSupportCount();
  }
}

function updateUnreadCount() {
  // Всегда используем функцию из app.js для единообразия на всех страницах
  // Эта функция будет вызвана из DOMContentLoaded после загрузки app.js
  // Если app.js ещё не загружен, будет использован fallback
  const unreadCount = ticketsData.filter(t => t.unread).length;
  const badges = document.querySelectorAll('#unreadSupportCount');
  badges.forEach(badge => {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  });
}

function setupFilter() {
  const periodFilter = document.getElementById('ticketsPeriodFilter');
  const searchInput = document.getElementById('ticketsSearch');
  const customRange = document.getElementById('customDateRange');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');

  const filterState = { period: 'all', search: '', dateFrom: null, dateTo: null };

  const applyFilter = () => {
    filterState.period = periodFilter ? periodFilter.value : 'all';
    filterState.search = searchInput ? searchInput.value : '';
    
    if (filterState.period === 'custom') {
      filterState.dateFrom = dateFrom ? dateFrom.value : null;
      filterState.dateTo = dateTo ? dateTo.value : null;
      
      if (customRange) {
        customRange.hidden = !filterState.dateFrom || !filterState.dateTo;
      }
    } else {
      filterState.dateFrom = null;
      filterState.dateTo = null;
      if (customRange) {
        customRange.hidden = true;
      }
    }

    const filtered = filterTickets(ticketsData, filterState);
    renderTickets(filtered);
  };

  if (periodFilter) {
    periodFilter.addEventListener('change', () => {
      if (periodFilter.value === 'custom' && customRange) {
        customRange.hidden = false;
      } else if (customRange) {
        customRange.hidden = true;
      }
      applyFilter();
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilter, 300);
    });
  }

  if (dateFrom && dateTo) {
    dateFrom.addEventListener('change', applyFilter);
    dateTo.addEventListener('change', applyFilter);
  }

  // Инициализация
  applyFilter();
}

// Функции для работы с модальным окном
function openCreateTicketModal() {
  const modal = document.getElementById('create-ticket-modal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Фокус на первое поле формы
    const subjectInput = document.getElementById('ticketSubject');
    if (subjectInput) {
      setTimeout(() => subjectInput.focus(), 100);
    }
  }
}

function closeCreateTicketModal() {
  const modal = document.getElementById('create-ticket-modal');
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Очищаем форму
    const form = document.getElementById('createTicketForm');
    if (form) {
      form.reset();
    }
    // Скрываем ошибки
    const errorDiv = document.getElementById('createTicketError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
  }
}

function showCreateTicketError(message) {
  const errorDiv = document.getElementById('createTicketError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function setupCreateTicket() {
  const createBtn = document.getElementById('createTicketBtn');
  const modal = document.getElementById('create-ticket-modal');
  const form = document.getElementById('createTicketForm');
  
  if (!createBtn || !modal) return;

  // Открытие модального окна по кнопке
  createBtn.addEventListener('click', () => {
    openCreateTicketModal();
  });
  
  // Закрытие модального окна
  const closeButtons = modal.querySelectorAll('[data-modal-close]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      closeCreateTicketModal();
    });
  });
  
  // Закрытие по клавише Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeCreateTicketModal();
    }
  });
  
  // Обработка отправки формы
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const subjectInput = document.getElementById('ticketSubject');
      const messageInput = document.getElementById('ticketMessage');
      
      const subject = subjectInput ? subjectInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';
      
      if (!subject) {
        showCreateTicketError('Пожалуйста, введите тему обращения');
        return;
      }
      
      if (!message) {
        showCreateTicketError('Пожалуйста, введите сообщение');
        return;
      }
      
      // Скрываем ошибку и показываем загрузку
      const errorDiv = document.getElementById('createTicketError');
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
      
      showLoading();
      
      try {
        const response = await fetch('/api/tickets/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            subject: subject,
            message: message,
            priority: 'medium'
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Закрываем модальное окно
          closeCreateTicketModal();
          
          // Перезагружаем список тикетов
          await loadTickets();
          hideLoading();
          const filterState = { period: 'all', search: '', dateFrom: null, dateTo: null };
          const filtered = filterTickets(ticketsData, filterState);
          renderTickets(filtered);
        } else {
          hideLoading();
          showCreateTicketError(data.error || 'Произошла ошибка при создании тикета');
        }
      } catch (error) {
        hideLoading();
        showCreateTicketError('Произошла ошибка при создании тикета. Попробуйте ещё раз.');
        console.error('Ошибка при создании тикета:', error.message);
      }
    });
  }
}

function setupPowerBI() {
  const copyButtons = document.querySelectorAll('.powerbi-block__copy');
  const toggleButton = document.querySelector('.powerbi-block__toggle');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy-text') || '';
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const icon = btn.querySelector('i');
          if (icon) {
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-check';
            setTimeout(() => {
              icon.className = originalClass;
            }, 1000);
          }
        });
      }
    });
  });

  if (toggleButton) {
    let isPasswordVisible = false;
    toggleButton.addEventListener('click', () => {
      const field = toggleButton.closest('.powerbi-block__field');
      const code = field ? field.querySelector('code.powerbi-password') : null;
      const icon = toggleButton.querySelector('i');
      if (code) {
        if (!isPasswordVisible) {
          const password = code.getAttribute('data-password') || '';
          code.textContent = password;
          if (icon) {
            icon.className = 'fa-regular fa-eye-slash';
          }
          isPasswordVisible = true;
        } else {
          code.textContent = '••••••••';
          if (icon) {
            icon.className = 'fa-regular fa-eye';
          }
          isPasswordVisible = false;
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Загружаем тикеты с API
  await loadTickets();
  
  setupFilter();
  setupCreateTicket();
  setupPowerBI();
  // Функция updateUnreadSupportCount из app.js будет вызвана автоматически
  // после загрузки всех скриптов. Но для синхронизации также вызываем её здесь
  // с небольшой задержкой, чтобы app.js успел загрузиться
  setTimeout(() => {
    if (typeof updateUnreadSupportCount === 'function') {
      updateUnreadSupportCount();
    }
  }, 100);
});

