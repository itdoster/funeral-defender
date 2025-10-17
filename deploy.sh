#!/bin/bash

# Funeral Defender - Автоматический скрипт развертывания
# Использование: ./deploy.sh

set -e

echo "🚀 Начинаем развертывание Funeral Defender..."

# # Проверка наличия Docker
# if ! command -v docker &> /dev/null; then
#     echo "❌ Docker не установлен. Устанавливаем..."
#     curl -fsSL https://get.docker.com -o get-docker.sh
#     sudo sh get-docker.sh
#     sudo usermod -aG docker $USER
#     rm get-docker.sh
# fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Создание .env файла если не существует
if [ ! -f .env ]; then
    echo "📝 Создаем файл .env..."
    cp env.example .env
    echo "⚠️  ВНИМАНИЕ: Отредактируйте файл .env перед продолжением!"
    echo "   Особенно важно установить:"
    echo "   - DB_PASSWORD (сложный пароль)"
    echo "   - SECRET_KEY (случайная строка)"
    echo ""
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Создание директории для SSL сертификатов
mkdir -p nginx/ssl

# Функция для настройки SSL
setup_ssl() {
    echo "🔒 Настраиваем SSL сертификат..."
    
    # Проверяем наличие домена в .env
    DOMAIN=$(grep "DOMAIN=" .env 2>/dev/null | cut -d'=' -f2)
    if [ -z "$DOMAIN" ]; then
        echo "⚠️  Домен не указан в .env файле"
        echo "   Добавьте строку: DOMAIN=pohorony-minsk.by"
        echo "   Пропускаем настройку SSL..."
        return
    fi
    
    echo "🌐 Настраиваем SSL для домена: $DOMAIN"
    
    # Проверяем, что домен указывает на этот сервер
    echo "🔍 Проверяем DNS записи..."
    DOMAIN_IP=$(nslookup $DOMAIN | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        echo "❌ ОШИБКА: Домен $DOMAIN указывает на $DOMAIN_IP, а не на этот сервер $SERVER_IP"
        echo "   Сначала настройте DNS:"
        echo "   A-запись: $DOMAIN → $SERVER_IP"
        echo "   Подождите 5-10 минут и запустите скрипт снова"
        echo ""
        echo "🔄 Запускаем без SSL..."
        docker-compose up -d
        return
    fi
    
    echo "✅ DNS настроен правильно: $DOMAIN → $DOMAIN_IP"
    
    # Установка Certbot если не установлен
    if ! command -v certbot &> /dev/null; then
        echo "📦 Устанавливаем Certbot..."
        sudo apt update
        sudo apt install -y certbot
    fi
    
    # Временно запускаем только приложение без nginx для получения сертификата
    echo "🚀 Запускаем приложение для получения SSL сертификата..."
    docker-compose up -d app postgres
    
    # Ждем запуска приложения
    echo "⏳ Ожидаем запуска приложения..."
    sleep 15
    
    # Получение SSL сертификата
    echo "🔐 Получаем SSL сертификат от Let's Encrypt..."
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL сертификат получен успешно!"
        
        # Копирование сертификатов
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
        sudo chown $USER:$USER nginx/ssl/*.pem
        
        echo "📋 Сертификаты скопированы в nginx/ssl/"
        
        # Настройка автоматического обновления
        echo "🔄 Настраиваем автоматическое обновление сертификата..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx") | crontab -
        
        # Остановка временных контейнеров
        docker-compose down
        
        echo "✅ SSL настроен! Запускаем с HTTPS и Nginx..."
        docker-compose --profile production up -d
        
    else
        echo "❌ Ошибка получения SSL сертификата"
        echo "   Проверьте:"
        echo "   1. Домен $DOMAIN указывает на этот сервер"
        echo "   2. Порт 80 открыт в файрволе"
        echo "   3. DNS записи настроены правильно"
        echo ""
        echo "🔄 Запускаем без SSL..."
        docker-compose down
        docker-compose up -d
    fi
}

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

# Ожидание запуска базы данных
echo "⏳ Ожидаем запуска базы данных..."
sleep 10

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
