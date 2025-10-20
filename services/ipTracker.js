const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

class IPTracker {
    constructor() {
        this.banDurationHours = parseInt(process.env.BAN_DURATION_HOURS) || 4;
        this.allowSearchBots = process.env.ALLOW_SEARCH_BOTS !== 'false';
        
        // Загружаем конфигурацию белого списка
        this.whitelistConfig = this.loadWhitelistConfig();
        
        // Список User-Agent поисковых ботов, которые не должны блокироваться
        this.searchBots = [
            'googlebot',
            'bingbot',
            'yandexbot',
            'baiduspider',
            'facebookexternalhit',
            'twitterbot',
            'linkedinbot',
            'whatsapp',
            'telegrambot',
            'applebot',
            'duckduckbot',
            'slurp',
            'ia_archiver'
        ];
    }

    // Загрузка конфигурации белого списка
    loadWhitelistConfig() {
        try {
            const configPath = path.join(__dirname, '../config/whitelist.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('Error loading whitelist config:', error);
            return {
                ipRanges: [],
                googleRanges: [],
                microsoftRanges: [],
                customIPs: [],
                awsRanges: []
            };
        }
    }

    // Проверка IP по белого списку
    isIPWhitelisted(ip) {
        try {
            // Обработка IPv6-mapped IPv4 адресов (формат ::ffff:x.x.x.x)
            if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
                const mapped = ip.substring('::ffff:'.length);
                // Явно разрешаем все адреса из диапазона ::ffff:172.*
                if (mapped.startsWith('172.')) {
                    return true;
                }
                // Продолжаем проверки уже с нормализованным IPv4
                ip = mapped;
            }

            // Localhost IPs
            if (this.whitelistConfig.ipRanges.includes(ip)) {
                return true;
            }

            // Точные IP адреса
            if (this.whitelistConfig.customIPs.includes(ip)) {
                return true;
            }

            // Проверка диапазонов
            const ipParts = ip.split('.');
            if (ipParts.length !== 4) return false;

            // Google диапазоны
            for (const range of this.whitelistConfig.googleRanges) {
                if (this.checkIPRange(ipParts, range)) {
                    return true;
                }
            }

            // Microsoft диапазоны
            for (const range of this.whitelistConfig.microsoftRanges) {
                if (this.checkIPRange(ipParts, range)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking IP whitelist:', error);
            return false;
        }
    }

    // Проверка IP диапазона
    checkIPRange(ipParts, range) {
        const rangeParts = range.split('.');
        if (rangeParts.length !== 4) return false;

        for (let i = 0; i < 4; i++) {
            if (rangeParts[i] === '*') continue;
            if (ipParts[i] !== rangeParts[i]) return false;
        }
        return true;
    }

    // Проверка, является ли User-Agent поисковым ботом
    isSearchBot(userAgent) {
        if (!userAgent) return false;
        const ua = userAgent.toLowerCase();
        return this.searchBots.some(bot => ua.includes(bot));
    }

    // Проверка IP адресов по белого списку (заменяет старый isGooglebotIP)
    async isIPWhitelistedAsync(ip) {
        return this.isIPWhitelisted(ip);
    }

    async trackIP(ip, userAgent) {
        try {
            // Поисковые боты не отслеживаются и не блокируются (если разрешено)
            if (this.allowSearchBots && this.isSearchBot(userAgent)) {
                console.log(`🤖 Search bot detected: ${userAgent.substring(0, 50)}..., IP: ${ip} - allowing access`);
                return {
                    isBanned: false,
                    visitCount: 0,
                    firstVisit: new Date(),
                    hoursSinceFirstVisit: 0,
                    isSearchBot: true
                };
            }

            // Дополнительная проверка по белому списку IP (если разрешено и User-Agent подделан)
            if (this.allowSearchBots && await this.isIPWhitelistedAsync(ip)) {
                console.log(`✅ Whitelisted IP detected: ${ip} - allowing access`);
                return {
                    isBanned: false,
                    visitCount: 0,
                    firstVisit: new Date(),
                    hoursSinceFirstVisit: 0,
                    isSearchBot: true
                };
            }

            // Check if IP already exists
            const existingIP = await pool.query(
                'SELECT * FROM ip_tracking WHERE ip_address = $1',
                [ip]
            );

            if (existingIP.rows.length > 0) {
                const record = existingIP.rows[0];
                const now = new Date();
                const firstVisit = new Date(record.first_visit);
                const hoursSinceFirstVisit = (now - firstVisit) / (1000 * 60 * 60);

                // Check if 4 hours have passed since first visit
                if (hoursSinceFirstVisit >= this.banDurationHours && !record.is_banned) {
                    // Ban the IP
                    await pool.query(
                        'UPDATE ip_tracking SET is_banned = true, banned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ip_address = $1',
                        [ip]
                    );
                    console.log(`🚫 IP ${ip} has been banned after ${hoursSinceFirstVisit.toFixed(2)} hours`);
                }

                // Update visit count and last visit
                await pool.query(
                    'UPDATE ip_tracking SET visit_count = visit_count + 1, last_visit = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ip_address = $1',
                    [ip]
                );

                return {
                    isBanned: record.is_banned || hoursSinceFirstVisit >= this.banDurationHours,
                    visitCount: record.visit_count + 1,
                    firstVisit: record.first_visit,
                    hoursSinceFirstVisit: hoursSinceFirstVisit
                };
            } else {
                // Insert new IP
                const result = await pool.query(
                    'INSERT INTO ip_tracking (ip_address, user_agent) VALUES ($1, $2) RETURNING *',
                    [ip, userAgent]
                );
                console.log(`📝 New IP tracked: ${ip}`);
                
                return {
                    isBanned: false,
                    visitCount: 1,
                    firstVisit: result.rows[0].first_visit,
                    hoursSinceFirstVisit: 0
                };
            }
        } catch (error) {
            console.error('Error tracking IP:', error);
            return {
                isBanned: false,
                visitCount: 1,
                firstVisit: new Date(),
                hoursSinceFirstVisit: 0
            };
        }
    }

    async logRedirect(ip, userAgent) {
        // Логируем редиректы только в консоль, не в БД
        console.log(`🔄 Redirect for banned IP: ${ip}, User-Agent: ${userAgent.substring(0, 100)}...`);
    }

    async isIPBanned(ip) {
        try {
            const result = await pool.query(
                'SELECT is_banned, banned_at FROM ip_tracking WHERE ip_address = $1',
                [ip]
            );

            if (result.rows.length > 0) {
                return result.rows[0].is_banned;
            }
            return false;
        } catch (error) {
            console.error('Error checking IP ban status:', error);
            return false;
        }
    }

    async getIPStats(ip) {
        try {
            const result = await pool.query(
                'SELECT * FROM ip_tracking WHERE ip_address = $1',
                [ip]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return null;
        } catch (error) {
            console.error('Error getting IP stats:', error);
            return null;
        }
    }

    async getRedirectCount(ip) {
        // Просто возвращаем случайное число для генерации уникальных URL редиректов
        // Не храним в БД, так как это не нужно
        return Math.floor(Math.random() * 10000) + 1;
    }
}

module.exports = new IPTracker();
