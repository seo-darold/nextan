// API endpoints (определяются в шаблонах через window)
const DASHBOARDS_API_URL = window.DASHBOARDS_API_URL || '/api/dashboards/';
const PRICE_CALCULATE_API_URL = window.PRICE_CALCULATE_API_URL || '/api/price/calculate/';
const CART_API_URL = window.CART_API_URL || '/cart/api/';
const CART_TOTAL_API_URL = window.CART_TOTAL_API_URL || '/cart/api/total/';
const CHECKOUT_API_URL = window.CHECKOUT_API_URL || '/cart/api/checkout/';
const CHECK_AUTH_URL = window.CHECK_AUTH_URL || '/api/check-auth/';

// Флаг для хранения информации о том, что после авторизации нужно выполнить checkout
let pendingCheckout = false;

const state = {
  dashboards: [],
  cart: [],
  blogPosts: [],
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
}

// API функции
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

function getCsrfToken() {
  // Сначала пытаемся получить из cookie
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  if (cookieValue) return cookieValue;
  
  // Если нет в cookie, пытаемся получить из скрытого поля формы
  const csrfInput = qs('input[name="csrfmiddlewaretoken"]');
  if (csrfInput) return csrfInput.value;
  
  return '';
}

// Загрузка дашбордов из API
async function loadDashboards() {
  try {
    const dashboards = await apiRequest(DASHBOARDS_API_URL);
    state.dashboards = dashboards;
    return dashboards;
  } catch (error) {
    console.error('Failed to load dashboards:', error);
    return [];
  }
}

// Загрузка корзины из API
async function loadCart() {
  try {
    const cartData = await apiRequest(CART_API_URL);
    state.cart = cartData.items || [];
    return cartData;
  } catch (error) {
    console.error('Failed to load cart:', error);
    state.cart = [];
    return { items: [], total: 0, items_count: 0 };
  }
}

// Расчет цены через API
async function calculatePrice(dashboardId, marketplaces, cabinetsCount, months) {
  try {
    const data = await apiRequest(PRICE_CALCULATE_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        dashboard_id: dashboardId,
        marketplaces: marketplaces,
        cabinets_count: cabinetsCount,
        months: months,
      }),
    });
    return data;
  } catch (error) {
    console.error('Failed to calculate price:', error);
    return null;
  }
}

// Добавление в корзину через API
async function addToCart(dashboardId, marketplaces, cabinetsCount, months) {
  try {
    const response = await apiRequest(CART_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        dashboard_id: dashboardId,
        marketplaces: marketplaces,
        cabinets_count: cabinetsCount,
        months: months,
      }),
    });
    await loadCart();
    await updateCartIndicator();
    return response;
  } catch (error) {
    console.error('Failed to add to cart:', error);
    alert('Ошибка при добавлении в корзину: ' + error.message);
    return null;
  }
}

