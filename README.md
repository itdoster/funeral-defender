# Funeral Defender - Bot Protection Proxy Server

Прокси-сервер для защиты веб-сайта от ботов и скликивания рекламы. Система автоматически блокирует IP-адреса через 4 часа после первого визита и создает бесконечные редиректы для заблокированных ботов.

## 🛡️ Как это работает

1. **Отслеживание IP**: Каждый IP-адрес записывается в базу данных при первом визите
2. **Защита поисковых ботов**: Google, Яндекс, Bing и другие поисковики НЕ блокируются
3. **Автоматическая блокировка**: Через 4 часа после первого визита IP автоматически блокируется
4. **Бесконечные редиректы**: Заблокированные IP попадают в бесконечный цикл редиректов
5. **Прозрачная работа**: Обычные пользователи и поисковики проходят через прокси без проблем

## 🚀 Быстрый старт

### Вариант 1: Docker Compose (Рекомендуется)

1. **Клонируйте репозиторий и перейдите в папку**:
   ```bash
   cd funeral-defender
   ```

2. **Создайте файл `.env`**:
   ```bash
   cp env.example .env
   ```

3. **Настройте переменные окружения в `.env`**:
   ```env
   DB_PASSWORD=your_secure_password_here
   TARGET_URL=https://pohorony-minsk.by
   BAN_DURATION_HOURS=4
   REDIRECT_DELAY_MS=1000
   SECRET_KEY=your_secret_key_here
   ```

4. **Запустите сервисы**:
   ```bash
   docker-compose up -d
   ```

5. **Проверьте работу**:
   ```bash
   curl http://localhost:3000/health
   ```

### Вариант 2: Локальная установка

1. **Установите PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Создайте базу данных**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE funeral_defender;
   \q
   ```

3. **Примените схему базы данных**:
   ```bash
   sudo -u postgres psql -d funeral_defender -f database/schema.sql
   ```

4. **Установите зависимости**:
   ```bash
   npm install
   ```

5. **Настройте `.env` файл** (см. выше)

6. **Запустите сервер**:
   ```bash
   npm start
   ```

## 📊 Мониторинг и управление

### Проверка статуса IP
```bash
curl http://localhost:3000/admin/ip/192.168.1.1
```

### Разблокировка IP
```bash
curl -X POST http://localhost:3000/admin/unban/192.168.1.1
```

### Проверка здоровья системы
```bash
curl http://localhost:3000/health
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DB_HOST` | Хост PostgreSQL | `localhost` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_NAME` | Имя базы данных | `funeral_defender` |
| `DB_USER` | Пользователь БД | `postgres` |
| `DB_PASSWORD` | Пароль БД | - |
| `PORT` | Порт приложения | `3000` |
| `TARGET_URL` | Целевой сайт | `https://pohorony-minsk.by` |
| `BAN_DURATION_HOURS` | Время до блокировки (часы) | `4` |
| `REDIRECT_DELAY_MS` | Задержка редиректа (мс) | `1000` |
| `ALLOW_SEARCH_BOTS` | Разрешить поисковым ботам доступ | `true` |

### Nginx конфигурация (для продакшена)

Для продакшена рекомендуется использовать Nginx как обратный прокси:

```bash
# Запуск с Nginx
docker-compose --profile production up -d
```

## 📈 Логи и мониторинг

### Просмотр логов
```bash
# Логи приложения
docker-compose logs -f app

# Логи базы данных
docker-compose logs -f postgres
```

### Мониторинг базы данных
```sql
-- Статистика по IP адресам
SELECT 
    ip_address,
    visit_count,
    first_visit,
    is_banned,
    banned_at
FROM ip_tracking 
ORDER BY visit_count DESC;

-- Количество заблокированных IP
SELECT COUNT(*) as banned_count 
FROM ip_tracking 
WHERE is_banned = true;

-- Редиректы логируются только в консоль, не в БД
-- Для просмотра редиректов смотрите логи: docker-compose logs -f
```

## 🔒 Безопасность

- Все запросы проходят через Helmet.js для базовой защиты
- Rate limiting для предотвращения DDoS атак
- Безопасная конфигурация Nginx
- Логирование всех подозрительных активностей
- Автоматическое обновление меток времени в БД

## 🚨 Важные замечания

1. **Тестирование**: Протестируйте систему на тестовом окружении перед продакшеном
2. **Мониторинг**: Регулярно проверяйте логи на предмет ложных срабатываний
3. **Бэкапы**: Регулярно делайте бэкапы базы данных
4. **SSL**: Для продакшена обязательно используйте HTTPS

## 🛠️ Разработка

### Запуск в режиме разработки
```bash
npm run dev
```

### Структура проекта
```
funeral-defender/
├── config/
│   └── database.js          # Конфигурация БД
├── database/
│   └── schema.sql           # Схема БД
├── nginx/
│   └── nginx.conf           # Конфигурация Nginx
├── services/
│   └── ipTracker.js         # Логика отслеживания IP
├── server.js                # Основной сервер
├── docker-compose.yml       # Docker конфигурация
└── Dockerfile              # Docker образ
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `curl http://localhost:3000/health`
3. Проверьте подключение к БД: `docker-compose exec postgres psql -U postgres -d funeral_defender`

## 🤖 Защита поисковых ботов

**Важно**: Система автоматически защищает от блокировки поисковых ботов:
- ✅ Google, Яндекс, Bing могут индексировать сайт
- ✅ Социальные сети могут делать превью ссылок  
- ✅ Индексация Google НЕ ПОСТРАДАЕТ

Подробнее: [SEARCH_BOTS_PROTECTION.md](SEARCH_BOTS_PROTECTION.md)

## ⚖️ Лицензия

MIT License - используйте свободно для защиты ваших сайтов от ботов.
