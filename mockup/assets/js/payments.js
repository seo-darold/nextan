// Генерация моковых данных платежей (около 50 записей)
function generatePaymentsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payments = [];
  const tools = ['Продажи и финансы', 'Оптимизатор рекламы', 'Логистика и склады'];
  const amounts = [36000, 15000, 24000, 18000, 30000, 12000];
  
  // Генерируем платежи за последние 10 месяцев
  for (let monthOffset = 0; monthOffset < 10; monthOffset++) {
    // По 5 платежей в месяц
    for (let i = 0; i < 5; i++) {
      const paymentDate = new Date(today);
      paymentDate.setMonth(today.getMonth() - monthOffset);
      
      // Устанавливаем день (5, 10, 15, 20, 25)
      const day = Math.min(5 + i * 5, 28); // Максимум 28, чтобы избежать проблем с разной длиной месяцев
      paymentDate.setDate(day);
      paymentDate.setHours(0, 0, 0, 0);
      
      // Проверяем, что дата не в будущем
      if (paymentDate <= today) {
        const tool = tools[i % tools.length];
        const amount = amounts[i % amounts.length];
        
        payments.push({
          date: new Date(paymentDate),
          amount: amount,
          tool: tool,
          period: '3 месяца',
          status: 'paid'
        });
      }
    }
  }
  
  // Сортируем по дате (новые сверху)
  const sorted = payments.sort((a, b) => b.date.getTime() - a.date.getTime());
  console.log(`Generated ${sorted.length} payments`);
  return sorted;
}

// Генерируем данные при загрузке модуля
let paymentsData = generatePaymentsData();

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

function formatMonthYear(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function groupPaymentsByMonth(payments) {
  console.log('groupPaymentsByMonth called with', payments.length, 'payments');
  const grouped = {};
  payments.forEach((payment, index) => {
    if (!payment.date) {
      console.error('Payment without date at index', index, payment);
      return;
    }
    const paymentDate = new Date(payment.date);
    const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: new Date(paymentDate),
        payments: []
      };
    }
    grouped[monthKey].payments.push(payment);
  });
  const result = Object.values(grouped).sort((a, b) => b.month.getTime() - a.month.getTime());
  console.log('Grouped into', result.length, 'months');
  return result;
}

function filterPayments(payments, filter) {
  if (!payments || payments.length === 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filter.period) {
    case 'month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      return payments.filter(p => {
        const paymentDate = new Date(p.date);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate >= startOfMonth;
      });
    }
    case 'quarter': {
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      quarterStart.setHours(0, 0, 0, 0);
      return payments.filter(p => {
        const paymentDate = new Date(p.date);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate >= quarterStart;
      });
    }
    case 'year': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      return payments.filter(p => {
        const paymentDate = new Date(p.date);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate >= startOfYear;
      });
    }
    case 'custom': {
      if (!filter.dateFrom || !filter.dateTo) {
        console.log('Custom filter: dates not provided, returning all payments');
        return payments;
      }
      const from = new Date(filter.dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(filter.dateTo);
      to.setHours(23, 59, 59, 999);
      console.log('Custom filter: from', from, 'to', to);
      const filtered = payments.filter(p => {
        const paymentDate = new Date(p.date);
        paymentDate.setHours(0, 0, 0, 0);
        const inRange = paymentDate >= from && paymentDate <= to;
        return inRange;
      });
      console.log('Custom filter result:', filtered.length, 'payments');
      return filtered;
    }
    default:
      // 'all' - возвращаем все платежи
      return payments;
  }
}

function renderPayments(payments) {
  console.log('renderPayments called with:', payments?.length || 0, 'payments');
  const container = document.getElementById('paymentsList');
  if (!container) {
    console.error('Container paymentsList not found!');
    return;
  }
  console.log('Container found:', container);

  if (!payments || payments.length === 0) {
    container.innerHTML = '<p class="payments-empty">Платежи не найдены</p>';
    console.log('No payments to render');
    return;
  }

  console.log(`Rendering ${payments.length} payments`);

  const grouped = groupPaymentsByMonth(payments);
  console.log('Grouped into', grouped.length, 'months');
  container.innerHTML = '';

  try {
    grouped.forEach((group, index) => {
      console.log(`Rendering month ${index + 1}:`, formatMonthYear(group.month), 'with', group.payments.length, 'payments');
      const monthSection = document.createElement('div');
      monthSection.className = 'payments-month';
      
      const monthHeader = document.createElement('div');
      monthHeader.className = 'payments-month__header';
      monthHeader.innerHTML = `<h3>${formatMonthYear(group.month)}</h3>`;
      monthSection.appendChild(monthHeader);

      const monthList = document.createElement('div');
      monthList.className = 'payments-month__list';

      group.payments.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      }).forEach(payment => {
        const item = document.createElement('div');
        item.className = 'payment-item';
        item.innerHTML = `
          <div class="payment-item__date">
            <strong>${formatDate(payment.date)}</strong>
          </div>
          <div class="payment-item__details">
            <div class="payment-item__tool">${payment.tool}</div>
            <div class="payment-item__amount">${formatMoney(payment.amount)} ₽</div>
            <div class="payment-item__period">Подписка на ${payment.period}</div>
            <div class="payment-item__status payment-item__status--${payment.status}">
              ${payment.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
            </div>
          </div>
        `;
        monthList.appendChild(item);
      });

      monthSection.appendChild(monthList);
      container.appendChild(monthSection);
    });
    console.log('Rendering completed. Container children:', container.children.length);
  } catch (error) {
    console.error('Error rendering payments:', error);
    container.innerHTML = `<p class="payments-empty">Ошибка при отображении платежей: ${error.message}</p>`;
  }
}

