"""
Конфигурация Celery для проекта nextan.
При запуске Django приложение загружается и app.autodiscover_tasks() подхватывает tasks во всех INSTALLED_APPS.
"""
from celery import Celery
from django.conf import settings

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Задача для проверки работы воркера: celery -A config call config.celery.debug_task"""
    print(f'Request: {self.request!r}')
