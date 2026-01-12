from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User
from decimal import Decimal


class Marketplace(models.Model):
    """Маркетплейсы (Wildberries, OZON и т.д.)"""
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100, verbose_name='Название')
    logo = models.ImageField(upload_to='marketplaces/', blank=True, null=True, verbose_name='Логотип')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')

    class Meta:
        verbose_name = 'Маркетплейс'
        verbose_name_plural = 'Маркетплейсы'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Dashboard(models.Model):
    """Дашборды для конфигуратора"""
    id = models.CharField(max_length=50, primary_key=True, verbose_name='ID')
    title = models.CharField(max_length=200, verbose_name='Название')
    subtitle = models.CharField(max_length=300, blank=True, verbose_name='Подзаголовок')
    base_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name='Базовая цена за месяц',
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    preview = models.CharField(max_length=200, blank=True, null=True, verbose_name='Превью описание')
    image = models.ImageField(upload_to='dashboards/', blank=True, null=True, verbose_name='Изображение')
    description = models.TextField(verbose_name='Описание')
    details = models.TextField(blank=True, verbose_name='Детальное описание')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'Дашборд'
        verbose_name_plural = 'Дашборды'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title


class DiscountRule(models.Model):
    """Правила скидок для дашбордов"""
    DISCOUNT_TYPE_CHOICES = [
        ('months', 'За количество месяцев'),
        ('cabinets', 'За количество кабинетов'),
        ('marketplaces', 'За количество маркетплейсов'),
    ]

    dashboard = models.ForeignKey(
        Dashboard, 
        on_delete=models.CASCADE, 
        related_name='discount_rules',
        verbose_name='Дашборд'
    )
    discount_type = models.CharField(
        max_length=20, 
        choices=DISCOUNT_TYPE_CHOICES, 
        verbose_name='Тип скидки'
    )
    min_value = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Минимальное значение'
    )
    discount_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('100.00'))],
        verbose_name='Процент скидки'
    )
    is_active = models.BooleanField(default=True, verbose_name='Активна')
    order = models.IntegerField(default=0, verbose_name='Порядок применения')
    description = models.CharField(max_length=200, blank=True, null=True, verbose_name='Описание')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлена')

    class Meta:
        verbose_name = 'Правило скидки'
        verbose_name_plural = 'Правила скидок'
        ordering = ['dashboard', 'order', 'min_value']
        unique_together = [['dashboard', 'discount_type', 'min_value']]

    def __str__(self):
        return f"{self.dashboard.title} - {self.get_discount_type_display()} ({self.min_value}+): {self.discount_percent}%"


# === Модели для личного кабинета ===

class PersonalData(models.Model):
    """Персональные данные пользователя"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='personal_data',
        verbose_name='Пользователь'
    )
    first_name = models.CharField(max_length=100, blank=True, verbose_name='Имя')
    last_name = models.CharField(max_length=100, blank=True, verbose_name='Фамилия')
    company = models.CharField(max_length=200, blank=True, verbose_name='Компания')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Персональные данные'
        verbose_name_plural = 'Персональные данные'
        ordering = ['user__username']

    def __str__(self):
        return f"{self.user.username} - {self.first_name} {self.last_name}"


class AccountBalance(models.Model):
    """Баланс счёта пользователя"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='account_balance',
        verbose_name='Пользователь'
    )
    balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Баланс'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Баланс счёта'
        verbose_name_plural = 'Балансы счетов'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} - {self.balance} руб."