// Обновление элемента корзины через API
async function updateCartItem(itemId, marketplaces, cabinetsCount, months) {
  try {
    const response = await apiRequest(`${CART_API_URL}item/${itemId}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        marketplaces: marketplaces,
        cabinets_count: cabinetsCount,
        months: months,
      }),
    });
    await loadCart();
    await updateCartIndicator();
    return response;
  } catch (error) {
    console.error('Failed to update cart item:', error);
    alert('Ошибка при обновлении корзины: ' + error.message);
    return null;
  }
}

// Удаление из корзины через API
async function removeFromCart(itemId) {
  try {
    const response = await apiRequest(`${CART_API_URL}item/${itemId}/`, {
      method: 'DELETE',
    });
    await loadCart();
    await updateCartIndicator();
    return response;
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    alert('Ошибка при удалении из корзины: ' + error.message);
    return null;
  }
}

// Очистка корзины через API
async function clearCart() {
  try {
    const response = await apiRequest(`${CART_API_URL}clear/`, {
      method: 'POST',
    });
    await loadCart();
    await updateCartIndicator();
    return response;
  } catch (error) {
    console.error('Failed to clear cart:', error);
    alert('Ошибка при очистке корзины: ' + error.message);
    return null;
  }
}

// Получение итоговой суммы корзины
async function getCartTotal() {
  try {
    const data = await apiRequest(CART_TOTAL_API_URL);
    return data;
  } catch (error) {
    console.error('Failed to get cart total:', error);
    return { total: 0, items_count: 0 };
  }
}

// Проверка статуса авторизации
async function checkAuth() {
  try {
    const data = await apiRequest(CHECK_AUTH_URL);
    return data;
  } catch (error) {
    console.error('Failed to check auth:', error);
    return { is_authenticated: false };
  }
}

// Оформление заказа (checkout)
async function checkout() {
  try {
    const response = await apiRequest(CHECKOUT_API_URL, {
      method: 'POST',
    });
    return response;
  } catch (error) {
    console.error('Failed to checkout:', error);
    throw error;
  }
}

// Обработка checkout с проверкой авторизации
async function handleCheckout() {
  // Проверяем авторизацию
  const authStatus = await checkAuth();
  
  if (authStatus.is_authenticated) {
    // Пользователь авторизован - выполняем checkout
    try {
      const result = await checkout();
      if (result.success) {
        // Показываем уведомление об успехе
        showNotification('Заказ успешно оформлен! Подписки добавлены в личный кабинет.', 'success');
        
        // Обновляем индикатор корзины
        await updateCartIndicator();
        
        // Переходим в личный кабинет
        setTimeout(() => {
          window.location.href = result.redirect_url || '/dashboard/';
        }, 1500);
      } else {
        showNotification(result.message || 'Ошибка при оформлении заказа', 'error');
      }
    } catch (error) {
      showNotification('Ошибка при оформлении заказа: ' + error.message, 'error');
    }
  } else {
    // Пользователь не авторизован - показываем модальное окно выбора
    pendingCheckout = true;
    openModal('auth-choice-modal');
  }
}

// Показать уведомление
function showNotification(message, type = 'info') {
  // Удаляем предыдущие уведомления
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(n => n.remove());
  
  // Создаём уведомление
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <div class="notification__content">
      <span class="notification__icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span class="notification__message">${message}</span>
    </div>
    <button class="notification__close" aria-label="Закрыть">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => notification.classList.add('notification--visible'), 10);
  
  // Обработчик закрытия
  notification.querySelector('.notification__close').addEventListener('click', () => {
    notification.classList.remove('notification--visible');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Автоматическое закрытие через 5 секунд
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.remove('notification--visible');
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Открыть модальное окно
function openModal(modalId) {
  const modal = qs(`#${modalId}`);
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

// Закрыть модальное окно
function closeModal(modalId) {
  const modal = qs(`#${modalId}`);
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Закрыть все модальные окна
function closeAllModals() {
  qsa('.modal').forEach(modal => {
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = '';
}

// Обновление индикатора корзины
async function updateCartIndicator() {
  const cartData = await getCartTotal();
  const total = cartData.total || 0;
  
  // Обновляем все индикаторы корзины
  qsa('[data-cart-total]').forEach((node) => {
    node.textContent = `${formatMoney(total)} ₽`;
  });

  // Обновляем "Текущая конфигурация"
  const livePrice = qs('[data-live-price]');
  if (livePrice) {
    livePrice.textContent = total > 0 ? `${formatMoney(total)} ₽` : '0 ₽';
  }

  const miniList = qs('[data-mini-cart]');
  const clearLink = qs('[data-clear-cart]');
  
  if (miniList) {
    miniList.innerHTML = '';
    if (state.cart.length === 0) {
      miniList.innerHTML = '<li>Корзина пуста</li>';
      if (clearLink) clearLink.style.display = 'none';
    } else {
      state.cart.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'summary-card__item';
        const itemTotalPrice = item.total_price || (item.price_per_month * item.months);
        li.innerHTML = `
          <span>${item.dashboard_title || item.title} • ${formatMoney(itemTotalPrice)} ₽ (${item.months} мес.)</span>
          <button class="summary-card__remove" type="button" data-remove-item="${item.id}" aria-label="Удалить">×</button>
        `;
        miniList.appendChild(li);
        
        const removeBtn = li.querySelector('[data-remove-item]');
        if (removeBtn) {
          removeBtn.addEventListener('click', async () => {
            await removeFromCart(item.id);
          });
        }
      });
      
      if (clearLink) {
        clearLink.style.display = state.cart.length > 1 ? 'block' : 'none';
      }
    }
  }
  
  // Обработчик для кнопки "Очистить"
  if (clearLink && !clearLink.hasAttribute('data-listener-added')) {
    clearLink.setAttribute('data-listener-added', 'true');
    clearLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await clearCart();
    });
  }
}

// Рендеринг дашбордов
function renderDashboards() {
  const list = qs('#dashboardList');
  if (!list) return;

  state.dashboards.forEach((dashboard, index) => {
    const isFirst = index === 0;
    const wrapper = document.createElement('article');
    wrapper.className = 'accordion';
    const imageUrl = dashboard.image || '/static/assets/images/dashboards/default.png';
    wrapper.innerHTML = `
      <button class="accordion__header" type="button" data-accordion="${dashboard.id}">
        <div>
          <h3>${dashboard.title}</h3>
        </div>
        <span aria-hidden="true">${isFirst ? '−' : '+'}</span>
      </button>
      <div class="accordion__content" aria-hidden="${!isFirst}">
        <div class="configurator-accordion__preview">
          <img src="${imageUrl}" alt="${dashboard.title}" class="configurator-accordion__image">
          <p class="configurator-accordion__description">
            ${dashboard.description}
            <span class="configurator-accordion__more configurator-accordion__more--hidden" hidden>${dashboard.details || ''}</span>
          </p>
          <a href="#" class="link" data-toggle-description>Показать подробнее</a>
        </div>
        <form class="configurator-form" data-dashboard="${dashboard.id}">
          <table class="configurator-table">
            <tbody>
              <tr>
                <th scope="row">Маркетплейс</th>
                <td>
                  <div class="option-group__controls">
                    <label class="option-chip">
                      <input type="checkbox" name="marketplaces" value="Wildberries">
                      <img src="/static/assets/images/wb.webp" alt="Wildberries" class="option-chip__image" onerror="this.src='/static/assets/images/wb.webp'">
                    </label>
                    <label class="option-chip">
                      <input type="checkbox" name="marketplaces" value="OZON">
                      <img src="/static/assets/images/ozon.png" alt="OZON" class="option-chip__image" onerror="this.src='/static/assets/images/ozon.webp'">
                    </label>
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">Количество кабинетов</th>
                <td>
                  <label class="form__field">
                    <select name="cabinets" class="form__field select">
                      ${Array.from({ length: 20 }, (_, i) => i + 1)
                        .map(
                          (count) => `
                          <option value="${count}" ${
                              count === 1 ? 'selected' : ''
                            }>${count}</option>
                        `,
                        )
                        .join('')}
                    </select>
                  </label>
                </td>
              </tr>
              <tr>
                <th scope="row">Длительность (мес.)</th>
                <td>
                  <label class="form__field">
                    <select name="months" class="form__field select">
                      ${[1, 2, 3, 4, 5, 6, 12]
                        .map(
                          (month) => `
                          <option value="${month}" ${
                              month === 3 ? 'selected' : ''
                            }>${month}</option>
                        `,
                        )
                        .join('')}
                    </select>
                  </label>
                </td>
              </tr>
              <tr>
                <th scope="row">Стоимость</th>
                <td><strong data-price>0 ₽</strong></td>
              </tr>
            </tbody>
          </table>
          <button class="button button--primary" type="submit">Подключить</button>
        </form>
      </div>
    `;
    list.appendChild(wrapper);
  });
}

function setupAccordion() {
  qsa('[data-accordion]').forEach((button) => {
    button.addEventListener('click', () => {
      const content = button.nextElementSibling;
      const isHidden = content.getAttribute('aria-hidden') === 'true';
      content.setAttribute('aria-hidden', String(!isHidden));
      button.querySelector('span').textContent = isHidden ? '−' : '+';
    });
  });
}

function setupDescriptionToggle() {
  qsa('[data-toggle-description]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const text = link.parentElement.querySelector('.configurator-accordion__more');
      const isHidden = text.hasAttribute('hidden') || text.classList.contains('configurator-accordion__more--hidden');
      if (isHidden) {
        text.removeAttribute('hidden');
        text.classList.remove('configurator-accordion__more--hidden');
        link.textContent = 'Скрыть';
      } else {
        text.setAttribute('hidden', '');
        text.classList.add('configurator-accordion__more--hidden');
        link.textContent = 'Показать подробнее';
      }
    });
  });
}

