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

// Загрузка персональных данных
async function loadPersonalData() {
  showLoading();
  try {
    const response = await fetch('/api/personal-data/', {
      method: 'GET',
      headers: {
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки данных');
    }

    const data = await response.json();
    
    // Заполняем форму данными
    const form = document.querySelector('.account-form');
    if (form) {
      const firstNameInput = form.querySelector('input[name="first_name"]');
      const lastNameInput = form.querySelector('input[name="last_name"]');
      const companyInput = form.querySelector('input[name="company"]');
      const emailInput = form.querySelector('input[name="email"]');
      const phoneInput = form.querySelector('input[name="phone"]');

      if (firstNameInput) firstNameInput.value = data.first_name || '';
      if (lastNameInput) lastNameInput.value = data.last_name || '';
      if (companyInput) companyInput.value = data.company || '';
      if (emailInput) emailInput.value = data.email || '';
      if (phoneInput) phoneInput.value = data.phone || '';
    }
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Ошибка загрузки персональных данных:', error);
  }
}

// Сохранение персональных данных
async function savePersonalData(formData) {
  try {
    const response = await fetch('/api/personal-data/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка сохранения данных');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка сохранения персональных данных:', error);
    throw error;
  }
}

function setupAccountForm() {
  const form = document.querySelector('.account-form');
  if (!form) return;

  // Загружаем данные при загрузке страницы
  loadPersonalData();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      first_name: form.querySelector('input[name="first_name"]')?.value || '',
      last_name: form.querySelector('input[name="last_name"]')?.value || '',
      company: form.querySelector('input[name="company"]')?.value || '',
      email: form.querySelector('input[name="email"]')?.value || '',
      phone: form.querySelector('input[name="phone"]')?.value || '',
    };

    // Проверка паролей (если они заполнены)
    const currentPassword = form.querySelector('input[name="current_password"]')?.value || '';
    const newPassword = form.querySelector('input[name="new_password"]')?.value || '';
    const confirmPassword = form.querySelector('input[name="confirm_password"]')?.value || '';

    if (newPassword && newPassword !== confirmPassword) {
      console.error('Новые пароли не совпадают');
      return;
    }

    showLoading();
    try {
      await savePersonalData(formData);
      hideLoading();
      
      // Если пароли заполнены, обрабатываем их отдельно
      if (currentPassword && newPassword) {
        // Здесь должна быть логика смены пароля через отдельный API
        console.log('Изменения сохранены. Для смены пароля используйте отдельную функцию.');
      } else {
        console.log('Изменения успешно сохранены');
      }
    } catch (error) {
      hideLoading();
      console.error('Ошибка при сохранении:', error.message);
    }
  });

  const cancelBtn = form.querySelector('button[type="button"]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      loadPersonalData(); // Перезагружаем данные
    });
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

document.addEventListener('DOMContentLoaded', () => {
  setupAccountForm();
  setupPowerBI();
});
