import base64
import logging
import os
import json
from urllib.parse import quote
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.http import JsonResponse
from django.urls import reverse
from django.core.signing import TimestampSigner
from django.template.loader import render_to_string
from django.conf import settings
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from .forms import LoginForm, RegisterForm, PasswordResetRequestForm, PasswordResetConfirmForm
from .models import PasswordResetToken, VKIdLink
from cart.models import Cart


def merge_cart_on_login(request, user):
    """
    Переносит корзину из сессии в аккаунт пользователя при авторизации.
    """
    session_key = request.session.session_key
    if session_key:
        try:
            # Находим корзину сессии
            session_cart = Cart.objects.get(session_key=session_key, user=None)
            
            # Проверяем, есть ли уже корзина у пользователя
            user_cart, created = Cart.objects.get_or_create(user=user)
            
            if session_cart.items.exists():
                # Переносим элементы из сессионной корзины в корзину пользователя
                for item in session_cart.items.all():
                    item.cart = user_cart
                    item.save()
                
            # Удаляем сессионную корзину
            session_cart.delete()
        except Cart.DoesNotExist:
            pass


@require_http_methods(["GET", "POST"])
def login_view(request):
    """Представление для входа в личный кабинет"""
    if request.user.is_authenticated:
        return redirect('content:dashboard')
    
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
            
            # Переносим корзину из сессии
            merge_cart_on_login(request, user)
            
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            
            # Явно сохраняем сессию
            request.session.modified = True
            request.session.save()
            
            # Проверяем, что пользователь действительно авторизован
            if not request.user.is_authenticated:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'errors': {'__all__': ['Ошибка авторизации. Попробуйте еще раз.']}
                    }, status=400)
                messages.error(request, 'Ошибка авторизации. Попробуйте еще раз.')
                return redirect('content:index')
            
            # Определяем URL для редиректа — всегда в личный кабинет, не на страницу входа
            next_url = request.POST.get('next') or request.GET.get('next')
            redirect_url = next_url if next_url else reverse('content:dashboard')
            login_path = reverse('core:login').rstrip('/')
            register_path = reverse('core:register').rstrip('/')
            if redirect_url.rstrip('/') in (login_path, register_path):
                redirect_url = reverse('content:dashboard')
            
            # Если запрос через AJAX, возвращаем JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                response = JsonResponse({
                    'success': True,
                    'message': 'Успешный вход',
                    'redirect_url': redirect_url,
                    'user': {
                        'email': user.email,
                        'is_authenticated': True,
                    }
                })
                # Убеждаемся, что сессия сохранится в cookies
                if request.session.session_key:
                    response.set_cookie(
                        'sessionid',
                        request.session.session_key,
                        max_age=60*60*24*7,  # 7 дней
                        httponly=True,
                        samesite='Lax'
                    )
                return response
            
            messages.success(request, f'Добро пожаловать, {user.get_full_name() or user.email}!')
            
            # Создаем редирект
            return redirect(redirect_url)
        else:
            # Если запрос через AJAX, возвращаем JSON с ошибками
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                }, status=400)
            
            # Если форма не прошла валидацию, показываем ошибки
            error_messages = []
            for field, errors in form.errors.items():
                for error in errors:
                    error_messages.append(str(error))
            
            if error_messages:
                messages.error(request, 'Ошибка входа: ' + ', '.join(error_messages))
            else:
                messages.error(request, 'Ошибка входа. Проверьте введенные данные.')
            
            # Перенаправляем на главную с сообщением об ошибке
            return redirect('content:index')
    else:
        form = LoginForm()

    # Кнопка «Войти через Google» — только если настроен OAuth
    google_login_url = None
    if os.environ.get('GOOGLE_OAUTH_CLIENT_ID'):
        try:
            google_login_url = reverse('google_login')
        except Exception:
            pass

    vk_error = (request.GET.get('vk_error') or '').strip()
    next_param = (request.GET.get('next') or '').strip()
    if not vk_error and next_param and 'code=' in next_param:
        vk_error = 'VK перенаправил на другой адрес. В кабинете VK укажите Redirect URI: https://nextanalytics.ru/auth/vk-id-callback/'
    return render(request, 'core/login.html', {
        'form': form,
        'google_login_url': google_login_url,
        'vk_error': vk_error,
    })


