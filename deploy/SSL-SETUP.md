# SSL Let's Encrypt для nextanalytics.ru

## Шаг 1. Установка Certbot (если ещё не установлен)

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

## Шаг 2. Получение сертификата

Certbot сам настроит nginx для проверки домена и получит сертификат:

```bash
sudo certbot --nginx -d nextanalytics.ru -d www.nextanalytics.ru
```

- Введите email для уведомлений от Let's Encrypt.
- Примите условия (Agree).
- Certbot создаст сертификат и временно добавит HTTPS в конфиг nginx.

## Шаг 3. Применение конфига с редиректом HTTP → HTTPS

После успешного получения сертификата примените полный конфиг (редирект с HTTP на HTTPS и одна корректная HTTPS-секция):

```bash
sudo /home/user/nextan/deploy/apply-ssl-nginx.sh
```

Либо вручную:

```bash
sudo cp /home/user/nextan/deploy/nginx-django_project-ssl.conf /etc/nginx/sites-available/django_project
sudo nginx -t && sudo systemctl reload nginx
```

## Проверка

- https://nextanalytics.ru — открывается по HTTPS
- http://nextanalytics.ru — перенаправляется на https://nextanalytics.ru

## Продление сертификата

Let's Encrypt выдаёт сертификаты на 90 дней. Продление:

```bash
sudo certbot renew
```

Обычно добавляют в cron (дважды в день):

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

Или в crontab: `0 3 * * * certbot renew --quiet`
