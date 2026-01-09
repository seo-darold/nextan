const state = {
  dashboards: [
    {
      id: 'sales-insights',
      title: 'Продажи и финансы',
      subtitle: 'Глубокая аналитика выручки, прибыли и остатков',
      basePrice: 18000,
      preview: 'Скрин продаж',
      image: 'assets/images/dashboards/sales-insights.png',
      description:
        'Мгновенно видите динамику продаж по SKU, чистую прибыль и прогноз остатков.',
      details:
        'Настраиваем модели Power BI под ваши категории, подключаем до 10 кабинетов, добавляем контроль buy-box и возвратов.',
    },
    {
      id: 'ads-optimizer',
      title: 'Оптимизатор рекламы',
      subtitle: 'Единый контроль РК Wildberries и OZON',
      basePrice: 15000,
      preview: 'Скрин рекламы',
      image: 'assets/images/dashboards/ads-optimizer.png',
      description:
        'Сравнивайте эффективность кампаний в разных каналах, держите CAC под контролем.',
      details:
        'Рекомендации по ставкам, подсказки по ключевым словам, алерты при просадке конверсии.',
    },
    {
      id: 'supply-chain',
      title: 'Логистика и склады',
      subtitle: 'Прогнозируйте остатки и экономьте на FBO/FBS',
      basePrice: 12000,
      preview: 'Скрин логистики',
      image: 'assets/images/dashboards/supply-chain.png',
      description:
        'Оптимальный запас по складам, предупреждения о риске out-of-stock.',
      details:
        'Модели учитывают сезонность, скорость продаж и сроки поставок, есть API для ERP.',
    },
  ],
  cart: [],
  blogPosts: Array.from({ length: 24 }, (_, index) => ({
    id: `post-${index + 1}`,
    title: `Гайд по аналитике №${index + 1}`,
    category: index % 2 === 0 ? 'Wildberries' : 'OZON',
    date: `0${(index % 9) + 1}.10.2025`,
    excerpt:
      'Практические шаги по настройке Power BI и проверке данных маркетплейса.',
  })),
};

const storageKey = 'pulseBiCart';

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function restoreCart() {
  try {
    const saved = localStorage.getItem(storageKey);
    state.cart = saved ? JSON.parse(saved) : [];
  } catch (error) {
    state.cart = [];
    console.warn('Cart restore error', error);
  }
}

function persistCart() {
  localStorage.setItem(storageKey, JSON.stringify(state.cart));
}

function calcPrice({ basePrice, markets, cabinets }) {
  if (!markets.length) return 0;
  return basePrice * markets.length * cabinets;
}

function updateCartIndicator() {
  // Общая стоимость за периоды всех элементов
  const totalForPeriods = state.cart.reduce((acc, item) => {
    const itemTotalPrice = item.pricePerMonth * item.months;
    return acc + itemTotalPrice;
  }, 0);
  
  // Обновляем все индикаторы корзины (и в шапке, и на странице корзины) - общая стоимость за периоды
  qsa('[data-cart-total]').forEach((node) => {
    // Проверяем, находится ли элемент в шапке (для сохранения формата "₽/мес")
    const isInHeader = node.closest('.header');
    if (isInHeader) {
      node.textContent = `${formatMoney(totalForPeriods)} ₽`;
    } else {
      // На странице корзины без "/мес"
      node.textContent = `${formatMoney(totalForPeriods)} ₽`;
    }
  });

  // Обновляем "Текущая конфигурация" - сумма общих стоимостей за периоды всех элементов
  const livePrice = qs('[data-live-price]');
  if (livePrice) {
    const totalForPeriods = state.cart.reduce((acc, item) => {
      const itemTotalPrice = item.pricePerMonth * item.months;
      return acc + itemTotalPrice;
    }, 0);
    livePrice.textContent = state.cart.length > 0 ? `${formatMoney(totalForPeriods)} ₽` : '0 ₽';
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
        const itemTotalPrice = item.pricePerMonth * item.months;
        li.innerHTML = `
          <span>${item.title} • ${formatMoney(itemTotalPrice)} ₽ (${item.months} мес.)</span>
          <button class="summary-card__remove" type="button" data-remove-item="${item.itemId}" aria-label="Удалить ${item.title}">×</button>
        `;
        miniList.appendChild(li);
        
        // Добавляем обработчик удаления для каждого элемента
        const removeBtn = li.querySelector('[data-remove-item]');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            state.cart = state.cart.filter((cartItem) => cartItem.itemId !== item.itemId);
            persistCart();
            updateCartIndicator();
          });
        }
      });
      
      // Показываем/скрываем ссылку "Очистить" в зависимости от количества элементов
      if (clearLink) {
        clearLink.style.display = state.cart.length > 1 ? 'block' : 'none';
      }
    }
  }
  
  // Обработчик для кнопки "Очистить"
  if (clearLink && !clearLink.hasAttribute('data-listener-added')) {
    clearLink.setAttribute('data-listener-added', 'true');
    clearLink.addEventListener('click', (e) => {
      e.preventDefault();
      state.cart = [];
      persistCart();
      updateCartIndicator();
    });
  }
}

