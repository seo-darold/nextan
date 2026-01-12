from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import (
    Dashboard, Marketplace, Cabinet, Subscription, Payment,
    Ticket, TicketMessage, PersonalData, AccountBalance
)
from .utils import calculate_price_with_discounts


class DashboardListAPIView(APIView):
    """API для получения списка дашбордов"""
    
    def get(self, request):
        dashboards = Dashboard.objects.filter(is_active=True).order_by('order', 'title')
        data = []
        for dashboard in dashboards:
            # Получаем доступные скидки для дашборда
            discount_rules = dashboard.discount_rules.filter(is_active=True)
            available_discounts = [
                {
                    'type': rule.discount_type,
                    'min_value': rule.min_value,
                    'discount_percent': float(rule.discount_percent),
                    'description': rule.description or f"Скидка {rule.discount_percent}%"
                }
                for rule in discount_rules
            ]
            
            data.append({
                'id': dashboard.id,
                'title': dashboard.title,
                'subtitle': dashboard.subtitle,
                'base_price': float(dashboard.base_price),
                'preview': dashboard.preview or '',
                'image': dashboard.image.url if dashboard.image else None,
                'description': dashboard.description,
                'details': dashboard.details,
                'available_discounts': available_discounts,
            })
        
        return Response(data)


class PriceCalculationAPIView(APIView):
    """API для расчета цены с учетом скидок"""
    
    def post(self, request):
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
        
        if cabinets_count < 1:
            return Response(
                {'error': 'cabinets_count должен быть >= 1'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if months < 1:
            return Response(
                {'error': 'months должен быть >= 1'}, 
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
        
        # Форматируем ответ
        response_data = {
            'base_price': float(dashboard.base_price),
            'price_per_month_before_discount': float(price_data['base_price_per_month']),
            'applied_discounts': price_data['applied_discounts'],
            'total_discount_percent': float(price_data['total_discount_percent']),
            'price_per_month_after_discount': float(price_data['price_per_month_after_discount']),
            'total_price': float(price_data['total_price']),
            'savings': float(price_data['savings']),
        }
        
        return Response(response_data)


# === API для личного кабинета ===

@method_decorator(login_required, name='dispatch')
class PersonalDataAPIView(APIView):
    """API для работы с персональными данными"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить персональные данные"""
        try:
            personal_data = request.user.personal_data
            data = {
                'first_name': personal_data.first_name,
                'last_name': personal_data.last_name,
                'company': personal_data.company,
                'phone': personal_data.phone,
                'email': request.user.email,
            }
        except PersonalData.DoesNotExist:
            data = {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'company': '',
                'phone': '',
                'email': request.user.email,
            }
        return Response(data)
    
    def post(self, request):
        """Создать или обновить персональные данные"""
        personal_data, created = PersonalData.objects.get_or_create(
            user=request.user,
            defaults={
                'first_name': request.data.get('first_name', ''),
                'last_name': request.data.get('last_name', ''),
                'company': request.data.get('company', ''),
                'phone': request.data.get('phone', ''),
            }
        )
        
        if not created:
            personal_data.first_name = request.data.get('first_name', personal_data.first_name)
            personal_data.last_name = request.data.get('last_name', personal_data.last_name)
            personal_data.company = request.data.get('company', personal_data.company)
            personal_data.phone = request.data.get('phone', personal_data.phone)
            personal_data.save()
        
        # Обновляем email пользователя
        if 'email' in request.data:
            request.user.email = request.data['email']
            request.user.save()
        
        return Response({'success': True, 'message': 'Данные успешно сохранены'})


@method_decorator(login_required, name='dispatch')
class AccountBalanceAPIView(APIView):
    """API для работы с балансом счёта"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить баланс счёта"""
        balance_obj, created = AccountBalance.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('0.00')}
        )
        return Response({
            'balance': float(balance_obj.balance),
            'formatted_balance': f"{balance_obj.balance:.2f} руб."
        })


@method_decorator(login_required, name='dispatch')
class BalanceTopUpAPIView(APIView):
    """API для пополнения счёта"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Создать запрос на пополнение счёта"""
        amount = request.data.get('amount')
        
        if not amount:
            return Response(
                {'error': 'Укажите сумму пополнения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response(
                    {'error': 'Сумма должна быть больше нуля'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Неверный формат суммы'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаём платеж на пополнение
        payment = Payment.objects.create(
            user=request.user,
            payment_type='balance_topup',
            amount=amount,
            status='pending',
            description=f'Пополнение счёта на {amount} руб.'
        )
        
        # В реальном приложении здесь должна быть интеграция с платёжной системой
        # Для демо просто сразу завершаем платеж
        payment.status = 'completed'
        payment.save()
        
        # Обновляем баланс
        balance_obj, created = AccountBalance.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('0.00')}
        )
        balance_obj.balance += amount
        balance_obj.save()
        
        return Response({
            'success': True,
            'payment_id': payment.id,
            'new_balance': float(balance_obj.balance),
            'message': 'Счёт успешно пополнен'
        })


@method_decorator(login_required, name='dispatch')
class CabinetListAPIView(APIView):
    """API для работы с кабинетами"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить список кабинетов пользователя"""
        cabinets = Cabinet.objects.filter(user=request.user, is_active=True)
        data = [{
            'id': cabinet.id,
            'name': cabinet.name,
            'shop_name': cabinet.shop_name,
            'marketplace': cabinet.marketplace,
            'marketplace_display': cabinet.get_marketplace_display(),
            'created_at': cabinet.created_at.isoformat(),
            'subscriptions_count': cabinet.subscriptions.filter(status='active').count(),
        } for cabinet in cabinets]
        return Response(data)
    
    def post(self, request):
        """Создать новый кабинет"""
        name = request.data.get('name')
        shop_name = request.data.get('shop_name')
        marketplace = request.data.get('marketplace')
        api_key = request.data.get('api_key')
        
        if not all([name, shop_name, marketplace, api_key]):
            return Response(
                {'error': 'Заполните все обязательные поля'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if marketplace not in ['OZON', 'WB']:
            return Response(
                {'error': 'Неверный маркетплейс'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cabinet = Cabinet.objects.create(
            user=request.user,
            name=name,
            shop_name=shop_name,
            marketplace=marketplace,
            api_key=api_key,
            ozon_seller_client_id=request.data.get('ozon_seller_client_id', ''),
            ozon_performance_client_id=request.data.get('ozon_performance_client_id', ''),
            ozon_performance_client_secret=request.data.get('ozon_performance_client_secret', ''),
            gem_connected=request.data.get('gem_connected') == 'yes',
            articles_per_campaign=request.data.get('articles_per_campaign') or None,
        )
        
        return Response({
            'success': True,
            'cabinet_id': cabinet.id,
            'message': 'Кабинет успешно создан'
        }, status=status.HTTP_201_CREATED)


@method_decorator(login_required, name='dispatch')
class CabinetDetailAPIView(APIView):
    """API для работы с конкретным кабинетом"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, cabinet_id):
        """Получить детальную информацию о кабинете"""
        try:
            cabinet = Cabinet.objects.get(id=cabinet_id, user=request.user)
        except Cabinet.DoesNotExist:
            return Response(
                {'error': 'Кабинет не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        subscriptions = cabinet.subscriptions.all()
        subscriptions_data = [{
            'id': sub.id,
            'dashboard_id': sub.dashboard.id,
            'dashboard_title': sub.dashboard.title,
            'status': sub.status,
            'status_display': sub.get_status_display(),
            'price_per_month': float(sub.price_per_month),
            'months': sub.months,
            'start_date': sub.start_date.isoformat(),
            'end_date': sub.end_date.isoformat(),
            'auto_renewal': sub.auto_renewal,
        } for sub in subscriptions]
        
        # Получаем персональные данные пользователя
        try:
            personal_data = request.user.personal_data
            personal_data_dict = {
                'first_name': personal_data.first_name,
                'last_name': personal_data.last_name,
                'company': personal_data.company,
                'phone': personal_data.phone,
            }
        except PersonalData.DoesNotExist:
            personal_data_dict = {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'company': '',
                'phone': '',
            }
        
        data = {
            'id': cabinet.id,
            'name': cabinet.name,
            'shop_name': cabinet.shop_name,
            'marketplace': cabinet.marketplace,
            'marketplace_display': cabinet.get_marketplace_display(),
            'created_at': cabinet.created_at.isoformat(),
            'subscriptions': subscriptions_data,
            'personal_data': personal_data_dict,
        }
        return Response(data)
    
    def delete(self, request, cabinet_id):
        """Удалить кабинет"""
        try:
            cabinet = Cabinet.objects.get(id=cabinet_id, user=request.user)
            cabinet.is_active = False
            cabinet.save()
            return Response({'success': True, 'message': 'Кабинет удалён'})
        except Cabinet.DoesNotExist:
            return Response(
                {'error': 'Кабинет не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(login_required, name='dispatch')
class SubscriptionListAPIView(APIView):
    """API для работы с подписками"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить список подписок пользователя"""
        cabinets = Cabinet.objects.filter(user=request.user)
        subscriptions = Subscription.objects.filter(cabinet__in=cabinets)
        
        data = [{
            'id': sub.id,
            'cabinet_id': sub.cabinet.id,
            'cabinet_name': sub.cabinet.name,
            'dashboard_id': sub.dashboard.id,
            'dashboard_title': sub.dashboard.title,
            'status': sub.status,
            'status_display': sub.get_status_display(),
            'price_per_month': float(sub.price_per_month),
            'months': sub.months,
            'start_date': sub.start_date.isoformat(),
            'end_date': sub.end_date.isoformat(),
            'auto_renewal': sub.auto_renewal,
        } for sub in subscriptions]
        return Response(data)


@method_decorator(login_required, name='dispatch')
class PaymentListAPIView(APIView):
    """API для работы с платежами"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить список платежей пользователя"""
        payments = Payment.objects.filter(user=request.user).order_by('-created_at')
        
        data = [{
            'id': payment.id,
            'payment_type': payment.payment_type,
            'payment_type_display': payment.get_payment_type_display(),
            'amount': float(payment.amount),
            'status': payment.status,
            'status_display': payment.get_status_display(),
            'payment_method': payment.payment_method,
            'description': payment.description,
            'created_at': payment.created_at.isoformat(),
            'subscription_id': payment.subscription.id if payment.subscription else None,
        } for payment in payments]
        return Response(data)


@method_decorator(login_required, name='dispatch')
class TicketListAPIView(APIView):
    """API для работы с тикетами"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить список тикетов пользователя"""
        tickets = Ticket.objects.filter(user=request.user).order_by('-created_at')
        
        data = [{
            'id': ticket.id,
            'subject': ticket.subject,
            'status': ticket.status,
            'status_display': ticket.get_status_display(),
            'priority': ticket.priority,
            'priority_display': ticket.get_priority_display(),
            'created_at': ticket.created_at.isoformat(),
            'updated_at': ticket.updated_at.isoformat(),
            'messages_count': ticket.messages.count(),
            'has_unread': ticket.messages.filter(is_admin=True).exists() and not ticket.messages.filter(is_admin=True).last().created_at < ticket.updated_at,
        } for ticket in tickets]
        return Response(data)
    
    def post(self, request):
        """Создать новый тикет"""
        subject = request.data.get('subject')
        message_text = request.data.get('message')
        priority = request.data.get('priority', 'medium')
        
        if not subject or not message_text:
            return Response(
                {'error': 'Заполните тему и сообщение'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ticket = Ticket.objects.create(
            user=request.user,
            subject=subject,
            priority=priority
        )
        
        TicketMessage.objects.create(
            ticket=ticket,
            user=request.user,
            message=message_text,
            is_admin=False
        )
        
        return Response({
            'success': True,
            'ticket_id': ticket.id,
            'message': 'Тикет успешно создан'
        }, status=status.HTTP_201_CREATED)


@method_decorator(login_required, name='dispatch')
class TicketDetailAPIView(APIView):
    """API для работы с конкретным тикетом"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, ticket_id):
        """Получить детальную информацию о тикете"""
        try:
            ticket = Ticket.objects.get(id=ticket_id, user=request.user)
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Тикет не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        messages = ticket.messages.all()
        messages_data = [{
            'id': msg.id,
            'message': msg.message,
            'is_admin': msg.is_admin,
            'author': msg.user.username if not msg.is_admin else 'Администратор',
            'created_at': msg.created_at.isoformat(),
        } for msg in messages]
        
        data = {
            'id': ticket.id,
            'subject': ticket.subject,
            'status': ticket.status,
            'status_display': ticket.get_status_display(),
            'priority': ticket.priority,
            'priority_display': ticket.get_priority_display(),
            'created_at': ticket.created_at.isoformat(),
            'updated_at': ticket.updated_at.isoformat(),
            'messages': messages_data,
        }
        return Response(data)
    
    def post(self, request, ticket_id):
        """Добавить сообщение в тикет"""
        try:
            ticket = Ticket.objects.get(id=ticket_id, user=request.user)
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Тикет не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        message_text = request.data.get('message')
        if not message_text:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Если тикет был закрыт, открываем его снова
        if ticket.status == 'closed':
            ticket.status = 'open'
            ticket.save()
        
        message = TicketMessage.objects.create(
            ticket=ticket,
            user=request.user,
            message=message_text,
            is_admin=False
        )
        
        return Response({
            'success': True,
            'message_id': message.id,
            'message': 'Сообщение добавлено'
        }, status=status.HTTP_201_CREATED)
