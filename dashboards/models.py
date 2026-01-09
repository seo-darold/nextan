from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
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
