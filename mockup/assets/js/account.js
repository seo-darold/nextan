function setupAccountForm() {
  const form = document.querySelector('.account-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // В прототипе просто показываем сообщение
    alert('Изменения сохранены');
  });

  const cancelBtn = form.querySelector('button[type="button"]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.reset();
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

