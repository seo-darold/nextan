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

// Загрузка платежей с API
let paymentsData = [];

async function loadPayments() {
  showLoading();
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
    paymentsData = data.map(payment => ({
      id: payment.id,
      payment_type: payment.payment_type,
      payment_type_display: payment.payment_type_display,
      amount: payment.amount,
      status: payment.status === 'completed' ? 'paid' : payment.status,
      status_display: payment.status_display,
      payment_method: payment.payment_method || '',
      description: payment.description || '',
      created_at: payment.created_at,
      subscription_id: payment.subscription_id,
      date: new Date(payment.created_at),
      tool: payment.description || payment.payment_type_display,
      period: payment.subscription_id ? 'Подписка' : 'Пополнение счёта',
    }));
    
    hideLoading();
    return paymentsData;
  } catch (error) {
    hideLoading();
    console.error('Ошибка загрузки платежей:', error);
    paymentsData = [];
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
    const emptyMessage = isAdminUser()
      ? '<p class="payments-empty">Платежи не найдены</p>'
      : '<p class="payments-empty">У вас ещё нет платежей.</p>';
    container.innerHTML = emptyMessage;
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
    console.warn('Payments data is empty');
    paymentsData = [];
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

/** Экранирование значения для CSV (в т.ч. точка с запятой — чтобы Excel в русской локали не разбивал ячейку). */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Общие колонки и данные для выгрузки платежей (CSV и Excel) */
function getPaymentsExportData() {
  const periodFilter = document.getElementById('paymentsPeriodFilter');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const filterState = {
    period: periodFilter ? periodFilter.value : 'all',
    dateFrom: dateFrom && dateFrom.value ? dateFrom.value : null,
    dateTo: dateTo && dateTo.value ? dateTo.value : null
  };
  if (filterState.dateFrom && filterState.dateTo) {
    filterState.period = 'custom';
  }
  const filtered = filterPayments(paymentsData, filterState);
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'created_at', label: 'Дата и время' },
    { key: 'amount', label: 'Сумма (₽)' },
    { key: 'payment_type', label: 'Тип платежа (код)' },
    { key: 'payment_type_display', label: 'Тип платежа' },
    { key: 'status', label: 'Статус (код)' },
    { key: 'status_display', label: 'Статус' },
    { key: 'payment_method', label: 'Способ оплаты' },
    { key: 'description', label: 'Описание' },
    { key: 'subscription_id', label: 'ID подписки' },
    { key: 'period', label: 'Период/назначение' },
    { key: 'tool', label: 'Инструмент/описание' }
  ];
  const formatCell = (row, col) => {
    const val = row[col.key];
    if (val === null || val === undefined) return '';
    return val;
  };
  return { filtered, columns, formatCell };
}

/** Выгрузка платежей в CSV с учётом текущего фильтра и всех полей */
function exportPaymentsToCsv() {
  const { filtered, columns, formatCell } = getPaymentsExportData();
  if (!filtered || filtered.length === 0) {
    alert('Нет данных для выгрузки.');
    return;
  }
  const headerRow = columns.map(c => escapeCsvCell(c.label)).join(',');
  const dataRows = filtered.map(row =>
    columns.map(c => escapeCsvCell(formatCell(row, c))).join(',')
  );
  const csv = '\uFEFF' + headerRow + '\r\n' + dataRows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payments_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Выгрузка платежей в Excel (.xlsx) */
function exportPaymentsToExcel() {
  const { filtered, columns, formatCell } = getPaymentsExportData();
  if (!filtered || filtered.length === 0) {
    alert('Нет данных для выгрузки.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('Библиотека Excel недоступна. Выгрузите в CSV.');
    return;
  }
  const headerRow = columns.map(c => c.label);
  const dataRows = filtered.map(row => columns.map(c => formatCell(row, c)));
  const aoa = [headerRow].concat(dataRows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Платежи');
  XLSX.writeFile(wb, 'payments_' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

function setupExport() {
  const exportBtn = document.getElementById('exportPayments');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    if (typeof showExportFormatDialog !== 'function') {
      exportPaymentsToCsv();
      return;
    }
    showExportFormatDialog({
      csv: exportPaymentsToCsv,
      xlsx: exportPaymentsToExcel
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
  try {
    await loadPayments();
  } catch (error) {
    console.error('Ошибка загрузки платежей:', error);
    paymentsData = [];
  }
  try {
    setupFilter();
    setupExport();
    setupPowerBI();
  } catch (error) {
    console.error('Ошибка инициализации страницы:', error);
  }
});

