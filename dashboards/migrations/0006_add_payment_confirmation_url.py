# Generated manually for Celery retry YooKassa payment

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboards', '0005_add_last_admin_read_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='confirmation_url',
            field=models.URLField(blank=True, max_length=500, verbose_name='URL для перехода на оплату'),
        ),
    ]
