"""
Контекстные процессоры для шаблонов.
"""
import os
from django.urls import reverse


def google_login_url(request):
    """Добавляет google_login_url в контекст для кнопки «Войти через Google» в модалке и шапке."""
    url = None
    if os.environ.get('GOOGLE_OAUTH_CLIENT_ID'):
        try:
            url = reverse('google_login')
        except Exception:
            pass
    return {'google_login_url': url}


def vk_auth_redirect_url(request):
    """URL, на который VK ID делает редирект после авторизации (должен совпадать с настройкой в приложении VK)."""
    from django.conf import settings as django_settings
    url = getattr(django_settings, 'VK_AUTH_REDIRECT_URL', '').strip()
    if not url:
        try:
            url = request.build_absolute_uri(reverse('core:vk_id_oauth_redirect'))
        except Exception:
            url = 'https://nextanalytics.ru/auth/vk-id-callback/'
    return {'vk_auth_redirect_url': url}
