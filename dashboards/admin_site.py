"""
Кастомный AdminSite со счётчиком непрочитанных тикетов
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin, GroupAdmin
from django.contrib.auth.models import User, Group
from django.utils.html import format_html


class NextanAdminSite(admin.AdminSite):
    """Кастомный AdminSite с поддержкой счётчика непрочитанных тикетов"""
    
    site_header = 'Некст Аналитика'
    site_title = 'Nextan Admin'
    index_title = 'Панель управления'
    
    def each_context(self, request):
        """Добавляем счётчик непрочитанных тикетов в контекст"""
        context = super().each_context(request)
        
        # Добавляем счётчик непрочитанных тикетов
        try:
            from dashboards.models import Ticket
            context['unread_tickets_count'] = Ticket.get_total_unread_messages_for_admin()
        except Exception:
            context['unread_tickets_count'] = 0
        
        return context
    
    def get_app_list(self, request, app_label=None):
        """Переопределяем для добавления счётчика к модели Ticket"""
        app_list = super().get_app_list(request, app_label)
        
        # Получаем счётчик непрочитанных
        try:
            from dashboards.models import Ticket
            unread_count = Ticket.get_total_unread_messages_for_admin()
        except Exception:
            unread_count = 0
        
        # Добавляем счётчик к названию модели Ticket
        for app in app_list:
            for model in app.get('models', []):
                if model.get('object_name') == 'Ticket':
                    if unread_count > 0:
                        # Добавляем HTML-бейдж к названию
                        badge = format_html(
                            ' <span style="background: #dc3545; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">{}</span>',
                            unread_count
                        )
                        model['name'] = format_html('{}{}', model['name'], badge)
                        model['unread_count'] = unread_count
        
        return app_list


# Создаём экземпляр кастомного админ-сайта
nextan_admin_site = NextanAdminSite(name='nextan_admin')

# Регистрируем стандартные модели Django
nextan_admin_site.register(User, UserAdmin)
nextan_admin_site.register(Group, GroupAdmin)
