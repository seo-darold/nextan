// Моковые данные кабинетов
function generateCabinetsData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [
    {
      id: '1',
      name: 'Мой кабинет OZON',
      connectedDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
      subscriptionsCount: 3,
      marketplace: 'OZON',
      shopName: 'Магазин Озон',
      apiKey: 'ozon_api_key_12345',
      ozonSellerClientId: 'seller_client_123',
      ozonPerformanceClientId: 'performance_client_456',
      ozonPerformanceClientSecret: 'performance_secret_789'
    },
    {
      id: '2',
      name: 'Кабинет Wildberries',
      connectedDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 дней назад
      subscriptionsCount: 2,
      marketplace: 'WB',
      shopName: 'Магазин WB',
      apiKey: 'wb_api_key_67890',
      gemConnected: 'yes',
      articlesPerCampaign: 50
    },
    {
      id: '3',
      name: 'Второй кабинет OZON',
      connectedDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 дней назад
      subscriptionsCount: 1,
      marketplace: 'OZON',
      shopName: 'Магазин Озон 2',
      apiKey: 'ozon_api_key_54321',
      ozonSellerClientId: 'seller_client_789',
      ozonPerformanceClientId: 'performance_client_012',
      ozonPerformanceClientSecret: 'performance_secret_345'
    }
  ];
}

const cabinetsData = generateCabinetsData();

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

