#!/bin/bash
# Установка systemd-юнитов для Nextan: Redis, Celery worker, Celery beat.
# Запуск: sudo ./install.sh
# Требуется: права root для копирования в /etc/systemd/system и установки пакетов.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="/etc/systemd/system"

echo "=== Nextan: установка systemd-сервисов ==="

# 1. Redis (если не установлен)
if ! command -v redis-server &>/dev/null; then
    echo "Установка Redis..."
    apt-get update -qq && apt-get install -y redis-server
else
    echo "Redis уже установлен."
fi

# 2. Копирование юнитов
echo "Копирование unit-файлов в $TARGET..."
cp -v "$SCRIPT_DIR/celery-worker.service" "$TARGET/"
cp -v "$SCRIPT_DIR/celery-beat.service" "$TARGET/"

# 3. Перезагрузка systemd и включение сервисов
systemctl daemon-reload
systemctl enable redis-server.service 2>/dev/null || systemctl enable redis.service 2>/dev/null || true
systemctl enable celery-worker.service celery-beat.service

# 4. Запуск
echo "Запуск сервисов..."
systemctl start redis-server.service 2>/dev/null || systemctl start redis.service 2>/dev/null || true
systemctl start celery-worker.service celery-beat.service

echo ""
echo "Готово. Статус:"
systemctl is-active redis-server.service redis.service 2>/dev/null || true
systemctl is-active celery-worker.service celery-beat.service
echo ""
echo "Полезные команды:"
echo "  sudo systemctl status celery-worker celery-beat redis-server"
echo "  sudo journalctl -u celery-worker -f"