function renderDashboards() {
  const list = qs('#dashboardList');
  if (!list) return;

  state.dashboards.forEach((dashboard, index) => {
    const isFirst = index === 0;
    const wrapper = document.createElement('article');
    wrapper.className = 'accordion';
    wrapper.innerHTML = `
      <button class="accordion__header" type="button" data-accordion="${dashboard.id}">
        <div>
          <h3>${dashboard.title}</h3>
        </div>
        <span aria-hidden="true">${isFirst ? '−' : '+'}</span>
      </button>
      <div class="accordion__content" aria-hidden="${!isFirst}">
        <div class="configurator-accordion__preview">
          <img src="${dashboard.image}" alt="${dashboard.title}" class="configurator-accordion__image">
          <p class="configurator-accordion__description">
            ${dashboard.description}
            <span class="configurator-accordion__more configurator-accordion__more--hidden" hidden>${dashboard.details}</span>
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
                      <img src="assets/images/wb.webp" alt="Wildberries" class="option-chip__image">
                    </label>
                    <label class="option-chip">
                      <input type="checkbox" name="marketplaces" value="OZON">
                      <img src="assets/images/ozon.png" alt="OZON" class="option-chip__image">
                    </label>
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">Количество кабинетов</th>
                <td>
                  <label class="form__field">
                    <select name="cabinets" class="form__field select">
                      ${[1, 2]
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
                      ${[1, 2, 3, 4, 5]
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

function handleConfigurator() {
  const forms = qsa('.configurator-form');
  if (!forms.length) return;

  forms.forEach((form) => {
    const dashboard = state.dashboards.find(
      (item) => item.id === form.dataset.dashboard,
    );
    const priceLabel = qs('[data-price]', form);

    const updatePrice = () => {
      const marketplaces = qsa('input[name="marketplaces"]:checked', form).map(
        (input) => input.value,
      );
      const cabinets = Number(
        form.querySelector('select[name="cabinets"]').value,
      );
      const monthsInput = form.querySelector('select[name="months"]');
      const months = monthsInput ? Number(monthsInput.value) : 3;
      const pricePerMonth = calcPrice({ basePrice: dashboard.basePrice, markets: marketplaces, cabinets });
      const totalPrice = pricePerMonth * months;
      priceLabel.textContent = `${formatMoney(totalPrice)} ₽`;
      form.dataset.currentPrice = pricePerMonth;
    };

    // Обработка выбора маркетплейсов с обновлением стилей
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
      updateChipStyle(); // Инициализация стилей
    });

    form.addEventListener('change', updatePrice);
    updatePrice();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const marketplaces = qsa('input[name="marketplaces"]:checked', form).map(
        (input) => input.value,
      );
      if (!marketplaces.length) {
        alert('Выберите хотя бы один маркетплейс');
        return;
      }
      const cabinets = Number(
        form.querySelector('select[name="cabinets"]').value,
      );
      const months = Number(
        form.querySelector('select[name="months"]').value,
      );
      const pricePerMonth = calcPrice({
        basePrice: dashboard.basePrice,
        markets: marketplaces,
        cabinets,
      });
      const cartItem = {
        itemId: crypto.randomUUID(),
        dashboardId: dashboard.id,
        title: dashboard.title,
        markets: marketplaces,
        cabinets,
        months,
        pricePerMonth,
      };
      state.cart.push(cartItem);
      persistCart();
      
      // Обновляем "Текущая конфигурация" только после нажатия "Подключить"
      const livePrice = qs('[data-live-price]');
      if (livePrice) {
        const totalForPeriods = state.cart.reduce((acc, item) => {
          const itemTotalPrice = item.pricePerMonth * item.months;
          return acc + itemTotalPrice;
        }, 0);
        livePrice.textContent = `${formatMoney(totalForPeriods)} ₽`;
      }
      
      updateCartIndicator();
    });
  });
}

function renderCartPage() {
  const list = qs('[data-cart-list]');
  if (!list) return;
  
  // Добавляем обработчик кнопки "Оформить" один раз при инициализации
  const checkout = qs('[data-cart-checkout]');
  if (checkout && !checkout.hasAttribute('data-checkout-listener')) {
    checkout.setAttribute('data-checkout-listener', 'true');
    checkout.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length > 0) {
        window.location.href = 'dashboard.html';
      }
    });
  }

  const render = () => {
    list.innerHTML = '';
    if (!state.cart.length) {
      list.innerHTML =
        '<p class="cart__empty">Корзина пуста. Вернитесь в конфигуратор.</p>';
      qs('[data-cart-count]').textContent = '0';
      const checkout = qs('[data-cart-checkout]');
      if (checkout) checkout.disabled = true;
      // updateCartIndicator обновит все суммы
      updateCartIndicator();
      return;
    }

    state.cart.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'cart-item';
      article.innerHTML = `
        <div class="cart-item__header">
          <div>
            <h3>${item.title}</h3>
            <p>${item.markets.join(', ')} • ${item.cabinets} кабинет(а) • ${item.months} мес.</p>
          </div>
          <button class="button button--secondary" data-remove="${item.itemId}">Удалить</button>
        </div>
        <div class="cart-item__controls">
          <div class="form__field">
            <span>Маркетплейсы</span>
            <div class="option-group__controls">
              <label class="option-chip ${item.markets.includes('Wildberries') ? 'option-chip--checked' : ''}">
                <input type="checkbox" name="marketplaces" value="Wildberries" data-field="markets" ${item.markets.includes('Wildberries') ? 'checked' : ''}>
                <img src="assets/images/wb.webp" alt="Wildberries" class="option-chip__image">
              </label>
              <label class="option-chip ${item.markets.includes('OZON') ? 'option-chip--checked' : ''}">
                <input type="checkbox" name="marketplaces" value="OZON" data-field="markets" ${item.markets.includes('OZON') ? 'checked' : ''}>
                <img src="assets/images/ozon.png" alt="OZON" class="option-chip__image">
              </label>
            </div>
          </div>
          <div class="cart-item__controls-row">
            <label class="form__field form__field--compact">
              <span>Кабинеты</span>
              <select data-field="cabinets">
                ${[1, 2]
                  .map(
                    (count) =>
                      `<option value="${count}" ${
                        item.cabinets === count ? 'selected' : ''
                      }>${count}</option>`,
                  )
                  .join('')}
              </select>
            </label>
            <label class="form__field form__field--compact">
              <span>Месяцы</span>
              <select data-field="months">
                ${[1, 2, 3, 4, 5]
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
        <p class="cart-item__price">${formatMoney(item.pricePerMonth * item.months)} ₽</p>
      `;
      list.appendChild(article);

      const marketCheckboxes = article.querySelectorAll('input[data-field="markets"]');
      marketCheckboxes.forEach((checkbox) => {
        const updateChipStyle = () => {
          const chip = checkbox.closest('.option-chip');
          if (chip) {
            if (checkbox.checked) {
              chip.classList.add('option-chip--checked');
            } else {
              chip.classList.remove('option-chip--checked');
            }
          }
        };
        
        checkbox.addEventListener('change', () => {
          updateChipStyle();
          const selected = Array.from(article.querySelectorAll('input[data-field="markets"]:checked')).map((cb) => cb.value);
          item.markets = selected;
          if (!item.markets.length) {
            item.markets = ['Wildberries'];
            const wbCheckbox = article.querySelector('input[data-field="markets"][value="Wildberries"]');
            if (wbCheckbox) {
              wbCheckbox.checked = true;
              const wbChip = wbCheckbox.closest('.option-chip');
              if (wbChip) wbChip.classList.add('option-chip--checked');
            }
          }
          item.pricePerMonth = calcPrice({
            basePrice: state.dashboards.find((d) => d.id === item.dashboardId).basePrice,
            markets: item.markets,
            cabinets: item.cabinets,
          });
          persistCart();
          render();
          updateCartIndicator();
        });
        
        updateChipStyle(); // Инициализация стилей
      });

      article.querySelector('[data-field="cabinets"]').addEventListener('change', (event) => {
        item.cabinets = Number(event.target.value);
        item.pricePerMonth = calcPrice({
          basePrice: state.dashboards.find((d) => d.id === item.dashboardId).basePrice,
          markets: item.markets,
          cabinets: item.cabinets,
        });
        persistCart();
        render();
        updateCartIndicator();
      });

      article.querySelector('[data-field="months"]').addEventListener('change', (event) => {
        item.months = Number(event.target.value);
        persistCart();
        render();
        updateCartIndicator();
      });

      article.querySelector('[data-remove]').addEventListener('click', () => {
        state.cart = state.cart.filter((cartItem) => cartItem.itemId !== item.itemId);
        persistCart();
        render();
        updateCartIndicator();
      });
    });

    qs('[data-cart-count]').textContent = state.cart.length.toString();
    if (checkout) {
      checkout.disabled = false;
    }
    
    // Обновляем все индикаторы корзины (в шапке и на странице корзины)
    updateCartIndicator();
  };

  render();
}

function renderBlog() {
  const grid = qs('[data-blog-grid]');
  if (!grid) return;
  const button = qs('[data-blog-more]');
  let visibleRows = 4;
  const perRow = 3;

  const render = () => {
    grid.innerHTML = '';
    const count = visibleRows * perRow;
    state.blogPosts.slice(0, count).forEach((post) => {
      const card = document.createElement('article');
      card.className = 'blog-card';
      card.innerHTML = `
        <a href="blog-article.html" class="blog-card__link">
          <div class="blog-card__header">
            <span class="blog-card__category">${post.category}</span>
            <span class="blog-card__date">${post.date}</span>
          </div>
          <h3 class="blog-card__title">${post.title}</h3>
          <p class="blog-card__excerpt">${post.excerpt}</p>
          <div class="blog-card__footer">
            <span class="blog-card__read-more">Читать статью</span>
            <i class="fa-solid fa-arrow-right blog-card__arrow"></i>
          </div>
        </a>
      `;
      grid.appendChild(card);
    });
    if (count >= state.blogPosts.length) {
      button.disabled = true;
      button.textContent = 'Все материалы показаны';
    }
  };

  render();
  button.addEventListener('click', () => {
    visibleRows += 4;
    render();
  });
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

  // Закрытие по клику на overlay
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

  // Закрытие по Escape
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
  const loginForm = qs('.modal__form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // В прототипе любой логин/пароль ведёт в личный кабинет
      window.location.href = 'dashboard.html';
    });
  }

  // Обработка кнопок социальных сетей
  qsa('.button--social').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      // В прототипе любая социальная авторизация ведёт в личный кабинет
      window.location.href = 'dashboard.html';
    });
  });
}

// Функция для подсчёта непрочитанных тикетов поддержки
// Используется на всех страницах личного кабинета для единообразия
function updateUnreadSupportCount() {
  // Используем точно такую же логику генерации, что и в support.js
  function generateTicketsForCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tickets = [];
    
    const statuses = ['open', 'pending', 'closed'];
    
    for (let monthOffset = 0; monthOffset < 8; monthOffset++) {
      const ticketsPerMonth = 4;
      
      for (let i = 0; i < ticketsPerMonth; i++) {
        const ticketDate = new Date(today);
        ticketDate.setMonth(today.getMonth() - monthOffset);
        
        // Детерминированный день месяца (точно как в support.js)
        const day = 5 + i * 7;
        ticketDate.setDate(day > 28 ? 28 : day);
        ticketDate.setHours(9 + (i % 8), (i * 13) % 60, 0, 0);
        
        // Проверяем, что дата не в будущем (используем today для консистентности)
        const now = new Date();
        if (ticketDate <= now) {
          // Детерминированный статус (точно как в support.js)
          const statusIndex = (monthOffset * ticketsPerMonth + i) % statuses.length;
          const status = statuses[statusIndex];
          // Точно такое же условие для непрочитанных (как в support.js, строка 63)
          const hasUnread = status === 'open' && (monthOffset * ticketsPerMonth + i) % 3 === 0;
          
          tickets.push({
            unread: hasUnread
          });
        }
      }
    }
    
    return tickets;
  }

  const tickets = generateTicketsForCount();
  const unreadCount = tickets.filter(t => t.unread).length;
  
  // Обновляем все элементы счётчика на странице
  const badges = document.querySelectorAll('#unreadSupportCount');
  badges.forEach(badge => {
    badge.textContent = unreadCount;
    // Badge всегда виден, показываем даже если 0
    badge.style.display = 'inline-flex';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreCart();
  renderDashboards();
  setupAccordion();
  setupPowerBIAccordion();
  setupDescriptionToggle();
  handleConfigurator();
  renderCartPage();
  renderBlog();
  updateCartIndicator();
  setupNavToggle();
  initScrollLinks();
  initModal();
  updateUnreadSupportCount();

  // Включаем «ломаную» раскладку только на десктопе для страниц кабинета
  (function setupDashboardLooseLayout() {
    const dashboardLayout = document.querySelector('.dashboard-layout');
    if (!dashboardLayout) return;

    const mq = window.matchMedia('(min-width: 961px)');
    const apply = () => {
      document.documentElement.classList.toggle('dashboard-loose', mq.matches);
    };

    apply();
    mq.addEventListener('change', apply);
  })();
});

// Инициализация аккордеона Power BI (точно как конфигуратор, строка 250-259)
function setupPowerBIAccordion() {
  qsa('[data-powerbi-accordion]').forEach((button) => {
    const content = button.nextElementSibling;
    
    // Инициализация состояния при загрузке
    const isMobile = window.matchMedia('(max-width: 960px)').matches;
    if (!isMobile) {
      // На десктопе всегда открыт
      content.setAttribute('aria-hidden', 'false');
    } else {
      // На мобильной версии закрыт по умолчанию
      content.setAttribute('aria-hidden', 'true');
    }
    
    button.addEventListener('click', () => {
      const isMobile = window.matchMedia('(max-width: 960px)').matches;
      if (!isMobile) {
        // На десктопе не обрабатываем клик
        return;
      }
      
      const isHidden = content.getAttribute('aria-hidden') === 'true';
      content.setAttribute('aria-hidden', String(!isHidden));
      // Управление ротацией иконки
      if (isHidden) {
        button.classList.add('powerbi-block__title--open');
      } else {
        button.classList.remove('powerbi-block__title--open');
      }
    });
  });
}

