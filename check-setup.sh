#!/bin/bash

# Скрипт проверки настройки Funeral Defender
echo "🔍 Проверяем настройку Funeral Defender..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Проверка подключения к серверу
echo -e "${YELLOW}🌐 Проверяем подключение к серверу 81.177.222.35...${NC}"
ping -c 1 81.177.222.35 > /dev/null 2>&1
check_status $? "Сервер 81.177.222.35 доступен"

# Проверка подключения к Тильде
echo -e "${YELLOW}🎯 Проверяем подключение к Тильде 45.155.60.8...${NC}"
ping -c 1 45.155.60.8 > /dev/null 2>&1
check_status $? "IP Тильды 45.155.60.8 доступен"

# Проверка HTTP ответа от Тильды
echo -e "${YELLOW}📡 Проверяем HTTP ответ от Тильды...${NC}"
curl -s -o /dev/null -w "%{http_code}" http://45.155.60.8 --max-time 10 | grep -q "200\|301\|302"
check_status $? "HTTP ответ от Тильды получен"

# Проверка наличия Docker
echo -e "${YELLOW}🐳 Проверяем наличие Docker...${NC}"
command -v docker > /dev/null 2>&1
check_status $? "Docker установлен"

# Проверка наличия Docker Compose
echo -e "${YELLOW}🔧 Проверяем наличие Docker Compose...${NC}"
command -v docker-compose > /dev/null 2>&1
check_status $? "Docker Compose установлен"

# Проверка .env файла
echo -e "${YELLOW}📝 Проверяем .env файл...${NC}"
if [ -f .env ]; then
    if grep -q "TARGET_URL=http://45.155.60.8" .env; then
        check_status 0 ".env файл настроен правильно"
    else
        check_status 1 ".env файл не настроен правильно"
    fi
else
    check_status 1 ".env файл не найден"
fi

# Проверка портов
echo -e "${YELLOW}🔌 Проверяем доступность портов...${NC}"
if command -v nc > /dev/null 2>&1; then
    nc -z 81.177.222.35 22 > /dev/null 2>&1
    check_status $? "SSH порт 22 доступен"
    
    nc -z 81.177.222.35 80 > /dev/null 2>&1
    check_status $? "HTTP порт 80 доступен"
else
    echo -e "${YELLOW}⚠️  netcat не установлен, пропускаем проверку портов${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo "1. Загрузите проект на сервер 81.177.222.35"
echo "2. Настройте .env файл с правильными параметрами"
echo "3. Запустите: docker-compose up -d"
echo "4. Настройте DNS: pohorony-minsk.by → 81.177.222.35"
echo "5. Установите SSL сертификат"
echo ""
echo -e "${GREEN}🎉 Готово к развертыванию!${NC}"