// Обработка конфигуратора с API
async function handleConfigurator() {
  const forms = qsa('.configurator-form');
  if (!forms.length) return;

  forms.forEach((form) => {
    const dashboardId = form.dataset.dashboard;
    const dashboard = state.dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) return;

    const priceLabel = qs('[data-price]', form);

    const updatePrice = async () => {
      const marketplaces = qsa('input[name="marketplaces"]:checked', form).map(
        (input) => input.value,
      );
      if (!marketplaces.length) {
        priceLabel.textContent = '0 ₽';
        return;
      }
      const cabinets = Number(form.querySelector('select[name="cabinets"]').value);
      const months = Number(form.querySelector('select[name="months"]').value);
      
      const priceData = await calculatePrice(dashboardId, marketplaces, cabinets, months);
      if (priceData) {
        priceLabel.textContent = `${formatMoney(priceData.total_price)} ₽`;
        form.dataset.currentPrice = priceData.price_per_month_after_discount;
      }
    };

    // Обработка выбора маркетплейсов
    const marketplaceInputs = qsa('input[name="marketplaces"]', form);
    marketplaceInputs.forEach((input) => {
      const updateChipStyle = () => {
        const chip = input.closest('.option-chip');
        if (chip) {
          if (input.checked) {
            chip.classList.add('option-chip--checked');
          } else {
            chip.classList.remove('option-chip--checked');
          }
        }
      };
      input.addEventListener('change', () => {
        updateChipStyle();
        updatePrice();
      });
      updateChipStyle();
    });

    form.addEventListener('change', updatePrice);
    updatePrice();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const marketplaces = qsa('input[name="marketplaces"]:checked', form).map(
        (input) => input.value,
      );
      if (!marketplaces.length) {
        alert('Выберите хотя бы один маркетплейс');
        return;
      }
      const cabinets = Number(form.querySelector('select[name="cabinets"]').value);
      const months = Number(form.querySelector('select[name="months"]').value);
      
      await addToCart(dashboardId, marketplaces, cabinets, months);
      
      const livePrice = qs('[data-live-price]');
      if (livePrice) {
        const cartData = await getCartTotal();
        livePrice.textContent = `${formatMoney(cartData.total)} ₽`;
      }
    });
  });
}

