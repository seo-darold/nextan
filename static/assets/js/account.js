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
      const firstNameInput = form.querySelector('input[placeholder*="имя"]');
      const lastNameInput = form.querySelector('input[placeholder*="фамилия"]');
      const companyInput = form.querySelector('input[placeholder*="компании"]');
      const emailInput = form.querySelector('input[type="email"]');
      const phoneInput = form.querySelector('input[type="tel"]');

      if (firstNameInput) firstNameInput.value = data.first_name || '';
      if (lastNameInput) lastNameInput.value = data.last_name || '';
      if (companyInput) companyInput.value = data.company || '';
      if (emailInput) emailInput.value = data.email || '';
      if (phoneInput) phoneInput.value = data.phone || '';
    }
  } catch (error) {
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
      first_name: form.querySelector('input[placeholder*="имя"]')?.value || '',
      last_name: form.querySelector('input[placeholder*="фамилия"]')?.value || '',
      company: form.querySelector('input[placeholder*="компании"]')?.value || '',
      email: form.querySelector('input[type="email"]')?.value || '',
      phone: form.querySelector('input[type="tel"]')?.value || '',
    };

    // Проверка паролей (если они заполнены)
    const currentPassword = form.querySelector('input[type="password"][placeholder*="Текущий"]')?.value;
    const newPassword = form.querySelector('input[type="password"][placeholder*="Новый"]')?.value;
    const confirmPassword = form.querySelector('input[type="password"][placeholder*="Подтвердите"]')?.value;

    if (newPassword && newPassword !== confirmPassword) {
      alert('Новые пароли не совпадают');
      return;
    }

    try {
      await savePersonalData(formData);
      
      // Если пароли заполнены, обрабатываем их отдельно
      if (currentPassword && newPassword) {
        // Здесь должна быть логика смены пароля через отдельный API
        alert('Изменения сохранены. Для смены пароля используйте отдельную функцию.');
      } else {
        alert('Изменения успешно сохранены');
      }
    } catch (error) {
      alert('Ошибка при сохранении: ' + error.message);
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
  setupAccountForm();
  setupPowerBI();
});
