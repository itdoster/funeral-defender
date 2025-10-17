# 🚀 Финальная настройка Funeral Defender

## 📋 Ваши данные:
- **Домен**: `pohorony-minsk.by`
- **Сервер прокси**: `81.177.222.35`
- **Целевой IP Тильды**: `45.155.60.8`

## 🎯 Схема работы:
```
Пользователь → pohorony-minsk.by → 81.177.222.35 → 45.155.60.8 (Тильда)
```

## 📝 Пошаговая инструкция:

### 1. Подключитесь к серверу
```bash
ssh root@81.177.222.35
# или
ssh user@81.177.222.35
```

### 2. Установите Docker (если не установлен)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. Установите Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Загрузите проект на сервер
```bash
# Вариант 1: Git clone (если проект в репозитории)
git clone <your-repo-url> funeral-defender
cd funeral-defender

# Вариант 2: Загрузка файлов через SCP
scp -r funeral-defender/ user@81.177.222.35:/home/user/
```

### 5. Настройте конфигурацию
```bash
cd funeral-defender

# Создайте .env файл
cp env.example .env

# Отредактируйте .env
nano .env
```

**Содержимое .env файла:**
```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=funeral_defender
DB_USER=postgres
DB_PASSWORD=ОЧЕНЬ_СЛОЖНЫЙ_ПАРОЛЬ_123

# Server Configuration
PORT=3000
TARGET_URL=http://45.155.60.8

# Bot Protection Settings
BAN_DURATION_HOURS=4
REDIRECT_DELAY_MS=1000
ALLOW_SEARCH_BOTS=true  # Allow Google, Yandex, Bing to index your site

# Security
SECRET_KEY=СЛУЧАЙНАЯ_СТРОКА_456
```

### 6. Запустите систему
```bash
# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Запустите автоматическое развертывание
./deploy.sh
```

### 7. Настройте DNS
В панели управления доменом `pohorony-minsk.by`:

**Основная A-запись:**
```
Тип: A
Имя: @
Значение: 81.177.222.35
TTL: 300
```

**WWW поддомен:**
```
Тип: A
Имя: www
Значение: 81.177.222.35
TTL: 300
```

### 8. Проверьте работу
```bash
# Проверка здоровья сервиса
curl http://81.177.222.35:3000/health

# Проверка через домен (после настройки DNS)
curl http://pohorony-minsk.by/health
```

### 9. Настройте SSL (обязательно!)
```bash
# Установите Certbot
sudo apt install certbot nginx

# Получите SSL сертификат
sudo certbot certonly --standalone -d pohorony-minsk.by

# Скопируйте сертификаты
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/pohorony-minsk.by/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/pohorony-minsk.by/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*.pem

# Запустите с HTTPS
docker-compose --profile production up -d
```

### 10. Настройте файрвол
```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔍 Проверка работы

### Тест 1: Проверка прокси
```bash
curl -H "Host: pohorony-minsk.by" http://81.177.222.35:3000/
```

### Тест 2: Проверка блокировки
```bash
# Первый запрос - должен пройти
curl -H "Host: pohorony-minsk.by" http://81.177.222.35:3000/

# Через 4 часа тот же IP должен быть заблокирован
```

### Тест 3: Проверка редиректов
```bash
curl -I http://81.177.222.35:3000/redirect-1
# Должен вернуть 302 редирект
```

## 📊 Мониторинг

### Просмотр логов
```bash
docker-compose logs -f app
```

### Проверка базы данных
```bash
docker-compose exec postgres psql -U postgres -d funeral_defender
```

### Статистика заблокированных IP
```sql
SELECT COUNT(*) FROM ip_tracking WHERE is_banned = true;
```

## 🚨 Важные замечания

1. **DNS**: После настройки DNS может потребоваться до 24 часов для полного распространения
2. **SSL**: Обязательно настройте HTTPS для продакшена
3. **Бэкапы**: Настройте регулярные бэкапы базы данных
4. **Мониторинг**: Следите за логами и производительностью
5. **Обновления**: Регулярно обновляйте систему безопасности

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `curl http://81.177.222.35:3000/health`
3. Проверьте подключение к Тильде: `curl http://45.155.60.8`

## ✅ Готово!

После выполнения всех шагов ваш сайт будет защищен от ботов:
- Обычные пользователи будут видеть сайт как обычно
- Боты будут заблокированы через 4 часа
- Заблокированные боты попадут в бесконечные редиректы
