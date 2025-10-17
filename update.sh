#!/bin/bash

# Funeral Defender - Автоматический скрипт развертывания
# Использование: ./deploy.sh

set -e

echo "🚀 Начинаем развертывание Funeral Defender..."


# Остановка существующих контейнеров
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down 2>/dev/null || true

# Сборка и запуск контейнеров
echo "🔨 Собираем контейнеры..."
docker-compose build

# Проверяем, нужно ли настроить SSL
if [ -f .env ] && grep -q "DOMAIN=" .env; then
    echo "🔍 Обнаружен домен в .env - настраиваем SSL..."
    setup_ssl
else
    echo "🔨 Запускаем без SSL..."
    docker-compose up -d
fi


# Проверка здоровья сервисов
echo "🔍 Проверяем состояние сервисов..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Сервис запущен успешно!"
        break
    fi
    echo "⏳ Ожидаем запуска сервиса... ($i/30)"
    sleep 2
done

# Вывод информации о развертывании
echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📊 Информация о сервисах:"
echo "   - Прокси-сервер: http://localhost:3000"
echo "   - База данных: localhost:5432"
echo "   - Целевой сайт: $(grep TARGET_URL .env | cut -d'=' -f2)"
echo ""
echo "🔗 Полезные команды:"
echo "   - Проверка здоровья: curl http://localhost:3000/health"
echo "   - Просмотр логов: docker-compose logs -f"
echo "   - Остановка: docker-compose down"
echo "   - Перезапуск: docker-compose restart"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Настройте DNS: A-запись домена → IP этого сервера"
echo "   2. Установите SSL сертификат (Let's Encrypt)"
echo "   3. Настройте файрвол (порты 80, 443)"
echo ""
echo "📖 Подробная документация: deployment-guide.md"