// Рендеринг страницы корзины
async function renderCartPage() {
  const list = qs('[data-cart-list]');
  if (!list) return;
  
  const checkoutBtn = qs('[data-cart-checkout]');
  if (checkoutBtn && !checkoutBtn.hasAttribute('data-checkout-listener')) {
    checkoutBtn.setAttribute('data-checkout-listener', 'true');
    checkoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (state.cart.length > 0) {
        // Вызываем обработчик checkout
        await handleCheckout();
      }
    });
  }

  const render = async () => {
    await loadCart();
    list.innerHTML = '';
    
    if (!state.cart.length) {
      list.innerHTML = '<p class="cart__empty">Корзина пуста. Вернитесь в конфигуратор.</p>';
      const countEl = qs('[data-cart-count]');
      if (countEl) countEl.textContent = '0';
      const checkout = qs('[data-cart-checkout]');
      if (checkout) checkout.disabled = true;
      await updateCartIndicator();
      return;
    }

    state.cart.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'cart-item';
      article.innerHTML = `
        <div class="cart-item__header">
          <div>
            <h3>${item.dashboard_title}</h3>
            <p>${item.marketplaces.join(', ')} • ${item.cabinets_count} кабинет(а) • ${item.months} мес.</p>
          </div>
          <button class="button button--secondary" data-remove="${item.id}">Удалить</button>
        </div>
        <div class="cart-item__controls">
          <div class="form__field">
            <span>Маркетплейсы</span>
            <div class="option-group__controls">
              <label class="option-chip ${item.marketplaces.includes('Wildberries') ? 'option-chip--checked' : ''}">
                <input type="checkbox" name="marketplaces" value="Wildberries" data-field="markets" ${item.marketplaces.includes('Wildberries') ? 'checked' : ''}>
                <img src="/static/assets/images/wb.webp" alt="Wildberries" class="option-chip__image">
              </label>
              <label class="option-chip ${item.marketplaces.includes('OZON') ? 'option-chip--checked' : ''}">
                <input type="checkbox" name="marketplaces" value="OZON" data-field="markets" ${item.marketplaces.includes('OZON') ? 'checked' : ''}>
                <img src="/static/assets/images/ozon.png" alt="OZON" class="option-chip__image">
              </label>
            </div>
          </div>
          <div class="cart-item__controls-row">
            <label class="form__field form__field--compact">
              <span>Кабинеты</span>
              <select data-field="cabinets">
                ${Array.from({ length: 20 }, (_, i) => i + 1)
                  .map(
                    (count) =>
                      `<option value="${count}" ${
                        item.cabinets_count === count ? 'selected' : ''
                      }>${count}</option>`,
                  )
                  .join('')}
              </select>
            </label>
            <label class="form__field form__field--compact">
              <span>Месяцы</span>
              <select data-field="months">
                ${[1, 2, 3, 4, 5, 6, 12]
                  .map(
                    (month) =>
                      `<option value="${month}" ${
                        item.months === month ? 'selected' : ''
                      }>${month}</option>`,
                  )
                  .join('')}
              </select>
            </label>
          </div>
        </div>
        <p class="cart-item__price">${formatMoney(item.total_price)} ₽</p>
        ${item.discount_percent > 0 ? `<p class="cart-item__discount">Скидка: ${item.discount_percent.toFixed(2)}%</p>` : ''}
      `;
      list.appendChild(article);

      // Обработчики для обновления элемента
      const marketCheckboxes = article.querySelectorAll('input[data-field="markets"]');
      marketCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', async () => {
          const selected = Array.from(article.querySelectorAll('input[data-field="markets"]:checked')).map((cb) => cb.value);
          if (!selected.length) {
            alert('Выберите хотя бы один маркетплейс');
            checkbox.checked = true;
            return;
          }
          const cabinets = Number(article.querySelector('[data-field="cabinets"]').value);
          const months = Number(article.querySelector('[data-field="months"]').value);
          await updateCartItem(item.id, selected, cabinets, months);
          render();
        });
      });

      article.querySelector('[data-field="cabinets"]').addEventListener('change', async (event) => {
        const selected = Array.from(article.querySelectorAll('input[data-field="markets"]:checked')).map((cb) => cb.value);
        const cabinets = Number(event.target.value);
        const months = Number(article.querySelector('[data-field="months"]').value);
        await updateCartItem(item.id, selected, cabinets, months);
        render();
      });

      article.querySelector('[data-field="months"]').addEventListener('change', async (event) => {
        const selected = Array.from(article.querySelectorAll('input[data-field="markets"]:checked')).map((cb) => cb.value);
        const cabinets = Number(article.querySelector('[data-field="cabinets"]').value);
        const months = Number(event.target.value);
        await updateCartItem(item.id, selected, cabinets, months);
        render();
      });

      article.querySelector('[data-remove]').addEventListener('click', async () => {
        await removeFromCart(item.id);
        render();
      });
    });

    const countEl = qs('[data-cart-count]');
    if (countEl) countEl.textContent = state.cart.length.toString();
    if (checkout) {
      checkout.disabled = false;
    }
    
    await updateCartIndicator();
  };

  render();
}

