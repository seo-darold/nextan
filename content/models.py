from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Persona(models.Model):
    """Типы продавцов (Новичок, Действующий селлер и т.д.)"""
    title = models.CharField(max_length=100, verbose_name='Название')
    description = models.TextField(verbose_name='Описание')
    icon_svg = models.TextField(blank=True, null=True, verbose_name='SVG иконка')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Тип продавца'
        verbose_name_plural = 'Типы продавцов'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title


class ProcessStep(models.Model):
    """Шаги процесса работы"""
    step_number = models.IntegerField(verbose_name='Номер шага')
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    description = models.TextField(verbose_name='Описание')
    time_tag = models.CharField(max_length=50, verbose_name='Метка времени (например, "5 минут")')
    items = models.JSONField(default=list, blank=True, verbose_name='Список пунктов')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')

    class Meta:
        verbose_name = 'Шаг процесса'
        verbose_name_plural = 'Шаги процесса'
        ordering = ['order', 'step_number']

    def __str__(self):
        return f"Шаг {self.step_number}: {self.title}"


class SchemeFlow(models.Model):
    """Схема взаимодействия"""
    step_number = models.IntegerField(verbose_name='Номер шага')
    tag = models.CharField(max_length=100, verbose_name='Тег (например, "Подключение")')
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    description = models.TextField(verbose_name='Описание')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')

    class Meta:
        verbose_name = 'Шаг схемы взаимодействия'
        verbose_name_plural = 'Схема взаимодействия'
        ordering = ['order', 'step_number']

    def __str__(self):
        return f"{self.tag}: {self.title}"


class Benefit(models.Model):
    """Преимущества"""
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    description = models.TextField(verbose_name='Описание')
    icon_image = models.ImageField(upload_to='benefits/icons/', blank=True, null=True, verbose_name='Иконка')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Преимущество'
        verbose_name_plural = 'Преимущества'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title


class SocialProofMetric(models.Model):
    """Метрики социального доказательства"""
    label = models.CharField(max_length=100, verbose_name='Метка (например, "Клиенты")')
    value = models.CharField(max_length=50, verbose_name='Значение (например, "3000+")')
    description = models.CharField(max_length=200, verbose_name='Описание')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        verbose_name = 'Метрика'
        verbose_name_plural = 'Метрики'
        ordering = ['order', 'label']

    def __str__(self):
        return f"{self.label}: {self.value}"


class FAQ(models.Model):
    """Часто задаваемые вопросы"""
    question = models.CharField(max_length=300, verbose_name='Вопрос')
    answer = models.TextField(verbose_name='Ответ')
    order = models.IntegerField(default=0, verbose_name='Порядок отображения')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    is_expanded = models.BooleanField(default=False, verbose_name='Открыт по умолчанию')

    class Meta:
        verbose_name = 'Вопрос-ответ'
        verbose_name_plural = 'Часто задаваемые вопросы'
        ordering = ['order', 'question']

    def __str__(self):
        return self.question


class CompanyInfo(models.Model):
    """Информация о компании (синглтон)"""
    company_name = models.CharField(max_length=200, verbose_name='Название компании')
    inn = models.CharField(max_length=20, verbose_name='ИНН')
    kpp = models.CharField(max_length=20, verbose_name='КПП')
    bik = models.CharField(max_length=20, verbose_name='БИК')
    account_number = models.CharField(max_length=50, verbose_name='Расчетный счет')
    bank_name = models.CharField(max_length=200, verbose_name='Название банка')
    legal_address = models.CharField(max_length=300, verbose_name='Юридический адрес')
    office_address = models.CharField(max_length=300, blank=True, verbose_name='Адрес офиса')
    phone = models.CharField(max_length=50, verbose_name='Телефон')
    email_sales = models.EmailField(verbose_name='Email для продаж')
    email_support = models.EmailField(verbose_name='Email поддержки')
    email_hr = models.EmailField(blank=True, null=True, verbose_name='Email HR')
    telegram_link = models.URLField(blank=True, null=True, verbose_name='Ссылка на Telegram')
    whatsapp_link = models.URLField(blank=True, null=True, verbose_name='Ссылка на WhatsApp')
    viber_link = models.URLField(blank=True, null=True, verbose_name='Ссылка на Viber')
    vk_link = models.URLField(blank=True, null=True, verbose_name='Ссылка на ВКонтакте')
    youtube_link = models.URLField(blank=True, null=True, verbose_name='Ссылка на YouTube')
    working_hours = models.CharField(max_length=100, blank=True, verbose_name='Рабочие часы')

    class Meta:
        verbose_name = 'Информация о компании'
        verbose_name_plural = 'Информация о компании'

    def __str__(self):
        return self.company_name

    def save(self, *args, **kwargs):
        # Обеспечиваем, что будет только одна запись
        self.pk = 1
        super().save(*args, **kwargs)


class ContactRequest(models.Model):
    """Заявки с формы контактов"""
    name = models.CharField(max_length=100, verbose_name='Имя')
    email = models.EmailField(verbose_name='Email')
    company = models.CharField(max_length=200, verbose_name='Компания')
    comment = models.TextField(verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    is_processed = models.BooleanField(default=False, verbose_name='Обработана')

    class Meta:
        verbose_name = 'Заявка с формы контактов'
        verbose_name_plural = 'Заявки с формы контактов'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.company}) - {self.created_at.strftime('%d.%m.%Y %H:%M')}"
