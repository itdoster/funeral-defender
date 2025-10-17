# 🤖 Защита поисковых ботов

## ⚠️ Важно: Индексация Google не пострадает!

Система автоматически распознает и **НЕ БЛОКИРУЕТ** поисковых ботов:

## 🔍 Поддерживаемые поисковые боты:

### **Основные поисковики:**
- **Googlebot** (Google) - `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)`
- **Bingbot** (Microsoft Bing) - `Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)`
- **Yandexbot** (Яндекс) - `Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)`

### **Социальные сети:**
- **Facebook** - `facebookexternalhit/1.1`
- **Twitter** - `Twitterbot/1.0`
- **LinkedIn** - `LinkedInBot/1.0`

### **Мессенджеры:**
- **WhatsApp** - `WhatsApp/2.19.81`
- **Telegram** - `TelegramBot`

### **Другие:**
- **Applebot** (Siri, Spotlight)
- **DuckDuckBot** (DuckDuckGo)
- **Baiduspider** (Baidu)
- **Slurp** (Yahoo)

## 🛡️ Двойная защита:

### **1. Проверка User-Agent**
Система анализирует заголовок `User-Agent` и пропускает известных поисковых ботов.

### **2. Проверка IP адресов**
Дополнительная проверка IP адресов Googlebot:
- `66.249.x.x` - основной диапазон Google
- `64.233.x.x` - дополнительный диапазон Google

## ⚙️ Настройка:

### **Включить защиту поисковых ботов (по умолчанию):**
```env
ALLOW_SEARCH_BOTS=true
```

### **Отключить защиту (блокировать всех):**
```env
ALLOW_SEARCH_BOTS=false
```

## 📊 Логирование:

### **Поисковые боты в логах:**
```
🤖 Search bot detected: Mozilla/5.0 (compatible; Googlebot/2.1...), IP: 66.249.79.123 - allowing access
🤖 Googlebot IP detected: 66.249.79.123 - allowing access
```

### **Обычные пользователи:**
```
📝 New IP tracked: 192.168.1.100
📊 IP 192.168.1.100: visits=1, hours=0.00, banned=false
```

## 🔧 Проверка работы:

### **Тест с Googlebot User-Agent:**
```bash
curl -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
     http://pohorony-minsk.by/
```

### **Тест с обычным браузером:**
```bash
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
     http://pohorony-minsk.by/
```

## 📈 Мониторинг:

### **Проверка статистики ботов:**
```sql
-- Поисковые боты не записываются в базу, только в логи
-- Для анализа используйте логи: docker-compose logs | grep "🤖"
```

### **Проверка индексации:**
1. **Google Search Console** - проверьте статус индексации
2. **site:pohorony-minsk.by** - поиск в Google
3. **Логи сервера** - убедитесь, что Googlebot проходит

## 🚨 Важные замечания:

### **✅ Что защищено:**
- Google, Яндекс, Bing могут индексировать сайт
- Социальные сети могут делать превью ссылок
- Мессенджеры могут показывать превью

### **❌ Что НЕ защищено:**
- Поддельные боты с фальшивыми User-Agent
- Боты, имитирующие поисковики
- Скрипты для скликивания рекламы

### **🔒 Дополнительная защита:**
- Можно добавить DNS lookup для проверки подлинности Googlebot
- Можно настроить whitelist IP адресов
- Можно добавить более строгую проверку User-Agent

## 🛠️ Расширенная настройка:

### **Добавление новых ботов:**
Отредактируйте `services/ipTracker.js`:
```javascript
this.searchBots = [
    'googlebot',
    'bingbot',
    'your-custom-bot',  // Добавьте сюда
    // ...
];
```

### **Строгая проверка Googlebot:**
Для продакшена можно добавить DNS lookup:
```javascript
async verifyGooglebot(ip, userAgent) {
    if (!userAgent.includes('Googlebot')) return false;
    
    // DNS lookup для проверки подлинности
    const dns = require('dns').promises;
    try {
        const result = await dns.reverse(ip);
        return result[0].includes('googlebot.com');
    } catch (error) {
        return false;
    }
}
```

## ✅ Результат:

**Ваш сайт будет:**
- ✅ Индексироваться Google, Яндекс, Bing
- ✅ Показывать превью в социальных сетях
- ✅ Защищен от ботов скликивания рекламы
- ✅ Работать для всех обычных пользователей

**Индексация Google НЕ ПОСТРАДАЕТ!**

