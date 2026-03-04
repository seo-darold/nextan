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

// Моковые данные подписок (даты рассчитываются динамически) - только для админа
function generateSubscriptionsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [
    {
      id: '1',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Продажи и финансы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // через 3 дня
      amount: 36000,
      price_per_month: 36000,
      status: 'expiring-soon',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '2',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Оптимизатор рекламы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      amount: 15000,
      price_per_month: 15000,
      status: 'expiring-soon',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '3',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Логистика и склады',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['OZON', '2 кабинета'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
      amount: 24000,
      price_per_month: 24000,
      status: 'active',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '4',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Продажи и финансы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', 'OZON', '1 кабинет'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),
      amount: 18000,
      price_per_month: 18000,
      status: 'active',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '5',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Оптимизатор рекламы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['OZON', '2 кабинета'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000),
      amount: 30000,
      price_per_month: 30000,
      status: 'active',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '6',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Логистика и склады',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000),
      amount: 12000,
      price_per_month: 12000,
      status: 'active',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    },
    {
      id: '7',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Продажи и финансы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', '1 кабинет'],
      markets: ['Wildberries'],
      expiryDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      amount: 18000,
      price_per_month: 18000,
      status: 'inactive',
      statusRaw: 'expired',
      status_display: 'Истекла',
      isActive: false,
      auto_renewal: false
    },
    {
      id: '8',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Оптимизатор рекламы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      amount: 30000,
      price_per_month: 30000,
      status: 'inactive',
      statusRaw: 'expired',
      status_display: 'Истекла',
      isActive: false,
      auto_renewal: false
    },
    {
      id: '9',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Логистика и склады',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['OZON', '1 кабинет'],
      markets: ['OZON'],
      expiryDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      amount: 12000,
      price_per_month: 12000,
      status: 'inactive',
      statusRaw: 'expired',
      status_display: 'Истекла',
      isActive: false,
      auto_renewal: false
    },
    {
      id: '10',
      cabinet_id: null,
      cabinet_name: '',
      dashboard_id: null,
      title: 'Продажи и финансы',
      months: 1,
      start_date: null,
      end_date: null,
      options: ['Wildberries', 'OZON', '2 кабинета'],
      markets: ['Wildberries', 'OZON'],
      expiryDate: new Date(today.getTime() + 85 * 24 * 60 * 60 * 1000),
      amount: 36000,
      price_per_month: 36000,
      status: 'active',
      statusRaw: 'active',
      status_display: 'Активна',
      isActive: true,
      auto_renewal: false
    }
  ];
}

// Загрузка подписок с API
let subscriptionsData = [];