function renderBlog() {
  const grid = qs('[data-blog-grid]');
  if (!grid) return;
  // Блог загружается через Django шаблоны, эта функция не используется
}

function setupNavToggle() {
  const toggle = qs('.nav__toggle');
  const list = qs('.nav__list');
  if (!toggle || !list) return;
  toggle.addEventListener('click', () => {
    const open = list.getAttribute('data-open') === 'true';
    list.setAttribute('data-open', String(!open));
    toggle.setAttribute('aria-expanded', String(!open));
  });
}

function initScrollLinks() {
  qsa('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.querySelector(button.dataset.scrollTarget);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function initModal() {
  const openButtons = qsa('[data-modal-open]');
  const closeButtons = qsa('[data-modal-close]');
  
  // Обработчики для переключения между модальными окнами
  qsa('[data-switch-modal]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetModalId = link.dataset.switchModal;
      const checkoutNext = link.dataset.checkoutNext === 'true';
      
      // Закрываем текущее модальное окно
      const currentModal = link.closest('.modal');
      if (currentModal) {
        currentModal.setAttribute('aria-hidden', 'true');
      }
      
      // Открываем целевое модальное окно
      const targetModal = qs(`#${targetModalId}`);
      if (targetModal) {
        targetModal.setAttribute('aria-hidden', 'false');
        
        // Если это переход из auth-choice-modal, устанавливаем флаг pendingCheckout
        if (checkoutNext) {
          pendingCheckout = true;
          // Устанавливаем next URL на текущую страницу (для возврата после авторизации)
          const nextInput = targetModal.querySelector('input[name="next"]');
          if (nextInput) {
            nextInput.value = window.location.pathname;
          }
        }
      }
    });
  });
  
  // Обработка формы входа - блокируем стандартное поведение
  // Ищем форму по классам: form form--stacked modal__form внутри модального окна login-modal
  const loginModal = qs('#login-modal');
  const loginForm = loginModal ? qs('form.form.form--stacked.modal__form', loginModal) : null;
  
  if (loginForm) {
    // Обработчик на кнопку submit - программно вызываем submit формы
    const submitButton = qs('button[type="submit"]', loginForm);
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Программно вызываем submit формы, чтобы сработал обработчик на document
        loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }
  }
  
  // Обработка формы регистрации
  const registerModal = qs('#register-modal');
  const registerForm = registerModal ? qs('#registerForm', registerModal) : null;
  
  if (registerForm) {
    const submitButton = qs('button[type="submit"]', registerForm);
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        registerForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }
  }
  
  // Глобальный обработчик submit для форм авторизации и регистрации
  if (!document.authFormHandlerAdded) {
    document.authFormHandlerAdded = true;
    
    document.addEventListener('submit', async (e) => {
      if (e.type !== 'submit') return;
      
      let isLoginForm = false;
      let isRegisterForm = false;
      let targetForm = null;
      
      if (e.target.tagName === 'FORM') {
        // Проверяем форму входа
        if (e.target.id === 'loginForm' || (e.target.closest('#login-modal') && 
            e.target.classList.contains('form') && 
            e.target.classList.contains('modal__form'))) {
          isLoginForm = true;
          targetForm = e.target;
        }
        // Проверяем форму регистрации
        else if (e.target.id === 'registerForm' || e.target.closest('#register-modal')) {
          isRegisterForm = true;
          targetForm = e.target;
        }
      }
      
      if (!isLoginForm && !isRegisterForm) return;
      
      // Превентим отправку формы
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const errorContainer = targetForm.querySelector('.form__error') || createErrorContainer(targetForm);
      errorContainer.style.display = 'none';
      errorContainer.textContent = '';
      
      // Получаем CSRF токен
      const csrfInput = targetForm.querySelector('input[name="csrfmiddlewaretoken"]');
      let csrfToken = csrfInput?.value || getCsrfToken();
      
      if (!csrfToken) {
        errorContainer.textContent = 'Ошибка безопасности. Перезагрузите страницу.';
        errorContainer.style.display = 'block';
        return;
      }
      
      if (isLoginForm) {
        await handleLoginFormSubmit(targetForm, errorContainer, csrfToken);
      } else if (isRegisterForm) {
        await handleRegisterFormSubmit(targetForm, errorContainer, csrfToken);
      }
    }, true);
  }

  openButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modalId = button.dataset.modalOpen;
      const modal = qs(`#${modalId}`);
      if (modal) {
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = button.closest('.modal');
      if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Сбрасываем pendingCheckout при закрытии модального окна
        pendingCheckout = false;
      }
    });
  });

  qsa('.modal__overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        const modal = overlay.closest('.modal');
        if (modal) {
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
          pendingCheckout = false;
        }
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = qs('.modal[aria-hidden="false"]');
      if (openModal) {
        openModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        pendingCheckout = false;
      }
    }
  });

  qsa('.button--social').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Функция социальной авторизации будет доступна после настройки');
    });
  });
}

