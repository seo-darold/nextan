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

// Загрузка кабинетов с API
let cabinetsData = [];

async function loadCabinets() {
  try {
    const response = await fetch('/api/cabinets/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки кабинетов');
    }

    const data = await response.json();
    cabinetsData = data.map(cabinet => ({
      id: cabinet.id,
      name: cabinet.name,
      connectedDate: new Date(cabinet.created_at),
      subscriptionsCount: cabinet.subscriptions_count || 0,
      marketplace: cabinet.marketplace,
      shopName: cabinet.shop_name || '',
    }));
    
    return cabinetsData;
  } catch (error) {
    console.error('Ошибка загрузки кабинетов:', error);
    cabinetsData = [];
    return [];
  }
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

// Рендеринг карточек кабинетов на главной странице
async function renderCabinets() {
  const grid = document.getElementById('cabinetGrid');
  if (!grid) return;

  grid.innerHTML = '<p class="cabinet-empty">Загрузка кабинетов...</p>';

  await loadCabinets();

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
      window.location.href = `/cabinet/cabinet-detail/?id=${cabinet.id}`;
    });
    
    grid.appendChild(card);
  });
}

// Рендеринг страницы детального просмотра кабинета
async function renderCabinetDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const cabinetId = urlParams.get('id');
  
  if (!cabinetId) {
    window.location.href = '/cabinet/';
    return;
  }
  
  try {
    const response = await fetch(`/api/cabinets/${cabinetId}/`, {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      if (response.status === 404) {
        window.location.href = '/cabinet/';
        return;
      }
      throw new Error('Ошибка загрузки кабинета');
    }

    const cabinet = await response.json();
    
    // Устанавливаем заголовок
    const titleElement = document.getElementById('cabinetDetailTitle');
    if (titleElement) {
      titleElement.textContent = cabinet.name;
    }
    
    // Рендерим подписки
    renderCabinetSubscriptions(cabinet);
    
    // Рендерим личные данные
    renderPersonalData(cabinet);
  } catch (error) {
    console.error('Ошибка загрузки кабинета:', error);
    window.location.href = '/cabinet/';
  }
}

// Рендеринг подписок кабинета
function renderCabinetSubscriptions(cabinet) {
  const grid = document.getElementById('cabinetSubscriptionsGrid');
  if (!grid) return;
  
  const subscriptions = cabinet.subscriptions || [];
  
  grid.innerHTML = '';
  
  if (subscriptions.length === 0) {
    grid.innerHTML = '<p class="subscriptions-empty">К этому кабинету не подключено подписок</p>';
    return;
  }
  
  subscriptions.forEach(sub => {
    const card = document.createElement('article');
    card.className = 'subscription-card';
    
    const expiryDate = new Date(sub.end_date);
    const daysUntil = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
      <div class="subscription-card__header">
        <h3 class="subscription-card__title">${sub.dashboard_title}</h3>
        <span class="subscription-card__badge subscription-card__badge--${sub.status}">${sub.status_display}</span>
      </div>
      <div class="subscription-card__info">
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Дата завершения:</span>
          <strong>${formatDate(expiryDate)}</strong>
          ${daysUntil >= 0 ? `<span class="subscription-card__days">(${daysUntil} ${daysUntil === 1 ? 'день' : daysUntil < 5 ? 'дня' : 'дней'})</span>` : ''}
        </div>
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Сумма:</span>
          <strong class="subscription-card__amount">${new Intl.NumberFormat('ru-RU').format(sub.price_per_month)} ₽/мес</strong>
        </div>
        <div class="subscription-card__info-item">
          <span class="subscription-card__label">Период:</span>
          <strong>${sub.months} ${sub.months === 1 ? 'месяц' : sub.months < 5 ? 'месяца' : 'месяцев'}</strong>
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
  
  const personalData = cabinet.personal_data || {};
  const createdDate = new Date(cabinet.created_at);
  
  let html = `
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Имя:</span>
      <strong>${personalData.first_name || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Фамилия:</span>
      <strong>${personalData.last_name || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Компания:</span>
      <strong>${personalData.company || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Телефон:</span>
      <strong>${personalData.phone || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Название кабинета:</span>
      <strong>${cabinet.name || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Название магазина:</span>
      <strong>${cabinet.shop_name || 'Не указано'}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Маркетплейс:</span>
      <strong>${cabinet.marketplace_display || cabinet.marketplace}</strong>
    </div>
    <div class="cabinet-personal-data__item">
      <span class="cabinet-personal-data__label">Дата подключения:</span>
      <strong>${formatDate(createdDate)}</strong>
    </div>
  `;
  
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
    
    // Отправка данных на сервер
    fetch('/api/cabinets/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify(cabinetData),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Закрываем модальное окно формы
        const addCabinetModal = document.getElementById('add-cabinet-modal');
        if (addCabinetModal) {
          addCabinetModal.setAttribute('aria-hidden', 'true');
          addCabinetModal.style.display = 'none';
          document.body.style.overflow = '';
        }
        
        // Показываем модальное окно успеха
        if (successModal) {
          successModal.setAttribute('aria-hidden', 'false');
          successModal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
        
        // Очищаем форму
        form.reset();
        ozonFields.style.display = 'none';
        wbFields.style.display = 'none';
      } else {
        alert('Ошибка при создании кабинета: ' + (data.error || 'Неизвестная ошибка'));
      }
    })
    .catch(error => {
      console.error('Ошибка:', error);
      alert('Ошибка при создании кабинета: ' + error.message);
    });
  });
}

