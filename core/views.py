from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.http import JsonResponse
from django.urls import reverse
from .forms import LoginForm


@require_http_methods(["GET", "POST"])
def login_view(request):
    """Представление для входа в личный кабинет"""
    if request.user.is_authenticated:
        return redirect('content:dashboard')
    
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data['user']
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
            
            # Если запрос через AJAX, возвращаем JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # Используем reverse для получения правильного URL
                dashboard_url = reverse('content:dashboard')
                response = JsonResponse({
                    'success': True,
                    'message': 'Успешный вход',
                    'redirect_url': dashboard_url
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
            
            # Всегда перенаправляем на dashboard после успешного входа
            # Используем reverse для получения правильного URL
            dashboard_url = reverse('content:dashboard')
            
            # Создаем редирект
            return redirect(dashboard_url)
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
