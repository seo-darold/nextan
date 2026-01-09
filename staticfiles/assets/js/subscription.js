// Данные подписок для расчета цены
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

// Моковые данные для истории платежей по подписке
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

const subscriptionPaymentsData = {};
// Генерируем платежи для всех подписок
Object.keys(subscriptionDetails).forEach(id => {
  subscriptionPaymentsData[id] = generateSubscriptionPayments(id);
});

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

function renderPaymentsHistory(subscriptionId) {
  const container = document.getElementById('paymentsHistory');
  if (!container) {
    console.warn('Container paymentsHistory not found');
    return;
  }

  // Убеждаемся, что данные сгенерированы
  if (!subscriptionPaymentsData[subscriptionId]) {
    subscriptionPaymentsData[subscriptionId] = generateSubscriptionPayments(subscriptionId);
  }

  const payments = subscriptionPaymentsData[subscriptionId] || [];
  
  if (payments.length === 0) {
    container.innerHTML = '<p class="payments-empty">История платежей пуста</p>';
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

function setupOptionsEditor(subscriptionId) {
  const details = subscriptionDetails[subscriptionId];
  if (!details) return;

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

function setupPayButton(subscriptionId) {
  const details = subscriptionDetails[subscriptionId];
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

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subscriptionId = urlParams.get('id') || '1';
  
  setupOptionsEditor(subscriptionId);
  renderPaymentsHistory(subscriptionId);
  setupSaveButton();
  setupPayButton(subscriptionId);
  setupPowerBI();
});

