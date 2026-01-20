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

// Данные подписок для расчета цены (только для админа)
const subscriptionDetails = {
  '1': {
    title: 'Продажи и финансы',
    basePrice: 18000,
    currentMarkets: ['Wildberries', 'OZON'],
    currentCabinets: 2,
    isActive: true
  },
  '2': {
    title: 'Оптимизатор рекламы',
    basePrice: 15000,
    currentMarkets: ['Wildberries'],
    currentCabinets: 1,
    isActive: true
  },
  '3': {
    title: 'Логистика и склады',
    basePrice: 12000,
    currentMarkets: ['OZON'],
    currentCabinets: 2,
    isActive: true
  },
  '4': {
    title: 'Продажи и финансы',
    basePrice: 18000,
    currentMarkets: ['Wildberries', 'OZON'],
    currentCabinets: 1,
    isActive: true
  },
  '5': {
    title: 'Оптимизатор рекламы',
    basePrice: 15000,
    currentMarkets: ['OZON'],
    currentCabinets: 2,
    isActive: true
  },
  '6': {
    title: 'Логистика и склады',
    basePrice: 12000,
    currentMarkets: ['Wildberries'],
    currentCabinets: 1,
    isActive: true
  },
  '7': {
    title: 'Продажи и финансы',
    basePrice: 18000,
    currentMarkets: ['Wildberries'],
    currentCabinets: 1,
    isActive: false
  },
  '8': {
    title: 'Оптимизатор рекламы',
    basePrice: 15000,
    currentMarkets: ['Wildberries', 'OZON'],
    currentCabinets: 2,
    isActive: false
  },
  '9': {
    title: 'Логистика и склады',
    basePrice: 12000,
    currentMarkets: ['OZON'],
    currentCabinets: 1,
    isActive: false
  },
  '10': {
    title: 'Продажи и финансы',
    basePrice: 18000,
    currentMarkets: ['Wildberries', 'OZON'],
    currentCabinets: 2,
    isActive: true
  }
};

function calcPrice(basePrice, markets, cabinets) {
  if (!markets.length) return 0;
  return basePrice * markets.length * cabinets;
}

// Загрузка данных подписки с API
let currentSubscriptionData = null;

async function loadSubscriptionData(subscriptionId) {
  try {
    // Загружаем список подписок и находим нужную
    const response = await fetch('/api/subscriptions/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки подписки');
    }

    const data = await response.json();
    const subscription = data.find(sub => String(sub.id) === String(subscriptionId));
    
    if (subscription) {
      // Получаем информацию о дашборде для расчета базовой цены
      const dashboardsResponse = await fetch('/api/dashboards/', {
        method: 'GET',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'same-origin',
      });
      
      let basePrice = subscription.price_per_month;
      if (dashboardsResponse.ok) {
        const dashboards = await dashboardsResponse.json();
        const dashboard = dashboards.find(d => d.id === subscription.dashboard_id);
        if (dashboard) {
          basePrice = dashboard.base_price;
        }
      }
      
      // Определяем маркетплейсы из кабинета
      const markets = subscription.cabinet_name ? 
        (subscription.cabinet_name.includes('WB') || subscription.cabinet_name.includes('Wildberries') ? ['Wildberries'] : ['OZON']) : 
        [];
      
      currentSubscriptionData = {
        title: subscription.dashboard_title,
        basePrice: basePrice,
        currentMarkets: markets,
        currentCabinets: 1, // Можно улучшить, если будет информация о количестве кабинетов
        isActive: subscription.status === 'active'
      };
    }
    
    return currentSubscriptionData;
  } catch (error) {
    console.error('Ошибка загрузки подписки:', error);
    return null;
  }
}

// Загрузка платежей подписки с API
async function loadSubscriptionPayments(subscriptionId) {
  try {
    const response = await fetch('/api/payments/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки платежей');
    }

    const data = await response.json();
    // Фильтруем платежи по subscription_id
    const subscriptionPayments = data
      .filter(payment => payment.subscription_id && String(payment.subscription_id) === String(subscriptionId))
      .map(payment => ({
        date: new Date(payment.created_at),
        amount: payment.amount,
        period: '3 месяца', // Можно улучшить, если будет информация о периоде
        status: payment.status === 'completed' ? 'paid' : 'pending'
      }))
      .sort((a, b) => b.date - a.date);
    
    return subscriptionPayments;
  } catch (error) {
    console.error('Ошибка загрузки платежей:', error);
    return [];
  }
}

