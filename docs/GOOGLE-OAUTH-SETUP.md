# Настройка входа через Google

## 1. Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте проект или выберите существующий.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Тип приложения: **Веб-приложение**.
5. Укажите **Authorized redirect URIs**:
   - Локально: `http://127.0.0.1:8000/accounts/google/login/callback/`
   - Продакшен: `https://ваш-домен.ru/accounts/google/login/callback/`
6. Скопируйте **Client ID** и **Client secret**.

## 2. Переменные окружения

Задайте в окружении (или в `.env`, если используете django-environ):

```bash
export GOOGLE_OAUTH_CLIENT_ID="ваш-client-id.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="ваш-client-secret"
```

При отсутствии этих переменных кнопка «Войти через Google» на странице входа не отображается.

## 3. Сайт в Django (Sites)

В админке **Sites → Sites** убедитесь, что сайт с `id=1` имеет правильный домен и имя (например, `nextanalytics.ru`). Это используется при формировании redirect URI для OAuth.

## 4. Поведение

- Вход по email/паролю остаётся как раньше (форма `/login/`).
- Кнопка «Войти через Google» ведёт на `/accounts/google/login/`.
- После успешного входа через Google создаётся пользователь с `username=email`, а также записи `PersonalData` и `AccountBalance` (как при обычной регистрации).
- Корзина из сессии при любом входе (email или Google) переносится в аккаунт пользователя.