class Cabinet(models.Model):
    """Кабинет маркетплейса пользователя"""
    MARKETPLACE_CHOICES = [
        ('OZON', 'OZON'),
        ('WB', 'Wildberries'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cabinets',
        verbose_name='Пользователь'
    )
    name = models.CharField(max_length=200, verbose_name='Название кабинета')
    shop_name = models.CharField(max_length=200, verbose_name='Название магазина')
    marketplace = models.CharField(
        max_length=20,
        choices=MARKETPLACE_CHOICES,
        verbose_name='Маркетплейс'
    )
    api_key = models.CharField(max_length=500, verbose_name='API ключ')
    
    # Поля для OZON
    ozon_seller_client_id = models.CharField(max_length=200, blank=True, verbose_name='OZON Seller Client ID')
    ozon_performance_client_id = models.CharField(max_length=200, blank=True, verbose_name='OZON Performance Client ID')
    ozon_performance_client_secret = models.CharField(max_length=500, blank=True, verbose_name='OZON Performance Client Secret')
    
    # Поля для WB
    gem_connected = models.BooleanField(default=False, verbose_name='Подключен Джем')
    articles_per_campaign = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name='Количество артикулов на кампанию'
    )
    
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'Кабинет'
        verbose_name_plural = 'Кабинеты'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_marketplace_display()}) - {self.user.username}"


class Subscription(models.Model):
    """Подписка на дашборд для кабинета"""
    STATUS_CHOICES = [
        ('active', 'Активна'),
        ('expired', 'Истекла'),
        ('suspended', 'Приостановлена'),
        ('cancelled', 'Отменена'),
    ]

    cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        verbose_name='Кабинет'
    )
    dashboard = models.ForeignKey(
        Dashboard,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name='Дашборд'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Статус'
    )
    price_per_month = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Цена за месяц'
    )
    months = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Количество месяцев'
    )
    start_date = models.DateTimeField(verbose_name='Дата начала')
    end_date = models.DateTimeField(verbose_name='Дата окончания')
    auto_renewal = models.BooleanField(default=False, verbose_name='Автопродление')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлена')

    class Meta:
        verbose_name = 'Подписка'
        verbose_name_plural = 'Подписки'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.cabinet.name} - {self.dashboard.title} ({self.get_status_display()})"


class Payment(models.Model):
    """Платежи и пополнения счёта"""
    PAYMENT_TYPE_CHOICES = [
        ('subscription', 'Оплата подписки'),
        ('balance_topup', 'Пополнение счёта'),
        ('refund', 'Возврат средств'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Ожидает оплаты'),
        ('completed', 'Завершён'),
        ('failed', 'Ошибка'),
        ('cancelled', 'Отменён'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='Пользователь'
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        verbose_name='Тип платежа'
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Подписка'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    payment_method = models.CharField(max_length=100, blank=True, verbose_name='Способ оплаты')
    transaction_id = models.CharField(max_length=200, blank=True, verbose_name='ID транзакции')
    description = models.TextField(blank=True, verbose_name='Описание')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'Платеж'
        verbose_name_plural = 'Платежи'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.get_payment_type_display()} - {self.amount} руб. ({self.get_status_display()})"


class Ticket(models.Model):
    """Тикеты поддержки"""
    STATUS_CHOICES = [
        ('open', 'Открыт'),
        ('in_progress', 'В работе'),
        ('resolved', 'Решён'),
        ('closed', 'Закрыт'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tickets',
        verbose_name='Пользователь'
    )
    subject = models.CharField(max_length=200, verbose_name='Тема')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='open',
        verbose_name='Статус'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name='Приоритет'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='Решён')

    class Meta:
        verbose_name = 'Тикет'
        verbose_name_plural = 'Тикеты'
        ordering = ['-created_at']

    def __str__(self):
        return f"#{self.id} - {self.subject} ({self.user.username})"


class TicketMessage(models.Model):
    """Сообщения в тикетах"""
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Тикет'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ticket_messages',
        verbose_name='Автор'
    )
    message = models.TextField(verbose_name='Сообщение')
    is_admin = models.BooleanField(default=False, verbose_name='От администратора')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')

    class Meta:
        verbose_name = 'Сообщение в тикете'
        verbose_name_plural = 'Сообщения в тикетах'
        ordering = ['created_at']

    def __str__(self):
        return f"Сообщение #{self.id} в тикете #{self.ticket.id}"
