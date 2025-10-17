# Руководство по развертыванию Funeral Defender

## 🖥️ Требования к серверу

**Минимальные требования:**
- CPU: 1 ядро
- RAM: 1GB
- Диск: 10GB SSD
- ОС: Ubuntu 20.04+ или CentOS 8+

**Рекомендуемые:**
- CPU: 2 ядра
- RAM: 2GB
- Диск: 20GB SSD
- Публичный IP адрес

## 📋 Пошаговое развертывание

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка для применения изменений
sudo reboot
```

### Шаг 2: Загрузка проекта на сервер

```bash
# Клонирование проекта
git clone <your-repo-url> funeral-defender
cd funeral-defender

# Или загрузка через SCP
scp -r funeral-defender/ user@your-server-ip:/home/user/
```

### Шаг 3: Настройка переменных окружения

```bash
# Создание .env файла
cp env.example .env

# Редактирование конфигурации
nano .env
```

**Содержимое .env для продакшена:**
```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=funeral_defender
DB_USER=postgres
DB_PASSWORD=очень_сложный_пароль_123

# Server Configuration
PORT=3000
TARGET_URL=http://45.155.60.8

# Bot Protection Settings
BAN_DURATION_HOURS=4
REDIRECT_DELAY_MS=1000

# Security
SECRET_KEY=ваш_секретный_ключ_для_безопасности
```

### Шаг 4: Запуск системы

```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f app
```

### Шаг 5: Настройка DNS

В панели управления доменом измените A-запись:
```
Тип: A
Имя: @ (или pohorony-minsk)
Значение: IP_АДРЕС_ВАШЕГО_СЕРВЕРА
TTL: 300
```

### Шаг 6: Настройка SSL (обязательно!)

```bash
# Установка Certbot
sudo apt install certbot

# Получение SSL сертификата
sudo certbot certonly --standalone -d pohorony-minsk.by

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/pohorony-minsk.by/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/pohorony-minsk.by/privkey.pem ./nginx/ssl/key.pem
sudo chown $USER:$USER ./nginx/ssl/*.pem

# Обновление nginx.conf для HTTPS
# Раскомментируйте секцию HTTPS в nginx/nginx.conf

# Перезапуск с HTTPS
docker-compose --profile production up -d
```

## 🔧 Настройка Nginx для HTTPS

Обновите `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name pohorony-minsk.by www.pohorony-minsk.by;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pohorony-minsk.by www.pohorony-minsk.by;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Мониторинг и обслуживание

### Автоматическое обновление SSL
```bash
# Добавление в crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
```

### Мониторинг системы
```bash
# Проверка статуса
curl https://pohorony-minsk.by/health

# Просмотр логов
docker-compose logs -f app

# Проверка базы данных
docker-compose exec postgres psql -U postgres -d funeral_defender -c "SELECT COUNT(*) FROM ip_tracking WHERE is_banned = true;"
```

### Бэкап базы данных
```bash
# Создание бэкапа
docker-compose exec postgres pg_dump -U postgres funeral_defender > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U postgres funeral_defender < backup_file.sql
```

## 🚨 Важные замечания

1. **Firewall**: Убедитесь, что открыты порты 80 и 443
2. **SSL**: Обязательно используйте HTTPS в продакшене
3. **Мониторинг**: Настройте уведомления о проблемах
4. **Бэкапы**: Регулярно делайте бэкапы базы данных
5. **Обновления**: Регулярно обновляйте систему безопасности
