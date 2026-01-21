from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import secrets


class PasswordResetToken(models.Model):
    """Токен для восстановления пароля"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Пользователь'
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name='Токен'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Создан'
    )
    expires_at = models.DateTimeField(
        verbose_name='Истекает'
    )
    is_used = models.BooleanField(
        default=False,
        verbose_name='Использован'
    )

    class Meta:
        verbose_name = 'Токен сброса пароля'
        verbose_name_plural = 'Токены сброса пароля'
        ordering = ['-created_at']

    def __str__(self):
        return f"Токен для {self.user.email} ({self.created_at})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.expires_at:
            # Токен действителен 12 часов
            self.expires_at = timezone.now() + timezone.timedelta(hours=12)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Проверяет, действителен ли токен"""
        return not self.is_used and timezone.now() < self.expires_at

    @classmethod
    def create_token(cls, user):
        """
        Создаёт новый токен для пользователя.
        Аннулирует все предыдущие активные токены.
        """
        # Помечаем все предыдущие токены как использованные
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Создаём новый токен
        return cls.objects.create(user=user)

    @classmethod
    def get_valid_token(cls, token):
        """
        Возвращает действительный токен или None
        """
        try:
            reset_token = cls.objects.get(token=token)
            if reset_token.is_valid:
                return reset_token
        except cls.DoesNotExist:
            pass
        return None
