from django.contrib import admin
from .models import (
    Dashboard, DiscountRule, Marketplace,
    PersonalData, AccountBalance, Cabinet, Subscription,
    Payment, Ticket, TicketMessage
)


class DiscountRuleInline(admin.TabularInline):
    """Inline для правил скидок в админке дашборда"""
    model = DiscountRule
    extra = 0
    fields = ('discount_type', 'min_value', 'discount_percent', 'is_active', 'order', 'description')
    ordering = ('order', 'min_value')


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    """Админка для дашбордов"""
    list_display = ('title', 'base_price', 'is_active', 'order', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'subtitle', 'description')
    ordering = ('order', 'title')
    inlines = [DiscountRuleInline]
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'title', 'subtitle', 'base_price')
        }),
        ('Контент', {
            'fields': ('description', 'details', 'preview', 'image')
        }),
        ('Настройки', {
            'fields': ('is_active', 'order')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DiscountRule)
class DiscountRuleAdmin(admin.ModelAdmin):
    """Админка для правил скидок"""
    list_display = ('dashboard', 'discount_type', 'min_value', 'discount_percent', 'is_active', 'order')
    list_filter = ('discount_type', 'is_active', 'dashboard')
    search_fields = ('dashboard__title', 'description')
    ordering = ('dashboard', 'order', 'min_value')
    fieldsets = (
        ('Основная информация', {
            'fields': ('dashboard', 'discount_type', 'min_value', 'discount_percent')
        }),
        ('Настройки', {
            'fields': ('is_active', 'order', 'description')
        }),
    )


@admin.register(Marketplace)
class MarketplaceAdmin(admin.ModelAdmin):
    """Админка для маркетплейсов"""
    list_display = ('name', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('order', 'name')


# === Админка для личного кабинета ===

@admin.register(PersonalData)
class PersonalDataAdmin(admin.ModelAdmin):
    """Админка для персональных данных"""
    list_display = ('user', 'first_name', 'last_name', 'company', 'phone', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('user__username', 'user__email', 'first_name', 'last_name', 'company', 'phone')
    ordering = ('user__username',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Пользователь', {
            'fields': ('user',)
        }),
        ('Личные данные', {
            'fields': ('first_name', 'last_name', 'company', 'phone')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AccountBalance)
class AccountBalanceAdmin(admin.ModelAdmin):
    """Админка для балансов счетов"""
    list_display = ('user', 'balance', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('user__username', 'user__email')
    ordering = ('-updated_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Пользователь', {
            'fields': ('user',)
        }),
        ('Баланс', {
            'fields': ('balance',)
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class SubscriptionInline(admin.TabularInline):
    """Inline для подписок в админке кабинета"""
    model = Subscription
    extra = 0
    fields = ('dashboard', 'status', 'price_per_month', 'months', 'start_date', 'end_date', 'auto_renewal')
    readonly_fields = ('start_date', 'end_date')


@admin.register(Cabinet)
class CabinetAdmin(admin.ModelAdmin):
    """Админка для кабинетов"""
    list_display = ('name', 'user', 'shop_name', 'marketplace', 'is_active', 'created_at')
    list_filter = ('marketplace', 'is_active', 'created_at')
    search_fields = ('name', 'shop_name', 'user__username', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [SubscriptionInline]
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'name', 'shop_name', 'marketplace', 'is_active')
        }),
        ('API ключи', {
            'fields': ('api_key',)
        }),
        ('Настройки OZON', {
            'fields': ('ozon_seller_client_id', 'ozon_performance_client_id', 'ozon_performance_client_secret'),
            'classes': ('collapse',)
        }),
        ('Настройки Wildberries', {
            'fields': ('gem_connected', 'articles_per_campaign'),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Админка для подписок"""
    list_display = ('cabinet', 'dashboard', 'status', 'price_per_month', 'months', 'start_date', 'end_date', 'auto_renewal')
    list_filter = ('status', 'auto_renewal', 'start_date', 'end_date')
    search_fields = ('cabinet__name', 'dashboard__title', 'cabinet__user__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Основная информация', {
            'fields': ('cabinet', 'dashboard', 'status')
        }),
        ('Параметры подписки', {
            'fields': ('price_per_month', 'months', 'start_date', 'end_date', 'auto_renewal')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Админка для платежей"""
    list_display = ('user', 'payment_type', 'amount', 'status', 'created_at')
    list_filter = ('payment_type', 'status', 'created_at')
    search_fields = ('user__username', 'user__email', 'transaction_id', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'payment_type', 'subscription', 'amount', 'status')
        }),
        ('Детали платежа', {
            'fields': ('payment_method', 'transaction_id', 'description')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class TicketMessageInline(admin.TabularInline):
    """Inline для сообщений в админке тикета"""
    model = TicketMessage
    extra = 0
    fields = ('user', 'message', 'is_admin', 'created_at')
    readonly_fields = ('created_at',)
    ordering = ('created_at',)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    """Админка для тикетов"""
    list_display = ('id', 'user', 'subject', 'status', 'priority', 'created_at', 'updated_at', 'messages_count')
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('subject', 'user__username', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'resolved_at')
    inlines = [TicketMessageInline]
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'subject', 'status', 'priority')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'resolved_at'),
            'classes': ('collapse',)
        }),
    )
    
    def messages_count(self, obj):
        """Количество сообщений в тикете"""
        return obj.messages.count()
    messages_count.short_description = 'Сообщений'


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    """Админка для сообщений в тикетах"""
    list_display = ('id', 'ticket', 'user', 'is_admin', 'created_at', 'message_preview')
    list_filter = ('is_admin', 'created_at')
    search_fields = ('message', 'ticket__subject', 'user__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Основная информация', {
            'fields': ('ticket', 'user', 'is_admin', 'message')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def message_preview(self, obj):
        """Превью сообщения"""
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_preview.short_description = 'Сообщение'
