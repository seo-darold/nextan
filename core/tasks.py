"""
Фоновые задачи приложения core.
"""
import logging

from django.core.mail import send_mail
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, autoretry_for=(Exception,))
def send_password_reset_email(self, subject: str, message: str, recipient_email: str):
    """
    Отправка письма восстановления пароля в фоне.
    Повторные попытки при сбое SMTP (до 3 раз).
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info('Password reset email sent to %s', recipient_email)
    except Exception as e:
        logger.warning('Password reset email failed (retry %s): %s', self.request.retries, e)
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
