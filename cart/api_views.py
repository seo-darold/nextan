from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from .models import Cart, CartItem
from dashboards.models import Dashboard, Cabinet, Subscription, Payment
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


class CheckoutAPIView(APIView):
    """API для оформления заказа"""
    
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
        """Проверка статуса авторизации и корзины перед оформлением"""
        cart = self.get_cart(request)
        
        if not cart or not cart.items.exists():
            return Response({
                'can_checkout': False,
                'reason': 'empty_cart',
                'message': 'Корзина пуста',
            })
        
        return Response({
            'can_checkout': True,
            'is_authenticated': request.user.is_authenticated,
            'cart_total': float(cart.get_total()),
            'items_count': cart.get_items_count(),
        })
    
    def post(self, request):
        """Оформление заказа - создание подписок из корзины"""
        # Проверяем авторизацию
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'reason': 'not_authenticated',
                'message': 'Для оформления заказа необходимо авторизоваться',
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Получаем корзину
        cart = self.get_cart(request)
        if not cart or not cart.items.exists():
            return Response({
                'success': False,
                'reason': 'empty_cart',
                'message': 'Корзина пуста',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        created_subscriptions = []
        total_amount = Decimal('0.00')
        
        try:
            # Обрабатываем каждый элемент корзины
            for cart_item in cart.items.select_related('dashboard').all():
                # Для каждого маркетплейса создаём кабинеты и подписки
                for marketplace in cart_item.marketplaces:
                    # Определяем код маркетплейса
                    marketplace_code = 'WB' if marketplace.lower() in ['wildberries', 'wb'] else 'OZON'
                    
                    # Создаём кабинеты для каждого из указанного количества
                    for cab_num in range(cart_item.cabinets_count):
                        # Создаём кабинет (пользователь позже заполнит данные)
                        cabinet = Cabinet.objects.create(
                            user=user,
                            name=f'{cart_item.dashboard.title} - {marketplace} #{cab_num + 1}',
                            shop_name=f'Магазин {marketplace} #{cab_num + 1}',
                            marketplace=marketplace_code,
                            api_key='',  # Пользователь заполнит позже
                            is_active=True,
                        )
                        
                        # Рассчитываем даты подписки
                        start_date = timezone.now()
                        end_date = start_date + timedelta(days=30 * cart_item.months)
                        
                        # Цена за один кабинет = общая цена / количество кабинетов
                        price_per_cabinet = cart_item.price_per_month / cart_item.cabinets_count
                        
                        # Создаём подписку (до оплаты — статус «Ожидает оплаты»)
                        subscription = Subscription.objects.create(
                            cabinet=cabinet,
                            dashboard=cart_item.dashboard,
                            status='pending',
                            price_per_month=price_per_cabinet,
                            months=cart_item.months,
                            start_date=start_date,
                            end_date=end_date,
                            auto_renewal=False,
                        )
                        
                        created_subscriptions.append({
                            'id': subscription.id,
                            'cabinet_name': cabinet.name,
                            'dashboard': cart_item.dashboard.title,
                            'marketplace': marketplace,
                            'months': cart_item.months,
                            'price_per_month': float(price_per_cabinet),
                            'end_date': end_date.isoformat(),
                        })
                
                # Считаем общую сумму
                total_amount += cart_item.get_total_price()
            
            # Создаём запись о платеже (статус pending - ожидает оплаты)
            payment = Payment.objects.create(
                user=user,
                payment_type='subscription',
                amount=total_amount,
                status='pending',
                description=f'Оплата подписок: {len(created_subscriptions)} шт.',
            )
            
            # Очищаем корзину после успешного оформления
            cart.items.all().delete()
            
            return Response({
                'success': True,
                'message': 'Заказ успешно оформлен',
                'subscriptions': created_subscriptions,
                'payment': {
                    'id': payment.id,
                    'amount': float(total_amount),
                    'status': payment.status,
                },
                'redirect_url': '/dashboard/',
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'reason': 'error',
                'message': f'Ошибка при оформлении заказа: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