// Управление модальным окном подключения кабинета
function setupCabinetModal() {
  console.log('=== Инициализация модальных окон ===');
  
  // Удаляем старые обработчики если есть
  document.querySelectorAll('[data-cabinet-modal-open]').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  
  // Функция для открытия модалки с анимацией
  function openModal(modal) {
    console.log('Открываем модалку:', modal.id);
    
    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
    
    // Показываем overlay
    modal.style.display = 'flex';
    
    // Запускаем анимацию через requestAnimationFrame
    requestAnimationFrame(() => {
      modal.setAttribute('aria-hidden', 'false');
    });
  }
  
  // Функция для закрытия модалки с анимацией
  function closeModal(modal) {
    console.log('Закрываем модалку:', modal.id);
    
    // Начинаем анимацию закрытия
    modal.setAttribute('aria-hidden', 'true');
    
    // Ждем окончания анимации и скрываем полностью
    setTimeout(() => {
      if (modal.getAttribute('aria-hidden') === 'true') {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }, 300); // Время должно совпадать с CSS transition (0.3s)
  }
  
  // Вешаем обработчики через делегирование
  document.addEventListener('click', function(e) {
    const openButton = e.target.closest('[data-cabinet-modal-open]');
    if (openButton) {
      console.log('Клик на кнопке открытия через делегирование');
      e.preventDefault();
      const modalId = openButton.getAttribute('data-cabinet-modal-open');
      const modal = document.getElementById(modalId);
      if (modal) {
        openModal(modal);
        return false;
      }
    }
  });
  
  // Закрытие по крестику и overlay
  document.addEventListener('click', function(e) {
    if (e.target.matches('[data-cabinet-modal-close], .modal__overlay')) {
      e.preventDefault();
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    }
  });
  
  // Закрытие по Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const openModalElement = document.querySelector('.modal[aria-hidden="false"]');
      if (openModalElement) {
        console.log('Закрытие модалки по Escape');
        closeModal(openModalElement);
      }
    }
  });
  
  // Закрытие для success-modal (у него свои data-атрибуты)
  document.addEventListener('click', function(e) {
    if (e.target.matches('[data-cabinet-success-modal-close]')) {
      e.preventDefault();
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    }
  });
}

// Управление модальным окном успеха
function setupSuccessModal() {
  const successModal = document.getElementById('success-modal');
  if (!successModal) return;

  function closeSuccessModal() {
    console.log('Закрытие success-modal');
    successModal.setAttribute('aria-hidden', 'true');
    
    // Ждем окончания анимации
    setTimeout(() => {
      if (successModal.getAttribute('aria-hidden') === 'true') {
        successModal.style.display = 'none';
        document.body.style.overflow = '';
        // Небольшая задержка перед редиректом для плавности
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }, 300);
  }

  // Закрытие модального окна успеха
  const closeButtons = document.querySelectorAll('[data-cabinet-success-modal-close]');
  closeButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      closeSuccessModal();
    });
  });

  // Закрытие по клику на overlay
  const overlay = successModal.querySelector('.modal__overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSuccessModal();
      }
    });
  }
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