// Создать контейнер для ошибок
function createErrorContainer(form) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'form__error';
  errorContainer.style.display = 'none';
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    form.insertBefore(errorContainer, submitButton);
  } else {
    form.appendChild(errorContainer);
  }
  return errorContainer;
}

// Обработка отправки формы входа
async function handleLoginFormSubmit(form, errorContainer, csrfToken) {
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const nextInput = form.querySelector('input[name="next"]');
  
  const email = emailInput?.value?.trim();
  const password = passwordInput?.value;
  
  if (!email || !password) {
    errorContainer.textContent = 'Заполните все поля';
    errorContainer.style.display = 'block';
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('csrfmiddlewaretoken', csrfToken);
    if (nextInput?.value) {
      formData.append('next', nextInput.value);
    }
    
    const response = await fetch('/login/', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (response.ok) {
      const data = await response.json().catch(() => null);
      
      // Закрываем модальное окно
      closeAllModals();
      
      // Проверяем, нужно ли выполнить checkout после авторизации
      if (pendingCheckout) {
        pendingCheckout = false;
        showNotification('Вход выполнен. Оформляем заказ...', 'success');
        
        // Выполняем checkout
        setTimeout(async () => {
          try {
            const result = await checkout();
            if (result.success) {
              showNotification('Заказ успешно оформлен! Подписки добавлены в личный кабинет.', 'success');
              await updateCartIndicator();
              setTimeout(() => {
                window.location.href = result.redirect_url || '/dashboard/';
              }, 1500);
            } else {
              showNotification(result.message || 'Ошибка при оформлении заказа', 'error');
            }
          } catch (error) {
            showNotification('Ошибка при оформлении заказа: ' + error.message, 'error');
          }
        }, 500);
      } else {
        // Обычный вход
        if (data && data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          window.location.href = '/dashboard/';
        }
      }
    } else {
      const data = await response.json().catch(() => null);
      handleFormErrors(data, errorContainer, 'Ошибка входа. Проверьте email и пароль.');
    }
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error);
    errorContainer.textContent = 'Ошибка соединения. Попробуйте еще раз.';
    errorContainer.style.display = 'block';
  }
}

