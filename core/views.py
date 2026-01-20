from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.http import JsonResponse
from django.urls import reverse
from .forms import LoginForm, RegisterForm
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
            
            login(request, user)
            
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
            
            # Определяем URL для редиректа
            next_url = request.POST.get('next') or request.GET.get('next')
            redirect_url = next_url if next_url else reverse('content:dashboard')
            
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
    
    return render(request, 'core/login.html', {'form': form})


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
            
            # Переносим корзину из сессии
            merge_cart_on_login(request, user)
            
            # Авторизуем пользователя
            login(request, user)
            
            # Явно сохраняем сессию
            request.session.modified = True
            request.session.save()
            
            # Определяем URL для редиректа
            next_url = request.POST.get('next') or request.GET.get('next')
            redirect_url = next_url if next_url else reverse('content:dashboard')
            
            # Если запрос через AJAX, возвращаем JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                response = JsonResponse({
                    'success': True,
                    'message': 'Регистрация успешна',
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
