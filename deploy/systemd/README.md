# Systemd-сервисы Nextan (Redis, Celery worker, Celery beat)

## Текущее состояние

- **User-level (без root):** юниты Celery скопированы в `~/.config/systemd/user/`, включены и запущены. Они будут переподключаться к Redis при появлении брокера.
- **Redis** в системе не установлен — для работы очередей его нужно установить и запустить (см. ниже).

## Полная установка (с правами root)

Установка Redis, копирование юнитов в `/etc/systemd/system` и запуск всех сервисов:

```bash
cd /home/user/nextan
sudo deploy/systemd/install.sh
```

Скрипт:

1. Устанавливает пакет `redis-server`, если его ещё нет.
2. Копирует `celery-worker.service` и `celery-beat.service` в `/etc/systemd/system/`.
3. Включает и запускает `redis-server`, `celery-worker`, `celery-beat`.

После этого проверка:

```bash
sudo systemctl status redis-server celery-worker celery-beat
```

## Только установка Redis (если Celery уже в user systemd)

Если хотите оставить Celery в user systemd и только поднять Redis:

```bash
sudo apt-get update && sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
```

После этого перезапустите user-сервисы Celery:

```bash
systemctl --user restart celery-worker celery-beat
systemctl --user status celery-worker celery-beat
```

## Полезные команды

- Логи воркера: `journalctl --user -u celery-worker -f` или `sudo journalctl -u celery-worker -f`
- Логи beat: `journalctl --user -u celery-beat -f` или `sudo journalctl -u celery-beat -f`
- Остановка (user): `systemctl --user stop celery-worker celery-beat`
- Остановка (system): `sudo systemctl stop celery-worker celery-beat`