@require_http_methods(["GET", "POST"])
def register_view(request):
    """Представление для регистрации нового пользователя"""
    if request.user.is_authenticated:
        return redirect('content:dashboard')
    
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            # Создаём пользователя
            user = form.save()
            next_url = request.POST.get('next') or request.GET.get('next')
            redirect_url = next_url if next_url else reverse('content:dashboard')
            login_path = reverse('core:login').rstrip('/')
            register_path = reverse('core:register').rstrip('/')
            if redirect_url.rstrip('/') in (login_path, register_path):
                redirect_url = reverse('content:dashboard')
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            try:
                # Переносим корзину из сессии
                merge_cart_on_login(request, user)
                # Авторизуем пользователя (ModelBackend — вход по email/паролю)
                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                # Явно сохраняем сессию
                request.session.modified = True
                request.session.save()
            except Exception:
                logger = logging.getLogger(__name__)
                logger.exception('Ошибка после создания пользователя при регистрации')
                # Пользователь уже создан — для AJAX возвращаем успех, чтобы не показывать ошибку
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'message': 'Регистрация успешна',
                        'redirect_url': redirect_url,
                    })
                raise
            # Если запрос через AJAX — редирект 302, чтобы браузер получил Set-Cookie
            # и при переходе на /dashboard/ уже отправлял сессию (без повторного ввода логина)
            if is_ajax:
                return redirect(redirect_url)
            messages.success(request, f'Добро пожаловать, {user.get_full_name() or user.email}! Регистрация успешна.')
            return redirect(redirect_url)
        else:
            # Если запрос через AJAX, возвращаем JSON с ошибками
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                }, status=400)
            
            # Если форма не прошла валидацию, показываем ошибки
            error_messages = []
            for field, errors in form.errors.items():
                for error in errors:
                    error_messages.append(str(error))
            
            if error_messages:
                messages.error(request, 'Ошибка регистрации: ' + ', '.join(error_messages))
            else:
                messages.error(request, 'Ошибка регистрации. Проверьте введенные данные.')
            
            return redirect('content:index')
    else:
        form = RegisterForm()
    
    return render(request, 'core/register.html', {'form': form})


@login_required
@require_http_methods(["POST", "GET"])
def logout_view(request):
    """Представление для выхода из личного кабинета"""
    logout(request)
    
    # Если запрос через AJAX, возвращаем JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': 'Вы успешно вышли',
            'redirect_url': '/'
        })
    
    messages.success(request, 'Вы успешно вышли из личного кабинета')
    return redirect('content:index')


@require_http_methods(["GET"])
def check_auth_view(request):
    """API endpoint для проверки статуса авторизации"""
    if request.user.is_authenticated:
        return JsonResponse({
            'is_authenticated': True,
            'user': {
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            }
        })
    return JsonResponse({
        'is_authenticated': False
    })


@require_http_methods(["POST"])
def password_reset_request_view(request):
    """
    Обработка запроса на сброс пароля.
    Всегда возвращает одинаковый ответ для безопасности (не раскрываем, существует ли email).
    """
    form = PasswordResetRequestForm(request.POST)
    
    success_message = 'Если такой email существует в системе, на него были отправлены инструкции по восстановлению пароля.'
    
    if form.is_valid():
        user = form.get_user()
        
        if user:
            # Создаём токен сброса пароля
            reset_token = PasswordResetToken.create_token(user)
            
            # Формируем ссылку для сброса
            reset_url = request.build_absolute_uri(
                reverse('core:password_reset_confirm', kwargs={'token': reset_token.token})
            )
            
            # Отправляем email в фоне (не блокируем ответ пользователю)
            subject = 'Восстановление пароля — НекстАналитика'
            message = f'''
Здравствуйте!

Вы запросили восстановление пароля для аккаунта на сайте НекстАналитика.

Для установки нового пароля перейдите по ссылке:
{reset_url}

Ссылка действительна в течение 12 часов.

Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.

С уважением,
Команда НекстАналитика
'''
            from core.tasks import send_password_reset_email
            send_password_reset_email.delay(subject, message, user.email)
    
    # Всегда возвращаем успешный ответ для безопасности
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': success_message
        })
    
    messages.success(request, success_message)
    return redirect('content:index')


