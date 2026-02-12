from django.contrib import admin
from .models import VKIdLink


# Модели core регистрируются на кастомном nextan_admin_site
try:
    from dashboards.admin_site import nextan_admin_site
    nextan_admin_site.register(VKIdLink, admin.ModelAdmin)
except Exception:
    pass