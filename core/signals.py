"""
Сигналы для синхронизации с корзиной и другими действиями при любом входе.
"""
from django.contrib.auth import user_logged_in

from .views import merge_cart_on_login


def on_user_logged_in(sender, request, user, **kwargs):
    """При любом входе (email или Google) переносим корзину из сессии в аккаунт."""
    merge_cart_on_login(request, user)


def connect_signals():
    user_logged_in.connect(on_user_logged_in)
