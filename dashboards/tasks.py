"""
Фоновые задачи приложения dashboards.
"""
import logging
from decimal import Decimal

from django.conf import settings as django_settings
from django.utils import timezone
from celery import shared_task

from .models import Cabinet, Subscription, Payment
from .services import complete_balance_topup_payment

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, autoretry_for=(Exception,))
def complete_balance_topup_payment_task(self, payment_id: int):
    """
    Завершить платёж пополнения баланса (вызывается из webhook ЮKassa).
    ЮKassa уже прислала 200, обработка идёт в фоне — меньше таймаутов и дублей.
    """
    try:
        payment = Payment.objects.filter(
            id=payment_id,
            payment_type='balance_topup',
            status='pending',
        ).select_related('user').first()
        if not payment:
            logger.warning('complete_balance_topup_payment_task: payment id=%s not found or not pending', payment_id)
            return
        complete_balance_topup_payment(payment)
        logger.info('YooKassa webhook (async): completed payment id=%s', payment_id)
    except Exception as e:
        logger.exception('complete_balance_topup_payment_task failed for payment_id=%s: %s', payment_id, e)
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))


@shared_task
def expire_subscriptions_task():
    """
    Периодическая задача: перевести активные подписки с истёкшим периодом в статус «Ожидает оплаты».
    Запускается по расписанию (Celery Beat), раз в час.
    """
    updated = Subscription.objects.filter(
        status='active',
        end_date__lt=timezone.now(),
    ).update(status='pending')
    if updated:
        logger.info('expire_subscriptions_task: expired %s subscriptions', updated)


@shared_task(bind=True, max_retries=5, autoretry_for=(Exception,))
def retry_create_yookassa_payment_task(self, payment_id: int, return_url: str):
    """
    Повторное создание платежа в ЮKassa (при таймауте/ошибке в API при первом запросе).
    return_url передаётся из view при постановке задачи. Сохраняет transaction_id и confirmation_url в Payment.
    """
    from yookassa import Configuration, Payment as YooPayment

    payment = Payment.objects.filter(
        id=payment_id,
        payment_type='balance_topup',
        status='pending',
        transaction_id='',
    ).select_related('user').first()
    if not payment:
        logger.warning('retry_create_yookassa_payment_task: payment id=%s not found or already has transaction_id', payment_id)
        return

    shop_id = getattr(django_settings, 'YOOKASSA_SHOP_ID', '') or ''
    secret_key = getattr(django_settings, 'YOOKASSA_SECRET_KEY', '') or ''
    if not shop_id or not secret_key:
        logger.warning('retry_create_yookassa_payment_task: YooKassa not configured')
        return

    Configuration.configure(shop_id, secret_key)

    idempotence_key = f'balance_topup_{payment.id}_{payment.created_at.timestamp()}'
    yoo_payload = {
        'amount': {'value': f'{payment.amount:.2f}', 'currency': 'RUB'},
        'capture': True,
        'confirmation': {'type': 'redirect', 'return_url': return_url or f'https://nextanalytics.ru/payment/yookassa/return/?payment_id={payment.id}'},
        'description': payment.description or f'Пополнение счёта на {payment.amount} руб.',
        'metadata': {'payment_id': str(payment.id)},
    }

    try:
        yoo_response = YooPayment.create(idempotence_key, yoo_payload)
    except TypeError:
        yoo_response = YooPayment.create(yoo_payload, idempotence_key)

    conf = getattr(yoo_response, 'confirmation', None) or (yoo_response.get('confirmation') if isinstance(yoo_response, dict) else None)
    confirmation_url = None
    if conf is not None:
        confirmation_url = getattr(conf, 'confirmation_url', None) or (conf.get('confirmation_url') if isinstance(conf, dict) else None)
    if not confirmation_url:
        confirmation_url = getattr(yoo_response, 'confirmation_url', None)

    yoo_id = getattr(yoo_response, 'id', None) or (yoo_response.get('id') if isinstance(yoo_response, dict) else None)
    if yoo_id:
        payment.transaction_id = str(yoo_id)
    if confirmation_url:
        payment.confirmation_url = confirmation_url
    payment.save(update_fields=['transaction_id', 'confirmation_url', 'updated_at'])
    logger.info('retry_create_yookassa_payment_task: payment id=%s created in YooKassa, confirmation_url set', payment_id)