// Инициализация
function initCabinetPage() {
  console.log('=== Инициализация страницы кабинетов ===');
  
  // 1. Проверка загрузки DOM
  console.log('DOM readyState:', document.readyState);
  console.log('URL:', window.location.href);
  
  // 2. Проверка наличия элементов
  const addButton = document.querySelector('[data-cabinet-modal-open="add-cabinet-modal"]');
  const modal = document.getElementById('add-cabinet-modal');
  
  console.log('Кнопка "Подключить новый кабинет" найдена:', !!addButton);
  console.log('Модальное окно найдено:', !!modal);
  
  if (addButton) {
    console.log('Кнопка HTML:', addButton.outerHTML);
    
    // 3. Проверка стилей кнопки
    const styles = window.getComputedStyle(addButton);
    console.log('Стили кнопки:', {
      pointerEvents: styles.pointerEvents,
      cursor: styles.cursor,
      opacity: styles.opacity,
      display: styles.display,
      visibility: styles.visibility
    });
    
    // 4. Проверка родительских элементов на события
    let parent = addButton.parentElement;
    let level = 0;
    while (parent && level < 5) {
      console.log(`Родитель ${level}:`, parent.tagName, parent.className);
      parent = parent.parentElement;
      level++;
    }
    
    // 5. Два разных обработчика для отладки
    addButton.addEventListener('click', function(e) {
      console.log('КЛИК ПО КНОПКЕ (первый обработчик)');
      console.log('Event:', {
        type: e.type,
        target: e.target.tagName,
        currentTarget: e.currentTarget.tagName,
        defaultPrevented: e.defaultPrevented,
        bubbles: e.bubbles,
        cancelable: e.cancelable
      });
      // e.preventDefault();
      // e.stopPropagation();
    }, true); // capture phase
    
    addButton.addEventListener('click', function(e) {
      console.log('КЛИК ПО КНОПКЕ (второй обработчик)');
      console.log('Event phase:', e.eventPhase);
      
      // Ручное открытие модалки
      console.log('Пытаемся открыть модалку...');
      const modal = document.getElementById('add-cabinet-modal');
      if (modal) {
        console.log('Модалка перед открытием:', {
          display: modal.style.display,
          ariaHidden: modal.getAttribute('aria-hidden'),
          classList: modal.classList.toString()
        });
        
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        console.log('Модалка после открытия:', {
          display: modal.style.display,
          ariaHidden: modal.getAttribute('aria-hidden')
        });
      }
    });
  }
  
  if (modal) {
    console.log('Модалка стили:', {
      display: modal.style.display,
      ariaHidden: modal.getAttribute('aria-hidden'),
      zIndex: modal.style.zIndex || window.getComputedStyle(modal).zIndex
    });
    
    // Проверка CSS стилей модалки
    const modalStyles = window.getComputedStyle(modal);
    console.log('Модалка computed styles:', {
      display: modalStyles.display,
      position: modalStyles.position,
      zIndex: modalStyles.zIndex,
      opacity: modalStyles.opacity,
      visibility: modalStyles.visibility
    });
  }
  
  // 6. Проверка других модальных окон
  const allModals = document.querySelectorAll('.modal');
  console.log(`Всего модальных окон: ${allModals.length}`);
  allModals.forEach((m, i) => {
    console.log(`Модалка ${i}:`, {
      id: m.id,
      display: m.style.display,
      ariaHidden: m.getAttribute('aria-hidden')
    });
  });
  
  // 7. Проверка наложения элементов
  const rect = addButton?.getBoundingClientRect();
  if (rect) {
    console.log('Позиция кнопки:', rect);
    
    // Проверяем, что находится под курсором в точке клика
    document.addEventListener('click', function(e) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      console.log('Элемент под курсором в момент клика:', {
        tag: elementAtPoint?.tagName,
        class: elementAtPoint?.className,
        id: elementAtPoint?.id,
        element: elementAtPoint
      });
    }, { once: true });
  }
  
  // 8. Инициализация остальных функций
  console.log('Инициализация модальных окон...');
  setupCabinetModal();
  setupSuccessModal();
  setupAddCabinetForm();
  setupPowerBI();
  
  // 9. Проверка, на какой странице мы находимся
  if (document.getElementById('cabinetGrid')) {
    console.log('Рендерим главную страницу кабинетов');
    renderCabinets();
  } else if (document.getElementById('cabinetSubscriptionsGrid')) {
    console.log('Рендерим детальную страницу кабинета');
    renderCabinetDetail();
  }
  
  console.log('=== Инициализация завершена ===');
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCabinetPage);
} else {
  // DOM уже загружен
  initCabinetPage();
}


