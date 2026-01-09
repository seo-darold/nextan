from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal
from dashboards.models import Dashboard


class Cart(models.Model):
    """Корзина пользователя"""
    session_key = models.CharField(max_length=40, blank=True, null=True, verbose_name='Ключ сессии')
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True, 
        verbose_name='Пользователь'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлена')

    class Meta:
        verbose_name = 'Корзина'
        verbose_name_plural = 'Корзины'
        ordering = ['-updated_at']

    def __str__(self):
        if self.user:
            return f"Корзина пользователя {self.user.username}"
        return f"Корзина сессии {self.session_key}"

    def get_total(self):
        """Возвращает итоговую сумму корзины"""
        total = Decimal('0.00')
        for item in self.items.all():
            total += item.price_per_month * Decimal(str(item.months))
        return total

    def get_items_count(self):
        """Возвращает количество элементов в корзине"""
        return self.items.count()


class CartItem(models.Model):
    """Элементы корзины"""
    cart = models.ForeignKey(
        Cart, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name='Корзина'
    )
    dashboard = models.ForeignKey(
        Dashboard, 
        on_delete=models.CASCADE, 
        verbose_name='Дашборд'
    )
    marketplaces = models.JSONField(verbose_name='Список выбранных маркетплейсов')
    cabinets_count = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Количество кабинетов'
    )
    months = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Длительность в месяцах'
    )
    price_per_month = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Цена за месяц (после скидок)'
    )
    base_price_per_month = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Цена за месяц (до скидок)'
    )
    discount_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Применённый процент скидки'
    )
    applied_discounts = models.JSONField(
        default=list, 
        blank=True, 
        verbose_name='Список применённых правил скидок'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')

    class Meta:
        verbose_name = 'Элемент корзины'
        verbose_name_plural = 'Элементы корзины'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.dashboard.title} - {self.cart}"

    def get_total_price(self):
        """Возвращает итоговую цену элемента (цена за месяц × количество месяцев)"""
        return self.price_per_month * Decimal(str(self.months))