@require_http_methods(["GET", "POST"])
def password_reset_confirm_view(request, token):
    """
    Страница установки нового пароля.
    """
    # Проверяем токен
    reset_token = PasswordResetToken.get_valid_token(token)
    
    if not reset_token:
        return render(request, 'core/password_reset_invalid.html', {
            'error': 'Ссылка для восстановления пароля недействительна или истекла.'
        })
    
    if request.method == 'POST':
        form = PasswordResetConfirmForm(request.POST)
        
        if form.is_valid():
            # Устанавливаем новый пароль
            user = reset_token.user
            user.set_password(form.cleaned_data['password'])
            user.save()
            
            # Помечаем токен как использованный
            reset_token.is_used = True
            reset_token.save()
            
            # Если запрос через AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                login_url = request.build_absolute_uri(reverse('core:login'))
                return JsonResponse({
                    'success': True,
                    'message': 'Пароль успешно изменён! Теперь вы можете войти с новым паролем.',
                    'redirect_url': login_url
                })
            
            messages.success(request, 'Пароль успешно изменён! Теперь вы можете войти с новым паролем.')
            return redirect('core:login')
        else:
            # Если запрос через AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                }, status=400)
    else:
        form = PasswordResetConfirmForm()
    
    return render(request, 'core/password_reset_confirm.html', {
        'form': form,
        'token': token,
        'user_email': reset_token.user.email
    })


def _vk_id_exchange_and_get_user(code, device_id, redirect_uri, code_verifier=None, state=None):
    """
    Обменивает код VK на токен (по PKCE с code_verifier либо по client_secret), получает user_info, находит/создаёт User.
    По документации id.vk.ru обязателен PKCE: code_verifier и state. client_secret не используется.
    """
    use_pkce = code_verifier and len(code_verifier) >= 43
    if use_pkce:
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': getattr(settings, 'VK_APP_ID', ''),
            'code_verifier': code_verifier,
            'redirect_uri': redirect_uri,
            'device_id': device_id or '',
            'state': state or '',
        }
    else:
        if not getattr(settings, 'VK_CLIENT_SECRET', None):
            return None, 'VK ID не настроен. Требуется PKCE: передайте code_verifier и state с фронта.'
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': getattr(settings, 'VK_APP_ID', ''),
            'client_secret': settings.VK_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
        }
        if device_id:
            token_data['device_id'] = device_id

    try:
        token_resp = requests.post(
            getattr(settings, 'VK_ID_TOKEN_URL', 'https://id.vk.ru/oauth2/auth'),
            data=token_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15,
        )
        try:
            token_json = token_resp.json()
        except ValueError:
            token_json = {}
        if not token_resp.ok:
            err_msg = token_json.get('error_description') or token_json.get('error') or token_resp.reason or 'Ошибка обмена кода на токен'
            return None, str(err_msg)
    except requests.RequestException:
        return None, 'Ошибка обмена кода на токен'
    except (ValueError, KeyError):
        return None, 'Неверный ответ VK'

    access_token = token_json.get('access_token') or token_json.get('accessToken')
    if not access_token:
        err_from_vk = token_json.get('error_description') or token_json.get('error')
        if err_from_vk:
            return None, str(err_from_vk)
        return None, 'Токен не получен (ответ VK: %s)' % (token_json.get('state') or str(token_json)[:200])

    # По документации VK ID в ответе обмена кода на токены уже приходит user_id
    vk_user_id = str(token_json.get('user_id') or '').strip()

    user_info = {}
    user_info_url = getattr(settings, 'VK_ID_USER_INFO_URL', 'https://id.vk.ru/oauth2/user_info')
    for use_bearer in (True, False):
        try:
            if use_bearer:
                user_info_resp = requests.get(
                    user_info_url,
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=10,
                )
            else:
                user_info_resp = requests.get(
                    user_info_url,
                    params={'access_token': access_token},
                    timeout=10,
                )
            user_info_resp.raise_for_status()
            user_info = user_info_resp.json() or {}
            if user_info:
                break
        except (requests.RequestException, ValueError, KeyError):
            if not use_bearer:
                pass
            continue

    # Дополнительно: email может быть в id_token (JWT), если user_info не вернул
    id_token = token_json.get('id_token')
    if not user_info.get('email') and id_token:
        try:
            payload_b64 = id_token.split('.')[1]
            payload_b64 += '=='[: (4 - len(payload_b64) % 4) % 4]
            id_payload = json.loads(base64.urlsafe_b64decode(payload_b64))
            if id_payload.get('email'):
                user_info = dict(user_info)
                user_info['email'] = id_payload.get('email')
        except (IndexError, ValueError, KeyError, TypeError):
            pass

    if not vk_user_id:
        vk_user_id = str(user_info.get('user_id') or user_info.get('sub') or user_info.get('id', '')).strip()
    if not vk_user_id:
        return None, 'Нет идентификатора пользователя'

    email = (user_info.get('email') or '').strip()
    first_name = (user_info.get('first_name') or user_info.get('given_name') or '').strip()
    last_name = (user_info.get('last_name') or user_info.get('family_name') or '').strip()

    user = None
    try:
        link = VKIdLink.objects.get(vk_user_id=vk_user_id)
        user = link.user
    except VKIdLink.DoesNotExist:
        pass

    if not user and email:
        try:
            user = User.objects.get(email__iexact=email)
            VKIdLink.objects.get_or_create(user=user, defaults={'vk_user_id': vk_user_id})
        except User.DoesNotExist:
            pass
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                VKIdLink.objects.get_or_create(user=user, defaults={'vk_user_id': vk_user_id})

    if not user:
        import secrets as sec
        base_email = email or f'vk_{vk_user_id}@vk.id.placeholder'
        if not email and User.objects.filter(email__iexact=base_email).exists():
            base_email = f'vk_{vk_user_id}_{sec.token_hex(4)}@vk.id.placeholder'
        user = User.objects.create_user(
            username=base_email,
            email=base_email,
            first_name=first_name or '',
            last_name=last_name or '',
            password=None,
        )
        user.set_unusable_password()
        user.save()
        VKIdLink.objects.create(user=user, vk_user_id=vk_user_id)
        from dashboards.models import PersonalData, AccountBalance
        PersonalData.objects.get_or_create(
            user=user,
            defaults={'first_name': first_name, 'last_name': last_name},
        )
        AccountBalance.objects.get_or_create(user=user, defaults={'balance': 0})

    # Обновить email/имя, если пришли из VK и у пользователя был placeholder или пусто
    if email and (not user.email or user.email.endswith('@vk.id.placeholder')):
        user.email = email
        if user.username == user.email or user.username.endswith('@vk.id.placeholder'):
            user.username = email
        user.save(update_fields=['email', 'username'])
    if first_name and not user.first_name:
        user.first_name = first_name
        user.save(update_fields=['first_name'])
    if last_name and not user.last_name:
        user.last_name = last_name
        user.save(update_fields=['last_name'])

    return user, None