async function loadSubscriptions() {
  showLoading();
  try {
    const response = await fetch('/api/subscriptions/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки подписок');
    }

    const data = await response.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    subscriptionsData = data.map(sub => {
      const endDate = new Date(sub.end_date);
      endDate.setHours(0, 0, 0, 0);
      const isActive = sub.status === 'active' && endDate >= today;
      const daysUntil = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      // Определяем маркетплейсы из кабинета
      const markets = sub.cabinet_name ? [sub.cabinet_name.includes('WB') || sub.cabinet_name.includes('Wildberries') ? 'Wildberries' : 'OZON'] : [];
      const options = markets.length > 0 ? [...markets, '1 кабинет'] : ['1 кабинет'];
      
      return {
        id: String(sub.id),
        cabinet_id: sub.cabinet_id,
        cabinet_name: sub.cabinet_name || '',
        dashboard_id: sub.dashboard_id,
        title: sub.dashboard_title,
        months: sub.months,
        start_date: sub.start_date,
        end_date: sub.end_date,
        expiryDate: endDate,
        options: options,
        markets: markets,
        amount: sub.price_per_month,
        price_per_month: sub.price_per_month,
        status: isActive ? (daysUntil <= 5 ? 'expiring-soon' : 'active') : 'inactive',
        statusRaw: sub.status,
        status_display: sub.status_display || sub.status,
        isActive: isActive,
        auto_renewal: sub.auto_renewal
      };
    });
    
    hideLoading();
    return subscriptionsData;
  } catch (error) {
    hideLoading();
    console.error('Ошибка загрузки подписок:', error);
    subscriptionsData = [];
    return [];
  }
}

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
    if (isAdminUser()) {
      grid.innerHTML = '<p class="subscriptions-empty">Подписки не найдены</p>';
    } else {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'subscriptions-empty';
      emptyDiv.innerHTML = `
        <p>У вас ещё нет подписок.</p>
        <p>Вы можете оформить её прямо сейчас.</p>
        <a href="/#configurator" class="button button--primary" style="margin-top: 16px; display: inline-block;">Добавить инструменты</a>
      `;
      grid.innerHTML = '';
      grid.appendChild(emptyDiv);
    }
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
    let statusBadge = '';
    if (sub.statusRaw === 'pending') {
      statusBadge = '<span class="subscription-card__badge subscription-card__badge--pending">Ожидает оплаты</span>';
    } else if (sub.isActive && isSoon) {
      statusBadge = '<span class="subscription-card__badge">Истекает скоро</span>';
    } else if (sub.isActive) {
      statusBadge = '<span class="subscription-card__badge subscription-card__badge--active">Активна</span>';
    } else {
      statusBadge = '<span class="subscription-card__badge subscription-card__badge--inactive">Неактивна</span>';
    }
    card.innerHTML = `
      <div class="subscription-card__header">
        <h3 class="subscription-card__title">${sub.title}</h3>
        ${statusBadge}
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
          ? `<a href="/subscription/?id=${sub.id}" class="button button--primary button--block">Управлять</a>`
          : `<a href="/subscription/?id=${sub.id}" class="button button--secondary subscription-card__manage-btn">Управлять</a>
             <a href="/subscription/?id=${sub.id}" class="button button--primary subscription-card__pay-btn">Оплатить</a>`
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

  // Показываем только активные подписки, которые истекают скоро (в течение 5 дней)
  const expiringSoon = subscriptions.filter(sub => 
    sub.isActive && isExpiringSoon(sub.expiryDate, 5)
  );
  
  // Если нет подписок, истекающих в течение 5 дней, скрываем блок полностью
  if (expiringSoon.length === 0) {
    alert.hidden = true;
    alert.style.display = 'none';
    return;
  }

  // Если есть подписки, истекающие скоро, показываем блок
  alert.hidden = false;
  alert.style.display = '';
  alertList.innerHTML = '';

  expiringSoon.forEach(sub => {
    const li = document.createElement('li');
    const daysUntil = getDaysUntilExpiry(sub.expiryDate);
    li.innerHTML = `
      <strong>${sub.title}</strong> — истекает через ${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'} (${formatDate(sub.expiryDate)})
      <a href="/subscription/?id=${sub.id}" class="subscriptions-alert__link">Управлять</a>
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

/** Экранирование значения для CSV. Заключаем в кавычки при запятой, точке с запятой (чтобы Excel в русской локали не разбивал ячейку), переводах строки и кавычках. */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Выгрузка подписок в CSV с учётом текущих фильтров и всех полей */
function exportSubscriptionsToCsv() {
  const { filtered, columns, formatCell } = getSubscriptionsExportData();
  if (filtered.length === 0) {
    alert('Нет данных для выгрузки.');
    return;
  }
  const headerRow = columns.map(c => escapeCsvCell(c.label)).join(',');
  const dataRows = filtered.map(sub =>
    columns.map(c => escapeCsvCell(formatCell(sub, c))).join(',')
  );
  const csv = '\uFEFF' + headerRow + '\r\n' + dataRows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subscriptions_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Общие колонки и форматтер для подписок (для CSV и Excel) */
function getSubscriptionsExportData() {
  const statusFilter = document.getElementById('subscriptionsStatusFilter');
  const marketFilter = document.getElementById('subscriptionsMarketFilter');
  const currentStatus = statusFilter ? statusFilter.value : 'all';
  const currentMarket = marketFilter ? marketFilter.value : 'all';
  const filtered = filterSubscriptions(subscriptionsData, currentStatus, currentMarket);
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'cabinet_id', label: 'ID кабинета' },
    { key: 'cabinet_name', label: 'Кабинет' },
    { key: 'dashboard_id', label: 'ID дашборда' },
    { key: 'title', label: 'Название дашборда' },
    { key: 'months', label: 'Месяцев' },
    { key: 'start_date', label: 'Дата начала' },
    { key: 'end_date', label: 'Дата окончания' },
    { key: 'expiryDate', label: 'Дата окончания (отображение)' },
    { key: 'options', label: 'Подключенные опции' },
    { key: 'markets', label: 'Маркетплейсы' },
    { key: 'price_per_month', label: 'Сумма (₽/мес)' },
    { key: 'amount', label: 'Сумма' },
    { key: 'status', label: 'Статус' },
    { key: 'statusRaw', label: 'Статус (код)' },
    { key: 'status_display', label: 'Статус (отображение)' },
    { key: 'isActive', label: 'Активна' },
    { key: 'auto_renewal', label: 'Автопродление' }
  ];
  const formatCell = (sub, col) => {
    let val = sub[col.key];
    if (val === null || val === undefined) return '';
    if (col.key === 'expiryDate' && val instanceof Date) {
      return val.toISOString ? val.toISOString().slice(0, 10) : String(val);
    }
    if (Array.isArray(val)) return val.join('; ');
    if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
    return val;
  };
  return { filtered, columns, formatCell };
}

/** Выгрузка подписок в Excel (.xlsx) */
function exportSubscriptionsToExcel() {
  const { filtered, columns, formatCell } = getSubscriptionsExportData();
  if (filtered.length === 0) {
    alert('Нет данных для выгрузки.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('Библиотека Excel недоступна. Выгрузите в CSV.');
    return;
  }
  const headerRow = columns.map(c => c.label);
  const dataRows = filtered.map(sub => columns.map(c => formatCell(sub, c)));
  const aoa = [headerRow].concat(dataRows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Подписки');
  XLSX.writeFile(wb, 'subscriptions_' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

function setupExport() {
  const exportBtn = document.getElementById('exportSubscriptions');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    if (typeof showExportFormatDialog !== 'function') {
      exportSubscriptionsToCsv();
      return;
    }
    showExportFormatDialog({
      csv: exportSubscriptionsToCsv,
      xlsx: exportSubscriptionsToExcel
    });
  });
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
  // Если пользователь не админ, загружаем данные из API
  if (!isAdminUser()) {
    await loadSubscriptions();
  } else {
    // Для админа используем тестовые данные
    subscriptionsData = generateSubscriptionsData();
  }
  
  setupFilter();
  setupExport();
  setupPowerBI();
  renderAlert(subscriptionsData);
});

