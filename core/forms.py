from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User


class LoginForm(forms.Form):
    """Форма входа в личный кабинет"""
    email = forms.EmailField(
        label='Email',
        widget=forms.EmailInput(attrs={
            'class': 'form__field',
            'placeholder': 'name@company.ru',
            'required': True,
        })
    )
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form__field',
            'placeholder': '••••••••',
            'required': True,
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get('email')
        password = cleaned_data.get('password')

        if email and password:
            # Ищем пользователя по email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise forms.ValidationError('Неверный email или пароль')
            except User.MultipleObjectsReturned:
                # Если несколько пользователей с одним email, берем первого
                user = User.objects.filter(email=email).first()

            # Проверяем пароль
            user = authenticate(username=user.username, password=password)
            if user is None:
                raise forms.ValidationError('Неверный email или пароль')

            if not user.is_active:
                raise forms.ValidationError('Ваш аккаунт деактивирован')

            cleaned_data['user'] = user
        return cleaned_data

