from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


class PasswordResetRequestForm(forms.Form):
    """Форма запроса сброса пароля"""
    email = forms.EmailField(
        label='Email',
        widget=forms.EmailInput(attrs={
            'class': 'form__field',
            'placeholder': 'name@company.ru',
            'required': True,
        })
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # Не сообщаем, существует ли email в системе (безопасность)
        return email

    def get_user(self):
        """Возвращает пользователя по email или None"""
        email = self.cleaned_data.get('email')
        if email:
            try:
                return User.objects.get(email=email)
            except User.DoesNotExist:
                pass
            except User.MultipleObjectsReturned:
                return User.objects.filter(email=email).first()
        return None


class PasswordResetConfirmForm(forms.Form):
    """Форма установки нового пароля"""
    password = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form__field',
            'placeholder': 'Минимум 8 символов',
            'required': True,
        })
    )
    password_confirm = forms.CharField(
        label='Подтвердите пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form__field',
            'placeholder': '••••••••',
            'required': True,
        })
    )

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password:
            try:
                validate_password(password)
            except ValidationError as e:
                raise forms.ValidationError(list(e.messages))
        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')

        if password and password_confirm:
            if password != password_confirm:
                raise forms.ValidationError('Пароли не совпадают')

        return cleaned_data


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


class RegisterForm(forms.Form):
    """Форма регистрации нового пользователя"""
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
    password_confirm = forms.CharField(
        label='Подтвердите пароль',
        widget=forms.PasswordInput(attrs={
            'class': 'form__field',
            'placeholder': '••••••••',
            'required': True,
        })
    )
    first_name = forms.CharField(
        label='Имя',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form__field',
            'placeholder': 'Иван',
        })
    )
    last_name = forms.CharField(
        label='Фамилия',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form__field',
            'placeholder': 'Иванов',
        })
    )
    company = forms.CharField(
        label='Компания',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form__field',
            'placeholder': 'ООО "Ваша компания"',
        })
    )
    phone = forms.CharField(
        label='Телефон',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form__field',
            'placeholder': '+7 (999) 123-45-67',
        })
    )
    agree_terms = forms.BooleanField(
        label='Я согласен с условиями использования',
        required=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'form__checkbox',
        })
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            # Проверяем, что email ещё не используется
            if User.objects.filter(email=email).exists():
                raise forms.ValidationError('Пользователь с таким email уже зарегистрирован')
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password:
            # Проверяем сложность пароля
            try:
                validate_password(password)
            except ValidationError as e:
                raise forms.ValidationError(list(e.messages))
        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')

        if password and password_confirm:
            if password != password_confirm:
                raise forms.ValidationError('Пароли не совпадают')

        return cleaned_data

    def save(self):
        """Создаёт нового пользователя и возвращает его"""
        email = self.cleaned_data['email']
        password = self.cleaned_data['password']
        first_name = self.cleaned_data.get('first_name', '')
        last_name = self.cleaned_data.get('last_name', '')
        company = self.cleaned_data.get('company', '')
        phone = self.cleaned_data.get('phone', '')

        # Создаём пользователя (используем email как username)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        # Создаём связанные данные профиля
        from dashboards.models import PersonalData, AccountBalance
        
        PersonalData.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            company=company,
            phone=phone,
        )
        
        AccountBalance.objects.create(
            user=user,
            balance=0,
        )

        return user

