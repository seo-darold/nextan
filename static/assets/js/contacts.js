// Обработка формы обратной связи через AJAX

document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.querySelector('.contact-form');
  if (!contactForm) return;

  const overlay = document.getElementById('contact-form-overlay');
  const successModal = document.getElementById('contact-success-modal');
  const agreePersonalData = document.getElementById('agree_personal_data');
  const agreeMarketing = document.getElementById('agree_marketing');
  const agreeCookies = document.getElementById('agree_cookies');
  const checkboxesError = document.getElementById('checkboxes-error');

  // Скрываем ошибку при изменении любого чекбокса
  [agreePersonalData, agreeMarketing, agreeCookies].forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        if (checkboxesError && agreePersonalData.checked && agreeMarketing.checked && agreeCookies.checked) {
          checkboxesError.style.display = 'none';
        }
      });
    }
  });

  // Обработка отправки формы
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Проверяем, что все чекбоксы отмечены
    if (!agreePersonalData.checked || !agreeMarketing.checked || !agreeCookies.checked) {
      // Показываем ошибку
      if (checkboxesError) {
        checkboxesError.textContent = 'Необходимо согласиться со всеми условиями';
        checkboxesError.style.display = 'block';
      }
      
      // Прокручиваем к чекбоксам
      if (agreePersonalData) {
        agreePersonalData.scrollIntoView({ behavior: 'smooth', block: 'center' });
        agreePersonalData.focus();
      }
      
      return; // Прерываем отправку формы
    }

    // Скрываем ошибку, если все чекбоксы отмечены
    if (checkboxesError) {
      checkboxesError.style.display = 'none';
    }

    // Показываем оверлей со спиннером
    if (overlay) {
      overlay.classList.add('active');
    }

    // Собираем данные формы
    const formData = new FormData(contactForm);
    
    // Получаем CSRF токен
    const csrfToken = getCsrfToken();

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrfToken
        }
      });

      const data = await response.json();

      // Скрываем оверлей
      if (overlay) {
        overlay.classList.remove('active');
      }

      if (data.success) {
        // Очищаем форму
        contactForm.reset();
        
        // Скрываем ошибку чекбоксов
        if (checkboxesError) {
          checkboxesError.style.display = 'none';
        }
        
        // Показываем модальное окно успеха
        if (successModal) {
          successModal.classList.add('active');
          successModal.setAttribute('aria-hidden', 'false');
        }
      } else {
        // Показываем ошибки валидации
        showFormErrors(contactForm, data.errors);
      }
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      
      // Скрываем оверлей
      if (overlay) {
        overlay.classList.remove('active');
      }
      
      // Показываем сообщение об ошибке
      alert('Произошла ошибка при отправке формы. Пожалуйста, попробуйте еще раз.');
    }
  });

  // Закрытие модального окна
  if (successModal) {
    const closeButtons = successModal.querySelectorAll('[data-modal-close]');
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
      });
    });

    // Закрытие по клику на оверлей
    const modalOverlay = successModal.querySelector('.modal__overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function() {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
      });
    }
  }
});

// Функция для получения CSRF токена
function getCsrfToken() {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
}

// Функция для отображения ошибок валидации
function showFormErrors(form, errors) {
  // Удаляем предыдущие ошибки
  const existingErrors = form.querySelectorAll('.form__error--ajax');
  existingErrors.forEach(error => error.remove());

  // Добавляем новые ошибки
  Object.keys(errors).forEach(fieldName => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const errorDiv = document.createElement('span');
      errorDiv.className = 'form__error form__error--ajax';
      errorDiv.textContent = Array.isArray(errors[fieldName]) 
        ? errors[fieldName][0] 
        : errors[fieldName];
      
      const fieldWrapper = field.closest('.form__field');
      if (fieldWrapper) {
        fieldWrapper.appendChild(errorDiv);
      }
    }
  });
}

