const pool = require('../config/database');

class IPTracker {
    constructor() {
        this.banDurationHours = parseInt(process.env.BAN_DURATION_HOURS) || 4;
        this.allowSearchBots = process.env.ALLOW_SEARCH_BOTS !== 'false';
        
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

    // Проверка, является ли User-Agent поисковым ботом
    isSearchBot(userAgent) {
        if (!userAgent) return false;
        const ua = userAgent.toLowerCase();
        return this.searchBots.some(bot => ua.includes(bot));
    }

    // Проверка IP адресов Googlebot (дополнительная защита)
    async isGooglebotIP(ip) {
        try {
            // Localhost IPs - не блокируем
            if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
                return true;
            }
            
            // Простая проверка - Googlebot IP обычно в диапазонах 66.249.x.x
            // В продакшене можно добавить более точную проверку через DNS lookup
            const ipParts = ip.split('.');
            if (ipParts[0] === '66' && ipParts[1] === '249') {
                return true;
            }
            
            // Другие известные диапазоны Google
            if (ipParts[0] === '64' && ipParts[1] === '233') {
                return true;
            }
            
            // Google IP диапазон 72.14.*
            if (ipParts[0] === '72' && ipParts[1] === '14') {
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
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

            // Дополнительная проверка для Googlebot по IP (если разрешено и User-Agent подделан)
            if (this.allowSearchBots && await this.isGooglebotIP(ip)) {
                console.log(`🤖 Googlebot IP detected: ${ip} - allowing access`);
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
