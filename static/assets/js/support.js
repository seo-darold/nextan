// Генерация моковых данных тикетов
function generateTicketsData() {
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

  // Генерируем тикеты за последние 8 месяцев
  // Используем детерминированный подход для стабильности данных
  const seed = 12345; // Для стабильной генерации
  
  for (let monthOffset = 0; monthOffset < 8; monthOffset++) {
    // По 4 тикета в месяц для стабильности
    const ticketsPerMonth = 4;
    
    for (let i = 0; i < ticketsPerMonth; i++) {
      const ticketDate = new Date(today);
      ticketDate.setMonth(today.getMonth() - monthOffset);
      
      // Детерминированный день месяца
      const day = 5 + i * 7;
      ticketDate.setDate(day > 28 ? 28 : day);
      ticketDate.setHours(9 + (i % 8), (i * 13) % 60, 0, 0);
      
      // Проверяем, что дата не в будущем
      if (ticketDate <= new Date()) {
        const subjectIndex = (monthOffset * ticketsPerMonth + i) % subjects.length;
        // Детерминированный статус
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
  
  // Сортируем по дате последнего сообщения (новые сверху)
  return tickets.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
}

let ticketsData = generateTicketsData();

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
            <span class="ticket-card__info-item">${ticket.id}</span>
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
    // В прототипе показываем сообщение
    alert('Функция создания тикета будет реализована в полной версии. Для создания тикета обращайтесь в поддержку по email: support@pulsebi.ru');
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

document.addEventListener('DOMContentLoaded', () => {
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

