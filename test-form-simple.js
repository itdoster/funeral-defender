#!/usr/bin/env node

const axios = require('axios');

async function testFormSubmission() {
    try {
        console.log('🧪 Testing form submission to proxy...');
        
        // Тестируем отправку формы на главную страницу (как делает Тильда)
        const formData = new URLSearchParams({
            name: 'Test User',
            email: 'test@example.com',
            phone: '+375291234567',
            message: 'Test message from proxy'
        });
        
        const response = await axios.post('http://localhost:3000/', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (compatible; Test-Client/1.0)',
                'Referer': 'https://pohorony-minsk.by/',
                'Origin': 'https://pohorony-minsk.by'
            },
            timeout: 10000,
            maxRedirects: 0, // Не следовать редиректам автоматически
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Принимаем 2xx и 3xx
            }
        });
        
        console.log('✅ Form submission successful!');
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Response length:', response.data.length);
        
    } catch (error) {
        console.error('❌ Form submission failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testFormSubmission();