function setupFilter() {
  try {
    console.log('setupFilter called');
    const periodFilter = document.getElementById('paymentsPeriodFilter');
    const customRange = document.getElementById('customDateRange');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    console.log('Elements found:', {
      periodFilter: !!periodFilter,
      customRange: !!customRange,
      dateFrom: !!dateFrom,
      dateTo: !!dateTo
    });
    
    if (!dateFrom || !dateTo) {
      console.error('Date inputs not found! Cannot setup custom filter.');
      return;
    }

    // Используем объект для хранения текущего фильтра, чтобы он был доступен во всех обработчиках
    const filterState = { period: 'all', dateFrom: null, dateTo: null };

  if (periodFilter) {
    periodFilter.addEventListener('change', (e) => {
      // При изменении селекта применяем фильтр
      // Если даты заполнены, они имеют приоритет
      applyFilter();
    });
  }

  // Функция применения фильтра (комбинирует селект и даты)
  const applyFilter = () => {
    const currentPeriod = periodFilter ? periodFilter.value : 'all';
    
    // Получаем значения дат
    const fromInput = document.getElementById('dateFrom');
    const toInput = document.getElementById('dateTo');
    const fromValue = fromInput ? fromInput.value : '';
    const toValue = toInput ? toInput.value : '';
    
    // Если обе даты заполнены, используем их для фильтрации
    if (fromValue && toValue) {
      filterState.period = 'custom';
      filterState.dateFrom = fromValue;
      filterState.dateTo = toValue;
    } else {
      // Иначе используем выбранный период из селекта
      filterState.period = currentPeriod;
      filterState.dateFrom = null;
      filterState.dateTo = null;
    }
    
    const filtered = filterPayments(paymentsData, filterState);
    renderPayments(filtered);
  };
  
  // Функция применения кастомного фильтра (для обратной совместимости)
  const applyCustomFilter = applyFilter;

  // Обработчики для полей дат
  if (dateFrom && dateTo) {
    // Автоматически применяем фильтр при изменении любой даты
    dateFrom.addEventListener('change', () => {
      applyFilter();
    });
    
    dateTo.addEventListener('change', () => {
      applyFilter();
    });
    
    console.log('Date input handlers attached');
  }
  
  // Делаем функцию доступной глобально для тестирования
  window.applyCustomFilter = applyFilter;

  // Инициализация - убеждаемся, что данные есть
  if (!paymentsData || paymentsData.length === 0) {
    console.warn('Payments data is empty, regenerating...');
    paymentsData = generatePaymentsData();
  }
  
  console.log('Before filtering:', paymentsData.length, 'payments');
  const filtered = filterPayments(paymentsData, filterState);
  console.log('After filtering:', filtered.length, 'payments');
  console.log('Filter:', filterState);
  
    // Всегда отображаем платежи при инициализации
    console.log('About to call renderPayments with', filtered.length, 'payments');
    renderPayments(filtered);
    console.log('renderPayments call completed');
  } catch (error) {
    console.error('Error in setupFilter:', error);
    console.error('Error stack:', error.stack);
  }
}

function setupExport() {
  const exportBtn = document.getElementById('exportPayments');
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
  try {
    console.log('DOMContentLoaded - payments page');
    
    // Проверяем, что paymentsData доступна
    if (typeof paymentsData === 'undefined') {
      console.error('paymentsData is undefined!');
      paymentsData = generatePaymentsData();
    }
    
    // Убеждаемся, что данные сгенерированы
    if (!paymentsData || paymentsData.length === 0) {
      console.log('Regenerating payments data...');
      paymentsData = generatePaymentsData();
    }
    
    console.log('Payments data ready:', paymentsData ? paymentsData.length : 0, 'items');
    console.log('paymentsData type:', typeof paymentsData);
    console.log('paymentsData is array:', Array.isArray(paymentsData));
    
    // Инициализируем фильтр (он вызовет renderPayments)
    console.log('Calling setupFilter...');
    setupFilter();
    console.log('setupFilter completed');
    
    console.log('Calling setupExport...');
    setupExport();
    console.log('setupExport completed');
    
    console.log('Calling setupPowerBI...');
    setupPowerBI();
    console.log('setupPowerBI completed');
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
    console.error('Error stack:', error.stack);
  }
});

