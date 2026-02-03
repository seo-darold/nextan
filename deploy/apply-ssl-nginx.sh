#!/bin/bash
# Применяет nginx-конфиг с SSL и редиректом HTTP->HTTPS.
# Запускать после получения сертификата: sudo ./apply-ssl-nginx.sh

set -e
CONF_SRC="/home/user/nextan/deploy/nginx-django_project-ssl.conf"
CONF_DST="/etc/nginx/sites-available/django_project"

if [[ $EUID -ne 0 ]]; then
   echo "Запустите скрипт с sudo: sudo $0"
   exit 1
fi

if [[ ! -f /etc/letsencrypt/live/nextanalytics.ru/fullchain.pem ]]; then
   echo "Сертификат не найден. Сначала выполните:"
   echo "  sudo certbot --nginx -d nextanalytics.ru -d www.nextanalytics.ru"
   exit 1
fi

cp "$CONF_SRC" "$CONF_DST"
nginx -t && systemctl reload nginx
echo "Конфиг применён, nginx перезагружен."