def _redirect_to_login_with_vk_error(error_message):
    """Редирект на страницу входа с текстом ошибки VK в URL (сообщения на странице не показываются)."""
    url = reverse('core:login')
    if error_message:
        url += '?vk_error=' + quote(error_message[:500])
    return redirect(url)


VK_PKCE_CACHE_PREFIX = 'vk_pkce_'
VK_PKCE_CACHE_TIMEOUT = 600  # 10 минут

@require_http_methods(["POST"])
def vk_id_prepare_view(request):
    """
    Сохраняет code_verifier по state для последующего обмена кода на токен (PKCE).
    Фронт вызывает перед VKID.Auth.login(), затем при редиректе с code мы достаём code_verifier по state.
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({'success': False, 'error': 'Неверный формат'}, status=400)
    state = (body.get('state') or '').strip()
    code_verifier = (body.get('code_verifier') or '').strip()
    if not state or len(state) < 32:
        return JsonResponse({'success': False, 'error': 'Некорректный state'}, status=400)
    if not code_verifier or len(code_verifier) < 43:
        return JsonResponse({'success': False, 'error': 'Некорректный code_verifier'}, status=400)
    cache.set(VK_PKCE_CACHE_PREFIX + state, code_verifier, timeout=VK_PKCE_CACHE_TIMEOUT)
    return JsonResponse({'success': True})


@require_http_methods(["GET"])
def vk_id_oauth_redirect_view(request):
    """
    Обработчик редиректа от VK: пользователь попадает сюда после авторизации в VK
    с параметрами ?code=...&device_id=...&state=... . Обмениваем код на токен по PKCE, логиним, редиректим.
    """
    code = (request.GET.get('code') or '').strip()
    device_id = (request.GET.get('device_id') or '').strip()
    state = (request.GET.get('state') or '').strip()
    if not code:
        return _redirect_to_login_with_vk_error('Нет кода авторизации от VK. Убедитесь, что в кабинете VK указан Redirect URI: https://nextanalytics.ru/auth/vk-id-callback/')
    code_verifier = None
    if state:
        code_verifier = cache.get(VK_PKCE_CACHE_PREFIX + state)
        if code_verifier:
            cache.delete(VK_PKCE_CACHE_PREFIX + state)
    redirect_uri = (getattr(settings, 'VK_AUTH_REDIRECT_URL', None) or '').strip()
    if not redirect_uri:
        redirect_uri = request.build_absolute_uri(request.path)
    user, err = _vk_id_exchange_and_get_user(code, device_id, redirect_uri, code_verifier=code_verifier, state=state)
    if err:
        return _redirect_to_login_with_vk_error(f'Вход через VK: {err}')
    merge_cart_on_login(request, user)
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session.modified = True
    request.session.save()
    next_path = (request.GET.get('next') or '/dashboard/').strip()
    if not next_path.startswith('/') or '//' in next_path:
        next_path = '/dashboard/'
    return redirect(next_path)


@require_http_methods(["POST"])
def vk_id_auth_callback_view(request):
    """
    Принимает код авторизации VK ID от фронтенда (code + state; code_verifier берётся из кэша по state).
    Ожидает JSON: { "code": "...", "device_id": "...", "state": "...", "next": "?" }.
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {'success': False, 'error': 'Неверный формат запроса'},
            status=400,
        )
    code = body.get('code') or body.get('authorization_code')
    device_id = body.get('device_id', '')
    state = (body.get('state') or '').strip()
    code_verifier = (body.get('code_verifier') or '').strip()
    next_url = (body.get('next') or '').strip()
    if not code:
        return JsonResponse(
            {'success': False, 'error': 'Отсутствует код авторизации'},
            status=400,
        )
    # По документации VK: фронт передаёт code, state, code_verifier, device_id. Если code_verifier не в теле — берём из кэша по state (редирект-сценарий)
    if not code_verifier and state:
        code_verifier = cache.get(VK_PKCE_CACHE_PREFIX + state)
        if code_verifier:
            cache.delete(VK_PKCE_CACHE_PREFIX + state)
    if not code_verifier or len(code_verifier) < 43:
        return JsonResponse(
            {'success': False, 'error': 'Отсутствует или неверный code_verifier. Повторите вход через VK.'},
            status=400,
        )

    redirect_uri = getattr(settings, 'VK_AUTH_REDIRECT_URL', None) or request.build_absolute_uri(reverse('core:vk_id_oauth_redirect'))
    redirect_uri = (redirect_uri or '').strip()

    user, err = _vk_id_exchange_and_get_user(code, device_id, redirect_uri, code_verifier=code_verifier, state=state)
    if err:
        return JsonResponse({'success': False, 'error': err}, status=400 if err != 'VK ID не настроен' else 503)

    merge_cart_on_login(request, user)
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session.modified = True
    request.session.save()
    session_key = request.session.session_key
    if not session_key:
        return JsonResponse(
            {'success': False, 'error': 'Ошибка создания сессии'},
            status=500,
        )

    # Токен несёт ключ сессии: кука будет явно выставлена в GET /auth/vk-id-complete/
    signer = TimestampSigner(salt='vk-id-auth')
    one_time_token = signer.sign(session_key)
    complete_path = reverse('core:vk_id_auth_complete')
    next_path = (next_url if next_url and next_url.startswith('/') and '//' not in next_url else '/dashboard/').strip()
    redirect_url = request.build_absolute_uri(complete_path) + '?token=' + quote(one_time_token) + '&next=' + quote(next_path)

    return JsonResponse({
        'success': True,
        'redirect_url': redirect_url,
        'user': {'email': user.email, 'is_authenticated': True},
    })