// Рендеринг карточек кабинетов на главной странице
function renderCabinets() {
  const grid = document.getElementById('cabinetGrid');
  if (!grid) return;

  grid.innerHTML = '';

  if (cabinetsData.length === 0) {
    grid.innerHTML = '<p class="cabinet-empty">Кабинеты не найдены. Подключите первый кабинет.</p>';
    return;
  }

  cabinetsData.forEach(cabinet => {
    const card = document.createElement('article');
    card.className = 'cabinet-card';
    card.style.cursor = 'pointer';
    
    card.innerHTML = `
      <div class="cabinet-card__header">
        <h3 class="cabinet-card__title">${cabinet.name}</h3>
        <span class="cabinet-card__marketplace">${cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries'}</span>
      </div>
      <div class="cabinet-card__info">
        <div class="cabinet-card__info-item">
          <span class="cabinet-card__label">Дата подключения:</span>
          <strong>${formatDate(cabinet.connectedDate)}</strong>
        </div>
        <div class="cabinet-card__info-item">
          <span class="cabinet-card__label">Подключенных подписок:</span>
          <strong>${cabinet.subscriptionsCount}</strong>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => {
      window.location.href = `cabinet-detail.html?id=${cabinet.id}`;
    });
    
    grid.appendChild(card);
  });
}

// Рендеринг страницы детального просмотра кабинета
function renderCabinetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const cabinetId = urlParams.get('id');
  
  if (!cabinetId) {
    window.location.href = 'cabinet.html';
    return;
  }
  
  const cabinet = cabinetsData.find(c => c.id === cabinetId);
  
  if (!cabinet) {
    window.location.href = 'cabinet.html';
    return;
  }
  
  // Устанавливаем заголовок
  const titleElement = document.getElementById('cabinetDetailTitle');
  if (titleElement) {
    titleElement.textContent = cabinet.name;
  }
  
  // Рендерим подписки (используем данные из dashboard.js)
  renderCabinetSubscriptions(cabinet);
  
  // Рендерим личные данные
  renderPersonalData(cabinet);
}

// Рендеринг подписок кабинета
function renderCabinetSubscriptions(cabinet) {
  const grid = document.getElementById('cabinetSubscriptionsGrid');
  if (!grid) return;
  
  // Получаем данные подписок из dashboard.js (если доступны) или используем моковые данные
  const subscriptions = [
    {
      id: '1',
      title: 'Продажи и финансы',
      options: [cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries', '1 кабинет'],
      markets: [cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries'],
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      amount: 18000,
      status: 'active',
      isActive: true
    },
    {
      id: '2',
      title: 'Оптимизатор рекламы',
      options: [cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries', '1 кабинет'],
      markets: [cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries'],
      expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      amount: 15000,
      status: 'active',
      isActive: true
    }
  ];
  
  grid.innerHTML = '';
  
  if (subscriptions.length === 0) {
    grid.innerHTML = '<p class="subscriptions-empty">К этому кабинету не подключено подписок</p>';
    return;
  }
  
  subscriptions.forEach(sub => {
    const card = document.createElement('article');
    card.className = 'subscription-card';
    
    const daysUntil = Math.ceil((sub.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
      <div class="subscription-card__header">
        <h3 class="subscription-card__title">${sub.title}</h3>
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
          ${daysUntil >= 0 ? `<span class="subscription-card__days">(${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'})</span>` : ''}
        </div>
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Сумма:</span>
          <strong class="subscription-card__amount">${new Intl.NumberFormat('ru-RU').format(sub.amount)} ₽/мес</strong>
        </div>
      </div>
      <div class="subscription-card__actions">
        <a href="/subscription/?id=${sub.id}" class="button button--primary button--block">Управлять</a>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

// Рендеринг личных данных
function renderPersonalData(cabinet) {
  const container = document.getElementById('cabinetPersonalData');
  if (!container) return;
  
  let html = `
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Название кабинета:</span>
      <strong>${cabinet.name || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Название магазина:</span>
      <strong>${cabinet.shopName || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Маркетплейс:</span>
      <strong>${cabinet.marketplace === 'OZON' ? 'OZON' : 'Wildberries'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">API ключ:</span>
      <strong>${cabinet.apiKey || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Дата подключения:</span>
      <strong>${formatDate(cabinet.connectedDate)}</strong>
    </div>
  `;
  
  // Поля для OZON
  if (cabinet.marketplace === 'OZON') {
    html += `
      <div class="cabinet-personal-data__item">
        <span class="cabinet-personal-data__label">Client ID (для Seller API OZON):</span>
        <strong>${cabinet.ozonSellerClientId || 'Не указано'}</strong>
      </div>
      <div class="cabinet-personal-data__item">
        <span class="cabinet-personal-data__label">Client ID (для Performance API OZON):</span>
        <strong>${cabinet.ozonPerformanceClientId || 'Не указано'}</strong>
      </div>
      <div class="cabinet-personal-data__item">
        <span class="cabinet-personal-data__label">Client secret (Performance API OZON):</span>
        <strong>${cabinet.ozonPerformanceClientSecret || 'Не указано'}</strong>
      </div>
    `;
  }
  
  // Поля для WB
  if (cabinet.marketplace === 'WB') {
    html += `
      <div class="cabinet-personal-data__item">
        <span class="cabinet-personal-data__label">Подключен ли Джем:</span>
        <strong>${cabinet.gemConnected === 'yes' ? 'Да' : cabinet.gemConnected === 'no' ? 'Нет' : 'Не указано'}</strong>
      </div>
      <div class="cabinet-personal-data__item">
        <span class="cabinet-personal-data__label">Количество артикулов для одной рекламной кампании:</span>
        <strong>${cabinet.articlesPerCampaign || 'Не указано'}</strong>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Управление формой подключения кабинета
function setupAddCabinetForm() {
  const form = document.getElementById('addCabinetForm');
  const marketplaceRadios = document.querySelectorAll('input[name="marketplace"]');
  const ozonFields = document.getElementById('ozonFields');
  const wbFields = document.getElementById('wbFields');
  const successModal = document.getElementById('success-modal');
  
  if (!form) return;
  
  // Показ/скрытие полей в зависимости от выбранного маркетплейса
  marketplaceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'OZON') {
        ozonFields.style.display = 'block';
        wbFields.style.display = 'none';
        // Очищаем обязательные поля WB
        document.querySelectorAll('#wbFields input[required]').forEach(input => {
          input.removeAttribute('required');
        });
        // Делаем обязательными поля OZON
        document.querySelectorAll('#ozonFields input').forEach(input => {
          if (input.name !== 'ozonSellerClientId' && input.name !== 'ozonPerformanceClientId' && input.name !== 'ozonPerformanceClientSecret') {
            // Эти поля не обязательны, но можно сделать обязательными если нужно
          }
        });
      } else if (e.target.value === 'WB') {
        ozonFields.style.display = 'none';
        wbFields.style.display = 'block';
        // Очищаем обязательные поля OZON
        document.querySelectorAll('#ozonFields input[required]').forEach(input => {
          input.removeAttribute('required');
        });
      }
    });
  });
  
  // Обработка отправки формы
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const cabinetData = {
      name: formData.get('cabinetName'),
      shopName: formData.get('shopName'),
      marketplace: formData.get('marketplace'),
      apiKey: formData.get('apiKey')
    };
    
    if (cabinetData.marketplace === 'OZON') {
      cabinetData.ozonSellerClientId = formData.get('ozonSellerClientId');
      cabinetData.ozonPerformanceClientId = formData.get('ozonPerformanceClientId');
      cabinetData.ozonPerformanceClientSecret = formData.get('ozonPerformanceClientSecret');
    } else if (cabinetData.marketplace === 'WB') {
      cabinetData.gemConnected = formData.get('gemConnected');
      cabinetData.articlesPerCampaign = formData.get('articlesPerCampaign');
    }
    
    // В реальном приложении здесь был бы запрос к API
    console.log('Данные кабинета:', cabinetData);
    
    // Закрываем модальное окно формы
    const addCabinetModal = document.getElementById('add-cabinet-modal');
    if (addCabinetModal) {
      addCabinetModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    
    // Показываем модальное окно успеха
    if (successModal) {
      successModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      
      // Обработчик закрытия модального окна успеха с редиректом
      const closeSuccessModal = (e) => {
        if (e) e.preventDefault();
        successModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Небольшая задержка перед редиректом для плавности
        setTimeout(() => {
          window.location.href = 'cabinet.html';
        }, 100);
      };
      
      // Удаляем старые обработчики и добавляем новые
      const overlay = successModal.querySelector('.modal__overlay');
      const closeBtn = successModal.querySelector('.modal__close');
      const successBtn = successModal.querySelector('.button');
      
      // Клонируем элементы для удаления старых обработчиков
      if (overlay) {
        const newOverlay = overlay.cloneNode(true);
        overlay.replaceWith(newOverlay);
        newOverlay.addEventListener('click', closeSuccessModal);
      }
      if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.replaceWith(newCloseBtn);
        newCloseBtn.addEventListener('click', closeSuccessModal);
      }
      if (successBtn) {
        const newSuccessBtn = successBtn.cloneNode(true);
        successBtn.replaceWith(newSuccessBtn);
        newSuccessBtn.addEventListener('click', closeSuccessModal);
      }
    }
    
    // Очищаем форму
    form.reset();
    ozonFields.style.display = 'none';
    wbFields.style.display = 'none';
  });
}

// Настройка модальных окон (используется функционал из app.js)
function setupModals() {
  // Модальные окна обрабатываются в app.js
  // Здесь только дополнительная логика для успешного модального окна
}

// Настройка Power BI блока
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

// Инициализация модальных окон (если app.js еще не загружен)
function ensureModalsInitialized() {
  // Проверяем, инициализированы ли уже модальные окна
  const openButtons = document.querySelectorAll('[data-modal-open]');
  if (openButtons.length > 0) {
    openButtons.forEach((button) => {
      // Проверяем, есть ли уже обработчик
      if (!button.hasAttribute('data-modal-initialized')) {
        button.setAttribute('data-modal-initialized', 'true');
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const modalId = button.getAttribute('data-modal-open');
          const modal = document.getElementById(modalId);
          if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
          }
        });
      }
    });
  }
  
  const closeButtons = document.querySelectorAll('[data-modal-close]');
  closeButtons.forEach((button) => {
    if (!button.hasAttribute('data-modal-initialized')) {
      button.setAttribute('data-modal-initialized', 'true');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = button.closest('.modal');
        if (modal) {
          modal.setAttribute('aria-hidden', 'true');
          modal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });
    }
  });
  
  // Обработка клика на overlay
  document.querySelectorAll('.modal__overlay').forEach((overlay) => {
    if (!overlay.hasAttribute('data-modal-initialized')) {
      overlay.setAttribute('data-modal-initialized', 'true');
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          const modal = overlay.closest('.modal');
          if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            document.body.style.overflow = '';
          }
        }
      });
    }
  });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  // Убеждаемся, что модальные окна инициализированы
  ensureModalsInitialized();
  
  setupAddCabinetForm();
  setupPowerBI();
  
  // Определяем, на какой странице мы находимся
  if (document.getElementById('cabinetGrid')) {
    // Главная страница кабинетов
    renderCabinets();
  } else if (document.getElementById('cabinetSubscriptionsGrid')) {
    // Страница детального просмотра кабинета
    renderCabinetDetail();
  }
  
  // Повторная инициализация модальных окон после небольшой задержки
  // на случай, если app.js загружается асинхронно
  setTimeout(() => {
    ensureModalsInitialized();
  }, 100);
});

