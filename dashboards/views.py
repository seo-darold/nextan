import json
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings as django_settings
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.utils.html import escape
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.db import transaction
from django.db.models import F
from datetime import timedelta
from decimal import Decimal

from .models import (
    Dashboard, Marketplace, Cabinet, Subscription, Payment,
    Ticket, TicketMessage, PersonalData, AccountBalance
)
from .utils import calculate_price_with_discounts
from .services import complete_balance_topup_payment

logger = logging.getLogger(__name__)


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
                'powerbi_link': personal_data.powerbi_link,
                'powerbi_login': personal_data.powerbi_login,
                'powerbi_password': personal_data.powerbi_password,
            }
        except PersonalData.DoesNotExist:
            data = {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'company': '',
                'phone': '',
                'email': request.user.email,
                'powerbi_link': '',
                'powerbi_login': '',
                'powerbi_password': '',
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
                'powerbi_link': request.data.get('powerbi_link', ''),
                'powerbi_login': request.data.get('powerbi_login', ''),
                'powerbi_password': request.data.get('powerbi_password', ''),
            }
        )
        
        if not created:
            personal_data.first_name = request.data.get('first_name', personal_data.first_name)
            personal_data.last_name = request.data.get('last_name', personal_data.last_name)
            personal_data.company = request.data.get('company', personal_data.company)
            personal_data.phone = request.data.get('phone', personal_data.phone)
            personal_data.powerbi_link = request.data.get('powerbi_link', personal_data.powerbi_link)
            personal_data.powerbi_login = request.data.get('powerbi_login', personal_data.powerbi_login)
            personal_data.powerbi_password = request.data.get('powerbi_password', personal_data.powerbi_password)
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
    """API для пополнения счёта через ЮKassa"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Создать платёж в ЮKassa и вернуть URL для перехода на оплату"""
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
            # ЮKassa: минимум 1 руб., для тестов можно меньше — проверяем 0.01
            if amount < Decimal('0.01'):
                return Response(
                    {'error': 'Минимальная сумма 0.01 руб.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Неверный формат суммы'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = Payment.objects.create(
            user=request.user,
            payment_type='balance_topup',
            amount=amount,
            status='pending',
            description=f'Пополнение счёта на {amount} руб.'
        )

        shop_id = getattr(django_settings, 'YOOKASSA_SHOP_ID', '') or ''
        secret_key = getattr(django_settings, 'YOOKASSA_SECRET_KEY', '') or ''

        if not shop_id or not secret_key:
            # Режим без ЮKassa: сразу завершаем (для разработки)
            payment.payment_method = 'demo'
            payment.save(update_fields=['payment_method'])
            complete_balance_topup_payment(payment)
            balance_obj = AccountBalance.objects.get(user=request.user)
            return Response({
                'success': True,
                'payment_id': payment.id,
                'new_balance': float(balance_obj.balance),
                'message': 'Счёт успешно пополнен (демо)',
                'confirmation_url': None,
            })

        try:
            from yookassa import Configuration, Payment as YooPayment

            Configuration.configure(shop_id, secret_key)
            return_path = getattr(django_settings, 'YOOKASSA_RETURN_PATH', '/payment/yookassa/return/')
            return_url = request.build_absolute_uri(return_path + f'?payment_id={payment.id}')

            idempotence_key = f'balance_topup_{payment.id}_{payment.created_at.timestamp()}'
            yoo_payload = {
                'amount': {
                    'value': f'{amount:.2f}',
                    'currency': 'RUB',
                },
                'capture': True,
                'confirmation': {
                    'type': 'redirect',
                    'return_url': return_url,
                },
                'description': payment.description,
                'metadata': {
                    'payment_id': str(payment.id),
                },
            }
            # SDK: create(idempotence_key, payload) — первый аргумент ключ идемпотентности
            try:
                yoo_response = YooPayment.create(idempotence_key, yoo_payload)
            except TypeError:
                # На случай другого порядка аргументов в версии SDK
                yoo_response = YooPayment.create(yoo_payload, idempotence_key)

            # Поддержка и объекта, и словаря ответа SDK
            confirmation_url = None
            conf = getattr(yoo_response, 'confirmation', None) or (yoo_response.get('confirmation') if isinstance(yoo_response, dict) else None)
            if conf is not None:
                confirmation_url = getattr(conf, 'confirmation_url', None) or (conf.get('confirmation_url') if isinstance(conf, dict) else None)
            if not confirmation_url:
                confirmation_url = getattr(yoo_response, 'confirmation_url', None)

            yoo_id = getattr(yoo_response, 'id', None) or (yoo_response.get('id') if isinstance(yoo_response, dict) else None)
            if yoo_id:
                payment.transaction_id = str(yoo_id)
                payment.save(update_fields=['transaction_id'])

            if not confirmation_url:
                logger.warning('YooKassa did not return confirmation_url: %s', yoo_response)
                return Response(
                    {'error': 'Не удалось создать платёж. Попробуйте позже.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            return Response({
                'success': True,
                'payment_id': payment.id,
                'confirmation_url': confirmation_url,
                'message': 'Перейдите по ссылке для оплаты',
            })
        except Exception as e:
            logger.exception('YooKassa create payment failed: %s', e)
            err_str = str(e).lower()
            if 'invalid_credentials' in err_str or 'unauthorized' in type(e).__name__.lower():
                err_msg = (
                    'Неверный идентификатор магазина или секретный ключ ЮKassa. '
                    'Проверьте в личном кабинете https://yookassa.ru/my: выберите магазин (Shop ID), '
                    'в Настройках → Ключи API скопируйте актуальный секретный ключ (при необходимости выпустите новый). '
                    'Обновите YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env и перезапустите приложение.'
                )
                return Response({'error': err_msg}, status=status.HTTP_502_BAD_GATEWAY)
            # Таймаут/временная ошибка API — ставим задачу на повторное создание платежа в фоне
            from .tasks import retry_create_yookassa_payment_task
            return_url = request.build_absolute_uri(
                getattr(django_settings, 'YOOKASSA_RETURN_PATH', '/payment/yookassa/return/') + f'?payment_id={payment.id}'
            )
            retry_create_yookassa_payment_task.delay(payment.id, return_url)
            return Response(
                {
                    'success': True,
                    'payment_id': payment.id,
                    'confirmation_url': None,
                    'message': 'Платёж создаётся в фоне. Обновите страницу через минуту или проверьте раздел «Платежи» — там появится ссылка на оплату.',
                },
                status=status.HTTP_202_ACCEPTED,
            )


@login_required
@require_GET
def yookassa_return_view(request):
    """Возврат пользователя после оплаты на ЮKassa: редирект на страницу платежей, опционально с сообщением."""
    from django.urls import reverse
    from django.contrib import messages
    payment_id = request.GET.get('payment_id')
    if payment_id:
        try:
            payment = Payment.objects.get(id=int(payment_id), user=request.user)
            if payment.status == 'completed':
                messages.success(request, f'Платёж на {payment.amount} ₽ успешно зачислен на баланс.')
            else:
                messages.info(request, 'Платёж в обработке. Баланс обновится после подтверждения.')
        except (Payment.DoesNotExist, ValueError):
            pass
    return redirect(reverse('content:payments'))


@csrf_exempt
@require_POST
def yookassa_webhook_view(request):
    """Обработчик уведомлений ЮKassa (payment.succeeded и др.): завершаем платёж и пополняем баланс."""
    shop_id = getattr(django_settings, 'YOOKASSA_SHOP_ID', '') or ''
    secret_key = getattr(django_settings, 'YOOKASSA_SECRET_KEY', '') or ''
    if not shop_id or not secret_key:
        return HttpResponse(status=200)

    try:
        body = json.loads(request.body.decode('utf-8'))
    except (ValueError, TypeError):
        return HttpResponse(status=400)

    event = body.get('event')
    payment_data = body.get('object', {})
    if event != 'payment.succeeded' or not payment_data:
        return HttpResponse(status=200)

    yoo_id = payment_data.get('id')
    status_val = payment_data.get('status')
    if status_val != 'succeeded' or not yoo_id:
        return HttpResponse(status=200)

    # Находим наш платёж: по transaction_id (id в ЮKassa) или по metadata.payment_id (запасной вариант)
    payment = Payment.objects.filter(
        transaction_id=str(yoo_id),
        payment_type='balance_topup',
        status='pending',
    ).first()
    if not payment:
        metadata = payment_data.get('metadata') or {}
        our_payment_id = metadata.get('payment_id')
        if our_payment_id:
            try:
                payment = Payment.objects.filter(
                    id=int(our_payment_id),
                    payment_type='balance_topup',
                    status='pending',
                ).first()
            except (ValueError, TypeError):
                pass
        if not payment:
            logger.warning(
                'YooKassa webhook: payment not found for yoo_id=%s, metadata=%s',
                yoo_id, metadata,
            )
            return HttpResponse(status=200)

    # Обрабатываем синхронно, чтобы баланс обновился сразу и не зависеть от очереди Celery
    complete_balance_topup_payment(payment)
    logger.info('YooKassa webhook: completed payment id=%s (yoo_id=%s)', payment.id, yoo_id)
    return HttpResponse(status=200)


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
        """Получить список подписок пользователя (истечение подписок по расписанию — задача expire_subscriptions_task)"""
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
class PaySubscriptionFromBalanceAPIView(APIView):
    """Оплата подписки со счёта. Активирует подписку и задаёт период с даты оплаты."""
    permission_classes = [IsAuthenticated]

    def post(self, request, subscription_id):
        try:
            subscription = Subscription.objects.select_related('cabinet').get(
                id=subscription_id,
                cabinet__user=request.user
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'Подписка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        if subscription.status != 'pending':
            return Response(
                {'error': 'Оплатить можно только подписку со статусом «Ожидает оплаты»'},
                status=status.HTTP_400_BAD_REQUEST
            )
        amount = subscription.price_per_month * subscription.months
        if amount <= 0:
            return Response(
                {'error': 'Некорректная сумма подписки'},
                status=status.HTTP_400_BAD_REQUEST
            )
        balance_obj, _ = AccountBalance.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('0.00')}
        )
        if balance_obj.balance < amount:
            return Response(
                {
                    'error': 'Недостаточно средств на счёте',
                    'required': float(amount),
                    'balance': float(balance_obj.balance),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        now = timezone.now()
        start_date = now
        end_date = now + timedelta(days=30 * subscription.months)
        try:
            with transaction.atomic():
                updated = AccountBalance.objects.filter(
                    user=request.user,
                    balance__gte=amount
                ).update(balance=F('balance') - amount)
                if updated == 0:
                    return Response(
                        {'error': 'Недостаточно средств на счёте'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                Payment.objects.create(
                    user=request.user,
                    payment_type='subscription',
                    subscription=subscription,
                    amount=amount,
                    status='completed',
                    payment_method='balance',
                    description=f'Оплата подписки: {subscription.dashboard.title}, {subscription.months} мес.',
                )
                subscription.status = 'active'
                subscription.start_date = start_date
                subscription.end_date = end_date
                subscription.save(update_fields=['status', 'start_date', 'end_date', 'updated_at'])
        except Exception as e:
            logger.exception('Pay subscription from balance failed: %s', e)
            return Response(
                {'error': f'Ошибка списания: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({
            'success': True,
            'message': 'Подписка успешно оплачена и активирована',
            'subscription': {
                'id': subscription.id,
                'status': subscription.status,
                'status_display': subscription.get_status_display(),
                'start_date': subscription.start_date.isoformat(),
                'end_date': subscription.end_date.isoformat(),
            },
            'new_balance': float(AccountBalance.objects.get(user=request.user).balance),
        })


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
            'confirmation_url': payment.confirmation_url or None,
        } for payment in payments]
        return Response(data)


@method_decorator(login_required, name='dispatch')
class TicketUnreadCountAPIView(APIView):
    """API для получения количества непрочитанных сообщений"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить общее количество непрочитанных сообщений во всех тикетах"""
        tickets = Ticket.objects.filter(user=request.user)
        unread_count = sum(ticket.get_unread_messages_count() for ticket in tickets)
        return Response({'unread_count': unread_count})


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
            'has_unread': ticket.has_unread_messages(),
            'unread_count': ticket.get_unread_messages_count(),
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
        
        # Отмечаем тикет как прочитанный
        ticket.last_read_at = timezone.now()
        ticket.save(update_fields=['last_read_at'])
        
        messages = ticket.messages.all()
        messages_data = [{
            'id': msg.id,
            'message': msg.message,
            'is_admin': msg.is_admin,
            'author': msg.user.email if msg.user == request.user else 'Служба поддержки НекстАналитика',
            'is_current_user': msg.user == request.user,
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


# === API для админки ===

@method_decorator(staff_member_required, name='dispatch')
class AdminTicketMessageAPIView(APIView):
    """API для отправки сообщений от администратора"""
    permission_classes = [IsAdminUser]
    
    def post(self, request, ticket_id):
        """Добавить сообщение от администратора в тикет"""
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response(
                {'error': 'Тикет не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаём сообщение от администратора
        message = TicketMessage.objects.create(
            ticket=ticket,
            user=request.user,
            message=message_text,
            is_admin=True
        )
        
        # Обновляем время последнего прочтения админом
        ticket.last_admin_read_at = timezone.now()
        ticket.save(update_fields=['last_admin_read_at', 'updated_at'])
        
        # Возвращаем HTML для нового сообщения
        msg_html = f'''
            <div style="
                display: flex;
                justify-content: flex-start;
                margin-bottom: 10px;
            ">
                <div style="
                    background: #ffffff;
                    border: 1px solid #dee2e6;
                    border-radius: 12px;
                    padding: 10px 15px;
                    max-width: 80%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">
                    <div style="font-size: 11px; color: #6c757d; margin-bottom: 5px;">
                        <strong>🛡️ Поддержка</strong> · {escape(request.user.username)} · {message.created_at.strftime('%d.%m.%Y %H:%M')}
                    </div>
                    <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">{escape(message_text)}</div>
                </div>
            </div>
        '''
        
        return Response({
            'success': True,
            'message_id': message.id,
            'message_html': msg_html,
            'created_at': message.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
