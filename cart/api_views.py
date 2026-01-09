from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from decimal import Decimal
from .models import Cart, CartItem
from dashboards.models import Dashboard
from dashboards.utils import calculate_price_with_discounts


class CartAPIView(APIView):
    """API для работы с корзиной"""
    
    def get_cart(self, request):
        """Получает или создает корзину"""
        if request.user.is_authenticated:
            cart, created = Cart.objects.get_or_create(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            cart, created = Cart.objects.get_or_create(session_key=session_key, user=None)
        return cart
    
    def get(self, request):
        """Получение корзины"""
        cart = self.get_cart(request)
        items = cart.items.select_related('dashboard').all()
        
        items_data = []
        for item in items:
            items_data.append({
                'id': item.id,
                'dashboard_id': item.dashboard.id,
                'dashboard_title': item.dashboard.title,
                'marketplaces': item.marketplaces,
                'cabinets_count': item.cabinets_count,
                'months': item.months,
                'base_price_per_month': float(item.base_price_per_month),
                'price_per_month': float(item.price_per_month),
                'discount_percent': float(item.discount_percent),
                'applied_discounts': item.applied_discounts,
                'total_price': float(item.get_total_price()),
            })
        
        return Response({
            'cart_id': cart.id,
            'items': items_data,
            'total': float(cart.get_total()),
            'items_count': cart.get_items_count(),
        })
    
    def post(self, request):
        """Добавление элемента в корзину"""
        dashboard_id = request.data.get('dashboard_id')
        marketplaces = request.data.get('marketplaces', [])
        cabinets_count = request.data.get('cabinets_count', 1)
        months = request.data.get('months', 1)
        
        # Валидация
        if not dashboard_id:
            return Response(
                {'error': 'dashboard_id обязателен'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not marketplaces or not isinstance(marketplaces, list):
            return Response(
                {'error': 'marketplaces должен быть непустым списком'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dashboard = Dashboard.objects.get(id=dashboard_id, is_active=True)
        except Dashboard.DoesNotExist:
            return Response(
                {'error': 'Дашборд не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Расчет цены
        marketplaces_count = len(marketplaces)
        price_data = calculate_price_with_discounts(
            dashboard=dashboard,
            marketplaces_count=marketplaces_count,
            cabinets_count=cabinets_count,
            months=months
        )
        
        # Создание элемента корзины
        cart = self.get_cart(request)
        cart_item = CartItem.objects.create(
            cart=cart,
            dashboard=dashboard,
            marketplaces=marketplaces,
            cabinets_count=cabinets_count,
            months=months,
            base_price_per_month=price_data['base_price_per_month'],
            price_per_month=price_data['price_per_month_after_discount'],
            discount_percent=price_data['total_discount_percent'],
            applied_discounts=price_data['applied_discounts'],
        )
        
        return Response({
            'id': cart_item.id,
            'message': 'Элемент добавлен в корзину',
            'total': float(cart.get_total()),
        }, status=status.HTTP_201_CREATED)
    
    def delete(self, request, item_id=None):
        """Удаление элемента из корзины"""
        if not item_id:
            item_id = request.data.get('item_id')
        
        if not item_id:
            return Response(
                {'error': 'item_id обязателен'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart = self.get_cart(request)
        try:
            item = cart.items.get(id=item_id)
            item.delete()
            return Response({
                'message': 'Элемент удален из корзины',
                'total': float(cart.get_total()),
            })
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Элемент не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def patch(self, request, item_id=None):
        """Обновление элемента корзины"""
        if not item_id:
            item_id = request.data.get('item_id')
        
        if not item_id:
            return Response(
                {'error': 'item_id обязателен'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart = self.get_cart(request)
        try:
            item = cart.items.get(id=item_id)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Элемент не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Обновление параметров
        marketplaces = request.data.get('marketplaces', item.marketplaces)
        cabinets_count = request.data.get('cabinets_count', item.cabinets_count)
        months = request.data.get('months', item.months)
        
        # Пересчет цены
        marketplaces_count = len(marketplaces) if isinstance(marketplaces, list) else len(item.marketplaces)
        price_data = calculate_price_with_discounts(
            dashboard=item.dashboard,
            marketplaces_count=marketplaces_count,
            cabinets_count=cabinets_count,
            months=months
        )
        
        # Обновление элемента
        item.marketplaces = marketplaces
        item.cabinets_count = cabinets_count
        item.months = months
        item.base_price_per_month = price_data['base_price_per_month']
        item.price_per_month = price_data['price_per_month_after_discount']
        item.discount_percent = price_data['total_discount_percent']
        item.applied_discounts = price_data['applied_discounts']
        item.save()
        
        return Response({
            'id': item.id,
            'message': 'Элемент обновлен',
            'total': float(cart.get_total()),
        })


class CartClearAPIView(APIView):
    """API для очистки корзины"""
    
    def get_cart(self, request):
        """Получает корзину"""
        if request.user.is_authenticated:
            try:
                return Cart.objects.get(user=request.user)
            except Cart.DoesNotExist:
                return None
        else:
            session_key = request.session.session_key
            if session_key:
                try:
                    return Cart.objects.get(session_key=session_key, user=None)
                except Cart.DoesNotExist:
                    return None
        return None
    
    def post(self, request):
        """Очистка корзины"""
        cart = self.get_cart(request)
        if cart:
            cart.items.all().delete()
            return Response({
                'message': 'Корзина очищена',
                'total': 0.0,
            })
        return Response({
            'message': 'Корзина уже пуста',
            'total': 0.0,
        })


class CartTotalAPIView(APIView):
    """API для получения итоговой суммы корзины"""
    
    def get_cart(self, request):
        """Получает корзину"""
        if request.user.is_authenticated:
            try:
                return Cart.objects.get(user=request.user)
            except Cart.DoesNotExist:
                return None
        else:
            session_key = request.session.session_key
            if session_key:
                try:
                    return Cart.objects.get(session_key=session_key, user=None)
                except Cart.DoesNotExist:
                    return None
        return None
    
    def get(self, request):
        """Получение итоговой суммы"""
        cart = self.get_cart(request)
        if cart:
            return Response({
                'total': float(cart.get_total()),
                'items_count': cart.get_items_count(),
            })
        return Response({
            'total': 0.0,
            'items_count': 0,
        })