// Моковые данные для истории платежей по подписке (только для админа)
function generateSubscriptionPayments(subscriptionId) {
  const today = new Date();
  const payments = [];
  
  // Генерируем 4 платежа для каждой подписки
  for (let i = 0; i < 4; i++) {
    const monthsAgo = (i + 1) * 3; // каждые 3 месяца
    const paymentDate = new Date(today);
    paymentDate.setMonth(today.getMonth() - monthsAgo);
    
    const details = subscriptionDetails[subscriptionId];
    if (details) {
      const amount = calcPrice(details.basePrice, details.currentMarkets, details.currentCabinets);
      payments.push({
        date: paymentDate,
        amount: amount,
        period: '3 месяца',
        status: 'paid'
      });
    }
  }
  
  return payments.sort((a, b) => b.date - a.date);
}

// Тестовые данные платежей (только для админа)
const subscriptionPaymentsData = {};

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

async function renderPaymentsHistory(subscriptionId) {
  const container = document.getElementById('paymentsHistory');
  if (!container) {
    console.warn('Container paymentsHistory not found');
    return;
  }

  let payments = [];
  
  if (isAdminUser()) {
    // Для админа используем тестовые данные
    // Инициализируем данные для всех подписок при первом использовании
    if (Object.keys(subscriptionPaymentsData).length === 0) {
      Object.keys(subscriptionDetails).forEach(id => {
        subscriptionPaymentsData[id] = generateSubscriptionPayments(id);
      });
    }
    if (!subscriptionPaymentsData[subscriptionId]) {
      subscriptionPaymentsData[subscriptionId] = generateSubscriptionPayments(subscriptionId);
    }
    payments = subscriptionPaymentsData[subscriptionId] || [];
  } else {
    // Для обычных пользователей загружаем из API
    payments = await loadSubscriptionPayments(subscriptionId);
  }
  
  if (payments.length === 0) {
    const emptyMessage = isAdminUser()
      ? '<p class="payments-empty">История платежей пуста</p>'
      : '<p class="payments-empty">У вас ещё нет платежей по этой подписке.</p>';
    container.innerHTML = emptyMessage;
    return;
  }

  container.innerHTML = '';

  payments.forEach(payment => {
    const item = document.createElement('div');
    item.className = 'payment-item';
    item.innerHTML = `
      <div class="payment-item__date">
        <strong>${formatDate(payment.date)}</strong>
      </div>
      <div class="payment-item__details">
        <div class="payment-item__amount">${formatMoney(payment.amount)} ₽</div>
        <div class="payment-item__period">Подписка на ${payment.period}</div>
        <div class="payment-item__status payment-item__status--${payment.status}">
          ${payment.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

async function setupOptionsEditor(subscriptionId) {
  let details;
  
  if (isAdminUser()) {
    // Для админа используем тестовые данные
    details = subscriptionDetails[subscriptionId];
    if (!details) return;
  } else {
    // Для обычных пользователей загружаем из API
    details = await loadSubscriptionData(subscriptionId);
    if (!details) {
      console.warn('Subscription details not found for id:', subscriptionId);
      return;
    }
  }

  // Установка текущих значений
  const marketCheckboxes = document.querySelectorAll('input[name="marketplaces"]');
  marketCheckboxes.forEach(cb => {
    cb.checked = details.currentMarkets.includes(cb.value);
  });

  const cabinetSelect = document.querySelector('select[name="cabinets"]');
  if (cabinetSelect) {
    cabinetSelect.value = String(details.currentCabinets);
  }

  // Установка значения количества месяцев (по умолчанию 3)
  const monthsSelect = document.querySelector('select[name="months"]');
  if (monthsSelect) {
    monthsSelect.value = '3';
  }

  // Обновление заголовка
  const title = document.getElementById('subscriptionTitle');
  if (title) {
    title.textContent = details.title;
  }
  

  // Расчет и отображение цены
  const updatePrice = () => {
    const selectedMarkets = Array.from(document.querySelectorAll('input[name="marketplaces"]:checked'))
      .map(cb => cb.value);
    const selectedCabinets = cabinetSelect ? Number(cabinetSelect.value) : details.currentCabinets;
    const selectedMonths = monthsSelect ? Number(monthsSelect.value) : 3;
    const pricePerMonth = calcPrice(details.basePrice, selectedMarkets, selectedCabinets);
    const totalPrice = pricePerMonth * selectedMonths;
    const priceElement = document.getElementById('newPrice');
    if (priceElement) {
      priceElement.textContent = `${formatMoney(pricePerMonth)} ₽/мес (${formatMoney(totalPrice)} ₽ за ${selectedMonths} ${selectedMonths === 1 ? 'месяц' : selectedMonths < 5 ? 'месяца' : 'месяцев'})`;
    }
  };

  // Слушатели изменений
  marketCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('input[name="marketplaces"]:checked'));
      if (selected.length === 0) {
        // Если все сняты, включаем первый обратно
        marketCheckboxes[0].checked = true;
      }
      updatePrice();
      showNotice();
    });
  });

  if (cabinetSelect) {
    cabinetSelect.addEventListener('change', () => {
      updatePrice();
      showNotice();
    });
  }

  if (monthsSelect) {
    monthsSelect.addEventListener('change', () => {
      updatePrice();
      showNotice();
    });
  }

  updatePrice();
}

function showNotice() {
  const notice = document.getElementById('subscriptionNotice');
  if (notice) {
    notice.hidden = false;
  }
}

function setupSaveButton() {
  const saveBtn = document.getElementById('saveOptions');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    // В прототипе просто показываем сообщение
    alert('Изменения сохранены. Они вступят в силу по завершении текущего оплаченного периода подписки.');
    const notice = document.getElementById('subscriptionNotice');
    if (notice) {
      notice.hidden = false;
    }
  });
}

async function setupPayButton(subscriptionId) {
  let details;
  
  if (isAdminUser()) {
    details = subscriptionDetails[subscriptionId];
  } else {
    details = await loadSubscriptionData(subscriptionId);
  }
  
  if (!details) {
    console.warn('Subscription details not found for id:', subscriptionId);
    return;
  }
  
  // Показываем статус подписки для всех подписок
  const statusBadge = document.getElementById('subscriptionStatusBadge');
  if (statusBadge) {
    if (details.isActive) {
      statusBadge.textContent = 'Активна';
      statusBadge.className = 'subscription-status-badge subscription-status-badge--active';
      statusBadge.style.display = 'inline-block';
    } else {
      statusBadge.textContent = 'Неактивна';
      statusBadge.className = 'subscription-status-badge subscription-status-badge--inactive';
      statusBadge.style.display = 'inline-block';
    }
  }
  
  // Добавляем кнопку "Оплатить" только для неактивных подписок
  if (details.isActive) {
    return;
  }
  
  const actionsContainer = document.getElementById('subscriptionActions');
  if (!actionsContainer) {
    console.error('subscriptionActions container not found!');
    return;
  }
  
  // Проверяем, не добавлена ли уже кнопка
  if (document.getElementById('paySubscriptionBtn')) {
    return;
  }
  
  // Добавляем кнопку "Оплатить" перед кнопкой "Сохранить"
  const payButton = document.createElement('button');
  payButton.id = 'paySubscriptionBtn';
  payButton.className = 'button button--primary';
  payButton.textContent = 'Оплатить';
  payButton.type = 'button';
  payButton.addEventListener('click', () => {
    alert('Переход на страницу оплаты');
  });
  
  // Вставляем перед кнопкой "Сохранить"
  const saveBtn = document.getElementById('saveOptions');
  if (saveBtn) {
    actionsContainer.insertBefore(payButton, saveBtn);
  } else {
    actionsContainer.appendChild(payButton);
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
      const code = field ? field.querySelector('code.powerbi-password') : null;
      if (code) {
        if (code.textContent === '••••••••') {
          const password = code.getAttribute('data-password') || '';
          code.textContent = password;
          toggleButton.textContent = '🙈';
        } else {
          code.textContent = '••••••••';
          toggleButton.textContent = '👁';
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subscriptionId = urlParams.get('id') || '1';
  
  await setupOptionsEditor(subscriptionId);
  await renderPaymentsHistory(subscriptionId);
  setupSaveButton();
  await setupPayButton(subscriptionId);
  setupPowerBI();
});

