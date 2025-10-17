#!/usr/bin/env node

// Тест подключения к IP адресу Тильды
const http = require('http');

const TILDA_IP = '45.155.60.8';
const PORT = 80;

console.log(`🔍 Тестируем подключение к ${TILDA_IP}...`);

const options = {
    hostname: TILDA_IP,
    port: PORT,
    path: '/',
    method: 'GET',
    timeout: 10000,
    headers: {
        'User-Agent': 'Funeral-Defender-Test/1.0',
        'Host': 'pohorony-minsk.tilda.ws' // Важно указать правильный Host
    }
};

const req = http.request(options, (res) => {
    console.log(`✅ Подключение успешно!`);
    console.log(`📊 Статус: ${res.statusCode}`);
    console.log(`📋 Заголовки:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`📄 Размер ответа: ${data.length} байт`);
        console.log(`🏠 Содержит ли "pohorony"?: ${data.toLowerCase().includes('pohorony')}`);
        console.log(`🌐 Содержит ли "tilda"?: ${data.toLowerCase().includes('tilda')}`);
        
        if (res.statusCode === 200) {
            console.log(`🎉 Отлично! IP ${TILDA_IP} доступен и работает корректно.`);
        } else {
            console.log(`⚠️  Статус ${res.statusCode} - возможно нужна дополнительная настройка.`);
        }
    });
});

req.on('error', (err) => {
    console.log(`❌ Ошибка подключения: ${err.message}`);
    console.log(`💡 Возможные причины:`);
    console.log(`   - IP адрес недоступен`);
    console.log(`   - Требуется HTTPS вместо HTTP`);
    console.log(`   - Блокировка по IP`);
});

req.on('timeout', () => {
    console.log(`⏰ Таймаут подключения (10 секунд)`);
    req.destroy();
});

req.end();

console.log(`⏳ Ожидаем ответа от ${TILDA_IP}...`);

