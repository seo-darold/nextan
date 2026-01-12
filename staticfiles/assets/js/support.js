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

// Загрузка тикетов с API
let ticketsData = [];

async function loadTickets() {
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
      lastMessageDate: new Date(ticket.updated_at)
    }));
    
    return ticketsData;
  } catch (error) {
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
    container.innerHTML = '<p class="support-empty">Тикеты не найдены</p>';
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
          ${ticket.unread ? '<span class="ticket-card__info-item">Новое сообщение</span>' : ''}
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

function setupCreateTicket() {
  const createBtn = document.getElementById('createTicketBtn');
  if (!createBtn) return;

  createBtn.addEventListener('click', () => {
    const subject = prompt('Введите тему тикета:');
    if (!subject) return;
    
    const message = prompt('Введите сообщение:');
    if (!message) return;
    
    // Создание тикета через API
    fetch('/api/tickets/', {
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
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Тикет успешно создан!');
        // Перезагружаем список тикетов
        loadTickets().then(() => {
          const filterState = { period: 'all', search: '', dateFrom: null, dateTo: null };
          const filtered = filterTickets(ticketsData, filterState);
          renderTickets(filtered);
        });
      } else {
        alert('Ошибка при создании тикета: ' + (data.error || 'Неизвестная ошибка'));
      }
    })
    .catch(error => {
      console.error('Ошибка:', error);
      alert('Ошибка при создании тикета: ' + error.message);
    });
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
      const code = field.querySelector('code');
      const icon = toggleButton.querySelector('i');
      if (!isPasswordVisible) {
        code.textContent = 'PowerBI2025!';
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

