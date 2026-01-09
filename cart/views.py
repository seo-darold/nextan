from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import Cart, CartItem


class CartView(TemplateView):
    """Страница корзины"""
    template_name = 'cart/cart.html'
    
    def get_cart(self):
        """Получает или создает корзину для пользователя или сессии"""
        if self.request.user.is_authenticated:
            cart, created = Cart.objects.get_or_create(user=self.request.user)
        else:
            session_key = self.request.session.session_key
            if not session_key:
                self.request.session.create()
                session_key = self.request.session.session_key
            cart, created = Cart.objects.get_or_create(session_key=session_key, user=None)
        return cart
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        cart = self.get_cart()
        context['cart'] = cart
        context['cart_items'] = cart.items.select_related('dashboard').all()
        context['cart_total'] = cart.get_total()
        context['cart_count'] = cart.get_items_count()
        return context
