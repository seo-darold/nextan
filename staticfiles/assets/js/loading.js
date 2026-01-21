// Функции управления оверлеем загрузки
let loadingStartTime = 0;
const MIN_LOADING_TIME = 300; // Минимальное время показа спиннера (мс)

function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  console.log('showLoading called, overlay found:', !!overlay);
  if (overlay) {
    loadingStartTime = Date.now();
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    // Рассчитываем, сколько времени осталось до минимального времени показа
    const elapsed = Date.now() - loadingStartTime;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    
    setTimeout(() => {
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }, remaining);
  }
}

// Делаем функции глобально доступными
window.showLoading = showLoading;
window.hideLoading = hideLoading;
