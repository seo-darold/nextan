from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Persona, ProcessStep, SchemeFlow, Benefit, 
    SocialProofMetric, FAQ, CompanyInfo, ContactRequest
)


@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')
    ordering = ('order', 'title')


@admin.register(ProcessStep)
class ProcessStepAdmin(admin.ModelAdmin):
    list_display = ('step_number', 'title', 'time_tag', 'order')
    search_fields = ('title', 'description')
    ordering = ('order', 'step_number')


@admin.register(SchemeFlow)
class SchemeFlowAdmin(admin.ModelAdmin):
    list_display = ('step_number', 'tag', 'title', 'order')
    search_fields = ('tag', 'title', 'description')
    ordering = ('order', 'step_number')


@admin.register(Benefit)
class BenefitAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'order', 'icon_preview')
    list_filter = ('is_active',)
    search_fields = ('title', 'description')
    ordering = ('order', 'title')
    readonly_fields = ('icon_preview',)
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'order', 'is_active')
        }),
        ('Иконка', {
            'fields': ('icon_image', 'icon_preview')
        }),
    )
    
    def icon_preview(self, obj):
        """Отображение preview иконки в админке"""
        if obj.icon_image:
            return format_html(
                '<img src="{}" style="max-height: 64px; max-width: 64px;" />',
                obj.icon_image.url
            )
        return "Нет иконки"
    icon_preview.short_description = 'Превью иконки'


@admin.register(SocialProofMetric)
class SocialProofMetricAdmin(admin.ModelAdmin):
    list_display = ('label', 'value', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('label', 'value', 'description')
    ordering = ('order', 'label')


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'is_active', 'is_expanded', 'order')
    list_filter = ('is_active', 'is_expanded')
    search_fields = ('question', 'answer')
    ordering = ('order', 'question')


@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    """Админка для информации о компании (синглтон)"""
    def has_add_permission(self, request):
        # Разрешаем только одну запись
        return not CompanyInfo.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Не разрешаем удаление
        return False
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('company_name', 'inn', 'kpp')
        }),
        ('Банковские реквизиты', {
            'fields': ('bik', 'account_number', 'bank_name')
        }),
        ('Адреса', {
            'fields': ('legal_address', 'office_address')
        }),
        ('Контакты', {
            'fields': ('phone', 'email_sales', 'email_support', 'email_hr', 'working_hours')
        }),
        ('Социальные сети', {
            'fields': ('telegram_link', 'whatsapp_link', 'viber_link', 'vk_link', 'youtube_link')
        }),
    )


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'email', 'is_processed', 'created_at')
    list_filter = ('is_processed', 'created_at')
    search_fields = ('name', 'company', 'email')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    fieldsets = (
        ('Информация о заявке', {
            'fields': ('name', 'email', 'company', 'comment')
        }),
        ('Статус', {
            'fields': ('is_processed', 'created_at')
        }),
    )
