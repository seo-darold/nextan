"""
Адаптер django-allauth для интеграции с нашим приложением:
- username = email (как при обычной регистрации)
- создание PersonalData и AccountBalance при первом входе через Google
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.utils import user_username, user_email
from allauth.utils import valid_email_or_none


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        """Используем email как username (как в форме регистрации по email)."""
        user = super().populate_user(request, sociallogin, data)
        email = data.get("email")
        if email:
            user_username(user, email)
            user_email(user, valid_email_or_none(email) or "")
        return user

    def save_user(self, request, sociallogin, form=None):
        """После создания пользователя через соц. сеть создаём PersonalData и AccountBalance."""
        user = super().save_user(request, sociallogin, form=form)
        from dashboards.models import PersonalData, AccountBalance

        PersonalData.objects.get_or_create(
            user=user,
            defaults={
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
            },
        )
        AccountBalance.objects.get_or_create(user=user, defaults={"balance": 0})
        return user
