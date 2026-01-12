// API endpoints (определяются в шаблонах через window)
const DASHBOARDS_API_URL = window.DASHBOARDS_API_URL || '/api/dashboards/';
const PRICE_CALCULATE_API_URL = window.PRICE_CALCULATE_API_URL || '/api/price/calculate/';
const CART_API_URL = window.CART_API_URL || '/cart/api/';
const CART_TOTAL_API_URL = window.CART_TOTAL_API_URL || '/cart/api/total/';

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
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
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
  
  const checkout = qs('[data-cart-checkout]');
  if (checkout && !checkout.hasAttribute('data-checkout-listener')) {
    checkout.setAttribute('data-checkout-listener', 'true');
    checkout.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length > 0) {
        // Переход в личный кабинет (заглушка)
        alert('Функция оформления заказа будет доступна после авторизации');
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

  openButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
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
      }
    }
  });

  // Обработка формы входа
  const loginForm = qs('#loginForm');
  if (loginForm) {
    // Удаляем все предыдущие обработчики, если они есть
    const newForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newForm, loginForm);
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const emailInput = qs('#loginEmail', newForm);
      const passwordInput = qs('#loginPassword', newForm);
      const errorDiv = qs('#loginError', newForm);
      
      const email = emailInput?.value?.trim();
      const password = passwordInput?.value;
      
      // Скрываем предыдущие ошибки
      if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
      }
      
      if (!email || !password) {
        if (errorDiv) {
          errorDiv.textContent = 'Заполните все поля';
          errorDiv.style.display = 'block';
        }
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        
        // Получаем CSRF токен из формы
        const csrfToken = qs('[name=csrfmiddlewaretoken]', newForm)?.value || getCsrfToken();
        formData.append('csrfmiddlewaretoken', csrfToken);
        
        const response = await fetch('/login/', {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken,
          },
          credentials: 'same-origin',
          body: formData,
        });
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          // Если ответ не JSON, возможно это редирект
          if (response.ok || response.status === 302) {
            window.location.href = '/dashboard/';
            return;
          }
          throw new Error('Ошибка сервера');
        }
        
        if (data.success) {
          // Закрываем модальное окно
          const modal = newForm.closest('.modal');
          if (modal) {
            modal.setAttribute('aria-hidden', 'true');
          }
          
          // Перенаправляем на dashboard
          window.location.href = data.redirect_url || '/dashboard/';
        } else {
          // Показываем ошибку
          if (errorDiv) {
            let errorMessage = 'Неверный email или пароль';
            if (data.errors) {
              if (typeof data.errors === 'object') {
                const errorValues = Object.values(data.errors).flat();
                errorMessage = errorValues.length > 0 ? errorValues.join(', ') : errorMessage;
              } else {
                errorMessage = data.errors;
              }
            } else if (data.error) {
              errorMessage = data.error;
            }
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Ошибка входа:', error);
        if (errorDiv) {
          errorDiv.textContent = 'Ошибка соединения. Попробуйте позже.';
          errorDiv.style.display = 'block';
        }
      }
    });
  }
  

  qsa('.button--social').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Функция социальной авторизации будет доступна после настройки');
    });
  });
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
  
  // Обновляем счётчик непрочитанных сообщений поддержки
  updateUnreadSupportCount();
});
