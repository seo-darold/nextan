"""
Сервисные функции для dashboards (завершение платежей и т.д.).
Используются из views и из фоновых задач, чтобы не дублировать логику.
"""
from decimal import Decimal

from .models import Payment, AccountBalance


def complete_balance_topup_payment(payment):
    """
    Завершить платёж пополнения: обновить баланс и статус.
    Вызывать при успешной оплате в ЮKassa (из webhook или синхронно в демо-режиме).
    """
    if payment.status == 'completed':
        return
    if payment.payment_type != 'balance_topup':
        return
    balance_obj, _ = AccountBalance.objects.get_or_create(
        user=payment.user,
        defaults={'balance': Decimal('0.00')}
    )
    balance_obj.balance += payment.amount
    balance_obj.save()
    payment.status = 'completed'
    payment.payment_method = 'yookassa'
    payment.save(update_fields=['status', 'payment_method', 'updated_at'])