// Обработка отправки формы регистрации
async function handleRegisterFormSubmit(form, errorContainer, csrfToken) {
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const passwordConfirmInput = form.querySelector('input[name="password_confirm"]');
  const firstNameInput = form.querySelector('input[name="first_name"]');
  const lastNameInput = form.querySelector('input[name="last_name"]');
  const companyInput = form.querySelector('input[name="company"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const agreeTermsInput = form.querySelector('input[name="agree_terms"]');
  const nextInput = form.querySelector('input[name="next"]');
  
  const email = emailInput?.value?.trim();
  const password = passwordInput?.value;
  const passwordConfirm = passwordConfirmInput?.value;
  
  // Базовая валидация
  if (!email || !password || !passwordConfirm) {
    errorContainer.textContent = 'Заполните обязательные поля';
    errorContainer.style.display = 'block';
    return;
  }
  
  if (password !== passwordConfirm) {
    errorContainer.textContent = 'Пароли не совпадают';
    errorContainer.style.display = 'block';
    return;
  }
  
  if (!agreeTermsInput?.checked) {
    errorContainer.textContent = 'Необходимо согласиться с условиями использования';
    errorContainer.style.display = 'block';
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('password_confirm', passwordConfirm);
    formData.append('first_name', firstNameInput?.value || '');
    formData.append('last_name', lastNameInput?.value || '');
    formData.append('company', companyInput?.value || '');
    formData.append('phone', phoneInput?.value || '');
    formData.append('agree_terms', 'on');
    formData.append('csrfmiddlewaretoken', csrfToken);
    if (nextInput?.value) {
      formData.append('next', nextInput.value);
    }
    
    const response = await fetch('/register/', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    if (response.ok) {
      const data = await response.json().catch(() => null);
      
      // Закрываем модальное окно
      closeAllModals();
      
      // Проверяем, нужно ли выполнить checkout после регистрации
      if (pendingCheckout) {
        pendingCheckout = false;
        showNotification('Регистрация успешна! Оформляем заказ...', 'success');
        
        // Выполняем checkout
        setTimeout(async () => {
          try {
            const result = await checkout();
            if (result.success) {
              showNotification('Заказ успешно оформлен! Подписки добавлены в личный кабинет.', 'success');
              await updateCartIndicator();
              setTimeout(() => {
                window.location.href = result.redirect_url || '/dashboard/';
              }, 1500);
            } else {
              showNotification(result.message || 'Ошибка при оформлении заказа', 'error');
            }
          } catch (error) {
            showNotification('Ошибка при оформлении заказа: ' + error.message, 'error');
          }
        }, 500);
      } else {
        // Обычная регистрация
        showNotification('Регистрация успешна!', 'success');
        if (data && data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          window.location.href = '/dashboard/';
        }
      }
    } else {
      const data = await response.json().catch(() => null);
      handleFormErrors(data, errorContainer, 'Ошибка регистрации. Проверьте введённые данные.');
    }
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error);
    errorContainer.textContent = 'Ошибка соединения. Попробуйте еще раз.';
    errorContainer.style.display = 'block';
  }
}

// Обработка ошибок формы
function handleFormErrors(data, errorContainer, defaultMessage) {
  if (data && data.errors) {
    let errorMessages = [];
    
    if (Array.isArray(data.errors)) {
      errorMessages = data.errors;
    } else if (typeof data.errors === 'object') {
      Object.values(data.errors).forEach(fieldErrors => {
        if (Array.isArray(fieldErrors)) {
          errorMessages.push(...fieldErrors);
        } else if (typeof fieldErrors === 'string') {
          errorMessages.push(fieldErrors);
        }
      });
    }
    
    const errorText = errorMessages.length > 0 
      ? errorMessages.join(', ') 
      : defaultMessage;
    
    errorContainer.textContent = errorText;
    errorContainer.style.display = 'block';
  } else {
    errorContainer.textContent = defaultMessage;
    errorContainer.style.display = 'block';
  }
}

// Функция для обновления счётчика непрочитанных сообщений поддержки
// Используется на всех страницах личного кабинета для единообразия
function updateUnreadSupportCount() {
  // Если на странице есть локальная функция updateUnreadCount (например, в support.js),
  // используем её для получения актуального значения
  if (typeof updateUnreadCount === 'function') {
    updateUnreadCount();
    return;
  }
  
  // Иначе обновляем все элементы счётчика на странице
  // По умолчанию скрываем, если значение не задано
  const badges = document.querySelectorAll('#unreadSupportCount');
  badges.forEach(badge => {
    const unreadCount = parseInt(badge.textContent) || 0;
    badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  });
}

// Инициализация плавной анимации для FAQ (по аналогии с accordion)
function initFAQAnimation() {
  const faqItems = qsa('.faq-item');
  
  faqItems.forEach((item) => {
    const summary = item.querySelector('.faq-item__header');
    const content = item.querySelector('.faq-item__content');
    
    if (!summary || !content) return;
    
    // Устанавливаем начальные стили
    if (!item.hasAttribute('open')) {
      content.style.maxHeight = '0';
      content.style.opacity = '0';
      content.style.padding = '0 28px';
    }
    
    // Перехватываем клик
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      
      const isOpen = item.hasAttribute('open');
      
      if (isOpen) {
        // Закрываем с анимацией
        closeFaqItem(item);
      } else {
        // Открываем с анимацией
        openFaqItem(item);
      }
    });
  });
}

function openFaqItem(item) {
  const content = item.querySelector('.faq-item__content');
  const toggle = item.querySelector('.faq-item__toggle');
  
  item.setAttribute('open', '');
  
  // Анимация открытия
  requestAnimationFrame(() => {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.opacity = '1';
    content.style.padding = '0 28px 28px';
    
    if (toggle) {
      toggle.style.transform = 'rotate(180deg)';
    }
  });
}

function closeFaqItem(item) {
  const content = item.querySelector('.faq-item__content');
  const toggle = item.querySelector('.faq-item__toggle');
  
  content.style.maxHeight = content.scrollHeight + 'px';
  
  requestAnimationFrame(() => {
    content.style.maxHeight = '0';
    content.style.opacity = '0';
    content.style.padding = '0 28px';
    
    if (toggle) {
      toggle.style.transform = 'rotate(0deg)';
    }
    
    // Удаляем атрибут open после завершения анимации
    setTimeout(() => {
      item.removeAttribute('open');
    }, 400); // Должно совпадать с duration в CSS (0.4s)
  });
}


let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    qsa('.faq-item[open]').forEach((item) => {
      const content = item.querySelector('.faq-item__content');
      if (content) {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  }, 250);
});