@require_http_methods(["GET"])
def vk_id_auth_complete_view(request):
    """
    Завершение входа: по токену достаём ключ сессии и выставляем куку sessionid в ответе.
    Сессия уже создана в POST /api/vk-id-auth/, здесь только привязываем её к браузеру.
    """
    token = (request.GET.get('token') or '').strip()
    next_path = (request.GET.get('next') or '/dashboard/').strip()
    if not next_path.startswith('/') or '//' in next_path:
        next_path = '/dashboard/'
    if not token:
        messages.error(request, 'Ссылка входа недействительна.')
        return redirect('core:login')
    signer = TimestampSigner(salt='vk-id-auth')
    try:
        session_key = signer.unsign(token, max_age=120)
    except Exception:
        messages.error(request, 'Ссылка входа истекла или недействительна.')
        return redirect('core:login')
    if not session_key:
        messages.error(request, 'Ошибка входа.')
        return redirect('core:login')

    response = redirect(next_path)
    # Явно выставляем куку сессии с теми же параметрами, что у Django
    session_cookie_name = getattr(settings, 'SESSION_COOKIE_NAME', 'sessionid')
    response.set_cookie(
        session_cookie_name,
        session_key,
        max_age=getattr(settings, 'SESSION_COOKIE_AGE', 60 * 60 * 24 * 7),
        path=getattr(settings, 'SESSION_COOKIE_PATH', '/'),
        domain=getattr(settings, 'SESSION_COOKIE_DOMAIN', None) or None,
        secure=getattr(settings, 'SESSION_COOKIE_SECURE', False),
        httponly=getattr(settings, 'SESSION_COOKIE_HTTPONLY', True),
        samesite=getattr(settings, 'SESSION_COOKIE_SAMESITE', 'Lax'),
    )
    return response
