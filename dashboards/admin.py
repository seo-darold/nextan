from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import (
    Dashboard, DiscountRule, Marketplace,
    PersonalData, AccountBalance, Cabinet, Subscription,
    Payment, Ticket, TicketMessage
)
from .admin_site import nextan_admin_site


class DiscountRuleInline(admin.TabularInline):
    """Inline для правил скидок в админке дашборда"""
    model = DiscountRule
    extra = 0
    fields = ('discount_type', 'min_value', 'discount_percent', 'is_active', 'order', 'description')
    ordering = ('order', 'min_value')


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


class MarketplaceAdmin(admin.ModelAdmin):
    """Админка для маркетплейсов"""
    list_display = ('name', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('order', 'name')


# === Админка для личного кабинета ===

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
        ('Доступ к Power BI', {
            'fields': ('powerbi_link', 'powerbi_login', 'powerbi_password')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


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
    """Inline для добавления новых сообщений от администратора"""
    model = TicketMessage
    extra = 1
    max_num = 1  # Можно добавить только одно новое сообщение за раз
    fields = ('message',)
    verbose_name = 'Новое сообщение'
    verbose_name_plural = 'Ответить на тикет'
    classes = []  # Убираем collapse - блок не будет сворачиваться
    
    def get_queryset(self, request):
        """Не показываем существующие сообщения в inline - они отображаются в чате"""
        return super().get_queryset(request).none()
    
    def has_change_permission(self, request, obj=None):
        """Запрещаем редактирование через inline"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Запрещаем удаление через inline"""
        return False
    
    def save_new_instance(self, form, commit=True):
        """При сохранении нового сообщения автоматически устанавливаем is_admin=True и user"""
        instance = form.save(commit=False)
        if not instance.pk:
            instance.is_admin = True
        if commit:
            instance.save()
        return instance


class TicketAdmin(admin.ModelAdmin):
    """Админка для тикетов"""
    list_display = ('id', 'subject', 'user', 'status', 'priority', 'created_at', 'updated_at', 'messages_count', 'unread_count_display')
    list_display_links = ('id', 'subject')  # Клик по ID или Теме ведёт на страницу тикета
    list_filter = ('status', 'priority', 'created_at')
    search_fields = ('subject', 'user__username', 'user__email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'resolved_at', 'chat_messages_display')
    inlines = [TicketMessageInline]
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'subject', 'status', 'priority')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'resolved_at'),
        }),
        ('История переписки', {
            'fields': ('chat_messages_display',),
            'classes': ('wide',)
        }),
    )
    
    class Media:
        css = {
            'all': ('admin/css/ticket_chat.css',)
        }
        js = ('admin/js/ticket_ajax.js',)
    
    def messages_count(self, obj):
        """Количество сообщений в тикете"""
        return obj.messages.count()
    messages_count.short_description = 'Сообщ.'
    
    def unread_count_display(self, obj):
        """Количество непрочитанных сообщений"""
        count = obj.get_unread_messages_count_for_admin()
        if count > 0:
            return format_html(
                '<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">{}</span>',
                count
            )
        return '-'
    unread_count_display.short_description = 'Новых'
    
    def chat_messages_display(self, obj):
        """Отображение всех сообщений в чат-стиле"""
        if not obj.pk:
            return 'Сохраните тикет, чтобы увидеть сообщения'
        
        messages = obj.messages.all().select_related('user').order_by('created_at')
        
        if not messages.exists():
            return 'Нет сообщений'
        
        html_parts = ['''
            <div class="chat-container" style="
                max-height: 500px;
                overflow-y: auto;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 8px;
                border: 1px solid #ddd;
                width: 100%;
                box-sizing: border-box;
            ">
        ''']
        
        for msg in messages:
            # Определяем тип сообщения по is_staff автора
            is_support_msg = msg.user and msg.user.is_staff
            # Пользователь справа (зелёный), поддержка слева (белый)
            align = 'flex-start' if is_support_msg else 'flex-end'
            bg_color = '#ffffff' if is_support_msg else '#d4edda'
            border_color = '#dee2e6' if is_support_msg else '#28a745'
            label = 'Поддержка' if is_support_msg else 'Пользователь'
            label_color = '#6c757d' if is_support_msg else '#28a745'
            icon = '🛡️' if is_support_msg else '👤'
            
            html_parts.append(f'''
                <div style="
                    display: flex;
                    justify-content: {align};
                    margin-bottom: 10px;
                ">
                    <div style="
                        background: {bg_color};
                        border: 1px solid {border_color};
                        border-radius: 12px;
                        padding: 10px 15px;
                        max-width: 80%;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    ">
                        <div style="font-size: 11px; color: {label_color}; margin-bottom: 5px;">
                            <strong>{icon} {label}</strong> · {msg.user.username if msg.user else 'Неизвестен'} · {msg.created_at.strftime('%d.%m.%Y %H:%M') if msg.created_at else ''}
                        </div>
                        <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">{msg.message}</div>
                    </div>
                </div>
            ''')
        
        html_parts.append('</div>')
        
        return mark_safe(''.join(html_parts))
    chat_messages_display.short_description = 'Переписка'
    
    def change_view(self, request, object_id, form_url='', extra_context=None):
        """При просмотре тикета обновляем время последнего прочтения админом"""
        obj = self.get_object(request, object_id)
        if obj:
            obj.last_admin_read_at = timezone.now()
            obj.save(update_fields=['last_admin_read_at'])
        return super().change_view(request, object_id, form_url, extra_context)
    
    def save_formset(self, request, form, formset, change):
        """При сохранении inline устанавливаем автора и флаг is_admin"""
        instances = formset.save(commit=False)
        for instance in instances:
            if not instance.pk:  # Новое сообщение
                instance.user = request.user
                instance.is_admin = True
            instance.save()
        formset.save_m2m()


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
    
    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Добавляем предупреждение для сообщений пользователей"""
        obj = self.get_object(request, object_id)
        extra_context = extra_context or {}
        # Проверяем по is_staff автора сообщения
        if obj and obj.user and not obj.user.is_staff:
            extra_context['show_save'] = False
            extra_context['show_save_and_continue'] = False
            extra_context['show_save_and_add_another'] = False
        return super().change_view(request, object_id, form_url, extra_context)
    
    def message_preview(self, obj):
        """Превью сообщения"""
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_preview.short_description = 'Сообщение'
    
    def is_user_message(self, obj):
        """Проверяет, является ли сообщение от обычного пользователя (не staff)"""
        return obj and obj.user and not obj.user.is_staff
    
    def get_readonly_fields(self, request, obj=None):
        """Запрещаем редактировать сообщения пользователей"""
        readonly = list(super().get_readonly_fields(request, obj))
        if self.is_user_message(obj):
            # Если это сообщение пользователя - делаем все поля readonly
            readonly.extend(['ticket', 'user', 'is_admin', 'message'])
        return readonly
    
    def has_change_permission(self, request, obj=None):
        """
        Разрешаем просмотр сообщений пользователей, но редактирование 
        запрещено через readonly_fields в get_readonly_fields
        """
        return super().has_change_permission(request, obj)
    
    def has_delete_permission(self, request, obj=None):
        """Запрещаем удаление сообщений пользователей"""
        if self.is_user_message(obj):
            return False
        return super().has_delete_permission(request, obj)


# Регистрируем модели на кастомном admin site
nextan_admin_site.register(Dashboard, DashboardAdmin)
nextan_admin_site.register(DiscountRule, DiscountRuleAdmin)
nextan_admin_site.register(Marketplace, MarketplaceAdmin)
nextan_admin_site.register(PersonalData, PersonalDataAdmin)
nextan_admin_site.register(AccountBalance, AccountBalanceAdmin)
nextan_admin_site.register(Cabinet, CabinetAdmin)
nextan_admin_site.register(Subscription, SubscriptionAdmin)
nextan_admin_site.register(Payment, PaymentAdmin)
nextan_admin_site.register(Ticket, TicketAdmin)
# TicketMessage не регистрируем отдельно - сообщения доступны только через тикеты