// Инициализация меню баланса
function setupBalanceMenu() {
  const balanceButtons = qsa('[data-balance-menu]');
  
  balanceButtons.forEach((button) => {
    const menu = button.nextElementSibling;
    if (!menu || !menu.classList.contains('header__balance-menu')) return;
    
    // Инициализация состояния - меню закрыто
    menu.setAttribute('aria-hidden', 'true');
    menu.style.maxHeight = '0';
    menu.style.opacity = '0';
    menu.style.overflow = 'hidden';
    menu.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menu.getAttribute('aria-hidden') === 'true';
      
      // Закрываем все другие открытые меню
      balanceButtons.forEach((otherButton) => {
        if (otherButton !== button) {
          const otherMenu = otherButton.nextElementSibling;
          if (otherMenu && otherMenu.classList.contains('header__balance-menu')) {
            const isOtherHidden = otherMenu.getAttribute('aria-hidden') === 'true';
            if (!isOtherHidden) {
              closeBalanceMenu(otherButton, otherMenu);
            }
          }
        }
      });
      
      if (isHidden) {
        openBalanceMenu(button, menu);
      } else {
        closeBalanceMenu(button, menu);
      }
    });
  });
  
  // Закрываем меню при клике вне его
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header__balance-wrapper')) {
      balanceButtons.forEach((button) => {
        const menu = button.nextElementSibling;
        if (menu && menu.classList.contains('header__balance-menu')) {
          const isHidden = menu.getAttribute('aria-hidden') === 'true';
          if (!isHidden) {
            closeBalanceMenu(button, menu);
          }
        }
      });
    }
  });
}

function openBalanceMenu(button, menu) {
  menu.setAttribute('aria-hidden', 'false');
  button.setAttribute('aria-expanded', 'true');
  button.classList.add('header__balance-btn--active');
  
  // Вычисляем высоту содержимого
  const scrollHeight = menu.scrollHeight;
  menu.style.maxHeight = scrollHeight + 'px';
  menu.style.opacity = '1';
}

function closeBalanceMenu(button, menu) {
  menu.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.classList.remove('header__balance-btn--active');
  
  menu.style.maxHeight = '0';
  menu.style.opacity = '0';
}

// Инициализация аккордеона Power BI
function setupPowerBIAccordion() {
  qsa('[data-powerbi-accordion]').forEach((button) => {
    const content = button.nextElementSibling;
    if (!content) return;
    
    // Инициализация состояния при загрузке
    const isMobile = window.matchMedia('(max-width: 960px)').matches;
    if (!isMobile) {
      // На десктопе всегда открыт
      content.setAttribute('aria-hidden', 'false');
      content.style.maxHeight = 'none';
      content.style.opacity = '1';
      content.style.paddingTop = '16px';
    } else {
      // На мобильной версии закрыт по умолчанию
      content.setAttribute('aria-hidden', 'true');
      content.style.maxHeight = '0';
      content.style.opacity = '0';
      content.style.paddingTop = '0';
    }
    
    button.addEventListener('click', () => {
      const isMobile = window.matchMedia('(max-width: 960px)').matches;
      if (!isMobile) {
        // На десктопе не обрабатываем клик
        return;
      }
      
      const isHidden = content.getAttribute('aria-hidden') === 'true';
      
      if (isHidden) {
        // Открываем с плавной анимацией
        content.setAttribute('aria-hidden', 'false');
        // Сначала устанавливаем начальное состояние
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        content.style.paddingTop = '0';
        
        requestAnimationFrame(() => {
          // Вычисляем высоту с учетом padding-top
          const scrollHeight = content.scrollHeight;
          content.style.maxHeight = scrollHeight + 16 + 'px'; // 16px - это padding-top
          content.style.opacity = '1';
          content.style.paddingTop = '16px';
        });
        
        button.classList.add('powerbi-block__title--open');
      } else {
        // Закрываем с плавной анимацией
        const currentHeight = content.scrollHeight;
        content.style.maxHeight = currentHeight + 'px';
        content.style.opacity = '1';
        content.style.paddingTop = '16px';
        
        requestAnimationFrame(() => {
          content.style.maxHeight = '0';
          content.style.opacity = '0';
          content.style.paddingTop = '0';
          
          setTimeout(() => {
            content.setAttribute('aria-hidden', 'true');
          }, 400); // Должно совпадать с duration в CSS (0.4s)
        });
        
        button.classList.remove('powerbi-block__title--open');
      }
    });
    
    // Обработка изменения размера окна
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const isMobile = window.matchMedia('(max-width: 960px)').matches;
        if (!isMobile) {
          // На десктопе всегда открыт
          content.setAttribute('aria-hidden', 'false');
          content.style.maxHeight = 'none';
          content.style.opacity = '1';
          content.style.paddingTop = '16px';
        } else {
          // На мобильной версии сохраняем текущее состояние
          const isHidden = content.getAttribute('aria-hidden') === 'true';
          if (!isHidden) {
            const scrollHeight = content.scrollHeight;
            content.style.maxHeight = scrollHeight + 16 + 'px';
            content.style.paddingTop = '16px';
          }
        }
      }, 250);
    });
  });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  // Загружаем дашборды и корзину
  await loadDashboards();
  await loadCart();
  
  // Рендерим компоненты
  renderDashboards();
  setupAccordion();
  setupDescriptionToggle();
  handleConfigurator();
  renderCartPage();
  await updateCartIndicator();
  setupNavToggle();
  initScrollLinks();
  initModal();
  initFAQAnimation();
  setupPowerBIAccordion();
  setupBalanceMenu();
  
  // Обновляем счётчик непрочитанных сообщений поддержки
  updateUnreadSupportCount();
});

