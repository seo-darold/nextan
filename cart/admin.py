from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    """Inline для элементов корзины"""
    model = CartItem
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'total_price_display')
    fields = ('dashboard', 'marketplaces', 'cabinets_count', 'months', 
              'base_price_per_month', 'price_per_month', 'discount_percent', 
              'total_price_display', 'created_at')
    
    def total_price_display(self, obj):
        """Отображение итоговой цены элемента"""
        if obj and obj.pk:
            return f"{obj.get_total_price():,.2f} ₽"
        return "-"
    total_price_display.short_description = 'Итоговая цена'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """Админка для корзин"""
    list_display = ('__str__', 'user', 'session_key', 'get_items_count', 'get_total', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'session_key')
    readonly_fields = ('created_at', 'updated_at', 'get_total', 'get_items_count')
    inlines = [CartItemInline]
    ordering = ('-updated_at',)
    
    fieldsets = (
        ('Информация', {
            'fields': ('user', 'session_key')
        }),
        ('Статистика', {
            'fields': ('get_items_count', 'get_total')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_total(self, obj):
        """Отображение итоговой суммы корзины"""
        if obj.pk:
            return f"{obj.get_total():,.2f} ₽"
        return "-"
    get_total.short_description = 'Итоговая сумма'
    
    def get_items_count(self, obj):
        """Отображение количества элементов"""
        if obj.pk:
            return obj.get_items_count()
        return 0
    get_items_count.short_description = 'Количество элементов'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """Админка для элементов корзины"""
    list_display = ('dashboard', 'cart', 'cabinets_count', 'months', 
                   'price_per_month', 'discount_percent', 'get_total_price', 'created_at')
    list_filter = ('created_at', 'dashboard')
    search_fields = ('dashboard__title', 'cart__user__username', 'cart__session_key')
    readonly_fields = ('created_at', 'updated_at', 'get_total_price')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('cart', 'dashboard', 'marketplaces', 'cabinets_count', 'months')
        }),
        ('Цены', {
            'fields': ('base_price_per_month', 'price_per_month', 'discount_percent', 
                      'applied_discounts', 'get_total_price')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_total_price(self, obj):
        """Отображение итоговой цены элемента"""
        if obj.pk:
            return f"{obj.get_total_price():,.2f} ₽"
        return "-"
    get_total_price.short_description = 'Итоговая цена'
