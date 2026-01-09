// Моковые данные подписок (даты рассчитываются динамически)
function generateSubscriptionsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [
    {
      id: '1',
      title: 'Продажи и финансы',
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // через 3 дня
      amount: 36000,
      status: 'expiring-soon',
      isActive: true
    },
    {
      id: '2',
      title: 'Оптимизатор рекламы',
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // через 5 дней
      amount: 15000,
      status: 'expiring-soon',
      isActive: true
    },
    {
      id: '3',
      title: 'Логистика и склады',
      options: ['OZON', '2 кабинета'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000), // через 15 дней
      amount: 24000,
      status: 'active',
      isActive: true
    },
    {
      id: '4',
      title: 'Продажи и финансы',
      options: ['Wildberries', 'OZON', '1 кабинет'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000), // через 25 дней
      amount: 18000,
      status: 'active',
      isActive: true
    },
    {
      id: '5',
      title: 'Оптимизатор рекламы',
      options: ['OZON', '2 кабинета'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000), // через 35 дней
      amount: 30000,
      status: 'active',
      isActive: true
    },
    {
      id: '6',
      title: 'Логистика и склады',
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000), // через 45 дней
      amount: 12000,
      status: 'active',
      isActive: true
    },
    {
      id: '7',
      title: 'Продажи и финансы',
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // истекла 5 дней назад
      amount: 18000,
      status: 'inactive',
      isActive: false
    },
    {
      id: '8',
      title: 'Оптимизатор рекламы',
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // истекла 10 дней назад
      amount: 30000,
      status: 'inactive',
      isActive: false
    },
    {
      id: '9',
      title: 'Логистика и склады',
      options: ['OZON', '1 кабинет'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // истекла 15 дней назад
      amount: 12000,
      status: 'inactive',
      isActive: false
    },
    {
      id: '10',
      title: 'Продажи и финансы',
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 85 * 24 * 60 * 60 * 1000), // через 85 дней
      amount: 36000,
      status: 'active',
      isActive: true
    }
  ];
}

const subscriptionsData = generateSubscriptionsData();

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getDaysUntilExpiry(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function isExpiringSoon(date, days = 5) {
  const daysUntil = getDaysUntilExpiry(date);
  return daysUntil >= 0 && daysUntil <= days;
}

function filterSubscriptions(subscriptions, statusFilter, marketFilter) {
  let filtered = subscriptions;
  
  // Фильтр по статусу
  if (statusFilter && statusFilter !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    switch (statusFilter) {
      case 'expiring-week':
        filtered = filtered.filter(sub => {
          const expiry = new Date(sub.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today && expiry <= nextWeek && sub.isActive;
        });
        break;
      case 'expiring-month':
        filtered = filtered.filter(sub => {
          const expiry = new Date(sub.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today && expiry <= nextMonth && sub.isActive;
        });
        break;
      case 'active':
        filtered = filtered.filter(sub => {
          const expiry = new Date(sub.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today && sub.isActive;
        });
        break;
      case 'inactive':
        filtered = filtered.filter(sub => !sub.isActive);
        break;
    }
  }
  
  // Фильтр по маркетплейсу
  if (marketFilter && marketFilter !== 'all') {
    filtered = filtered.filter(sub => {
      return sub.markets && sub.markets.includes(marketFilter);
    });
  }
  
  return filtered;
}

function renderSubscriptions(subscriptions) {
  const grid = document.getElementById('subscriptionsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (subscriptions.length === 0) {
    grid.innerHTML = '<p class="subscriptions-empty">Подписки не найдены</p>';
    return;
  }

  subscriptions.forEach(sub => {
    const card = document.createElement('article');
    card.className = 'subscription-card';
    if (!sub.isActive) {
      card.classList.add('subscription-card--inactive');
    }
    const daysUntil = getDaysUntilExpiry(sub.expiryDate);
    const isSoon = isExpiringSoon(sub.expiryDate) && sub.isActive;
    
    card.innerHTML = `
      <div class="subscription-card__header">
        <h3 class="subscription-card__title">${sub.title}</h3>
        ${isSoon ? '<span class="subscription-card__badge">Истекает скоро</span>' : ''}
        ${!sub.isActive ? '<span class="subscription-card__badge subscription-card__badge--inactive">Неактивна</span>' : ''}
      </div>
      <div class="subscription-card__options">
        <span class="subscription-card__label">Подключенные опции:</span>
        <div class="subscription-card__chips">
          ${sub.options.map(opt => `<span class="chip">${opt}</span>`).join('')}
        </div>
      </div>
      <div class="subscription-card__info">
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Дата завершения:</span>
          <strong>${formatDate(sub.expiryDate)}</strong>
          ${daysUntil >= 0 && sub.isActive ? `<span class="subscription-card__days">(${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'})</span>` : ''}
          ${!sub.isActive ? `<span class="subscription-card__days subscription-card__days--expired">(истекла ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'день' : Math.abs(daysUntil) < 5 ? 'дня' : 'дней'} назад)</span>` : ''}
        </div>
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Сумма:</span>
          <strong class="subscription-card__amount">${formatMoney(sub.amount)} ₽/мес</strong>
        </div>
      </div>
      <div class="subscription-card__actions">
        ${sub.isActive 
          ? `<a href="subscription.html?id=${sub.id}" class="button button--primary button--block">Управлять</a>`
          : `<a href="subscription.html?id=${sub.id}" class="button button--secondary subscription-card__manage-btn">Управлять</a>
             <button class="button button--primary subscription-card__pay-btn" onclick="alert('Переход на страницу оплаты')">Оплатить</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAlert(subscriptions) {
  const alert = document.getElementById('subscriptionsAlert');
  const alertList = document.querySelector('[data-alert-list]');
  if (!alert || !alertList) return;

  // Показываем только активные подписки, которые истекают скоро
  const expiringSoon = subscriptions.filter(sub => 
    sub.isActive && isExpiringSoon(sub.expiryDate)
  );
  
  if (expiringSoon.length === 0) {
    alert.hidden = true;
    return;
  }

  alert.hidden = false;
  alertList.innerHTML = '';

  expiringSoon.forEach(sub => {
    const li = document.createElement('li');
    const daysUntil = getDaysUntilExpiry(sub.expiryDate);
    li.innerHTML = `
      <strong>${sub.title}</strong> — истекает через ${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'} (${formatDate(sub.expiryDate)})
      <a href="subscription.html?id=${sub.id}" class="subscriptions-alert__link">Управлять</a>
    `;
    alertList.appendChild(li);
  });
}

function setupFilter() {
  const statusFilter = document.getElementById('subscriptionsStatusFilter');
  const marketFilter = document.getElementById('subscriptionsMarketFilter');
  
  if (!statusFilter || !marketFilter) return;

  let currentStatusFilter = 'all';
  let currentMarketFilter = 'all';

  const applyFilters = () => {
    const filtered = filterSubscriptions(subscriptionsData, currentStatusFilter, currentMarketFilter);
    renderSubscriptions(filtered);
  };

  statusFilter.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    applyFilters();
  });

  marketFilter.addEventListener('change', (e) => {
    currentMarketFilter = e.target.value;
    applyFilters();
  });

  // Инициализация
  applyFilters();
}

function setupExport() {
  const exportBtn = document.getElementById('exportSubscriptions');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    // В прототипе просто показываем сообщение
    alert('Функция выгрузки в CSV/Excel будет реализована в полной версии');
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
  setupExport();
  setupPowerBI();
  renderAlert(subscriptionsData);
});

