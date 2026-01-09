from django.contrib import admin
from .models import Dashboard, DiscountRule, Marketplace


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
