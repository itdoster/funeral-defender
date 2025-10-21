const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ipTracker = require('./services/ipTracker');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://pohorony-minsk.by';

// Настройка trust proxy для работы с заголовками от nginx
// Указываем конкретные IP адреса прокси-серверов
app.set('trust proxy', ['127.0.0.1', '::1', '172.16.0.0/12', '10.0.0.0/8']);

// Security middleware - все отключено
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    frameguard: false,
    hidePoweredBy: false,
    hsts: false,
    ieNoOpen: false,
    noSniff: false,
    originAgentCluster: false,
    permittedCrossDomainPolicies: false,
    referrerPolicy: false,
    xssFilter: false
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json());

// Get real IP address (considering proxies and load balancers)
function getRealIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip;
}

// Bot detection and protection middleware
app.use(async (req, res, next) => {
    const clientIP = getRealIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🔍 Request from IP: ${clientIP}, User-Agent: ${userAgent.substring(0, 100)}...`);
    
    try {
        // Track the IP
        const ipData = await ipTracker.trackIP(clientIP, userAgent);
        
        // If IP is banned, return 403 Forbidden
        // if (ipData.isBanned) {
        //     console.log(`🚫 Banned IP detected: ${clientIP}, returning 403 Forbidden`);
            
        //     // Log the redirect to console only
        //     ipTracker.logRedirect(clientIP, userAgent);
            
        //     // Return 403 Forbidden instead of redirect loop
        //     return res.status(403).json({
        //         error: 'Ошибка',
        //         message: 'Что-то пошло не так, попробуйте позже',
        //         banned: true,
        //         ip: clientIP,
        //         timestamp: new Date().toISOString()
        //     });
        // }
        
        // Log IP tracking info
        console.log(`📊 IP ${clientIP}: visits=${ipData.visitCount}, hours=${ipData.hoursSinceFirstVisit.toFixed(2)}, banned=${ipData.isBanned}`);
        
        // Add IP info to request for potential use
        req.ipData = ipData;
        req.clientIP = clientIP;
        
        next();
    } catch (error) {
        console.error('Error in bot protection middleware:', error);
        // On error, allow the request to proceed
        next();
    }
});

// Handle redirect loops for banned IPs
app.get('/redirect-*', async (req, res) => {
    const clientIP = getRealIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🔄 Redirect loop for banned IP: ${clientIP}`);
    
    // Log the redirect to console only
    ipTracker.logRedirect(clientIP, userAgent);
    
    // Get redirect count for this IP (random number for unique URLs)
    const redirectCount = await ipTracker.getRedirectCount(clientIP);
    
    // Create another redirect URL
    const nextRedirectUrl = `/redirect-${redirectCount}`;
    
    // Set a delay before redirect
    setTimeout(() => {
        res.redirect(302, nextRedirectUrl);
    }, parseInt(process.env.REDIRECT_DELAY_MS) || 1000);
});

// Admin endpoint to check IP status
app.get('/admin/ip/:ip', async (req, res) => {
    const ip = req.params.ip;
    const stats = await ipTracker.getIPStats(ip);
    
    res.json({
        ip: ip,
        stats: stats,
        note: "Redirect logs are only in console, not stored in database"
    });
});

// Admin endpoint to get banned IPs list
app.get('/admin/banned-ips', async (req, res) => {
    try {
        const bannedIPs = await ipTracker.getBannedIPs();
        const ipList = bannedIPs.map(record => record.ip_address);
        
        res.json({
            success: true,
            count: ipList.length,
            banned_ips: ipList
        });
    } catch (error) {
        console.error('Error getting banned IPs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error getting banned IPs',
            error: error.message 
        });
    }
});

// Admin endpoint to unban IP
app.post('/admin/unban/:ip', async (req, res) => {
    const ip = req.params.ip;
    const pool = require('./config/database');
    
    try {
        await pool.query(
            'UPDATE ip_tracking SET is_banned = false, banned_at = NULL WHERE ip_address = $1',
            [ip]
        );
        
        console.log(`✅ IP ${ip} has been unbanned`);
        res.json({ success: true, message: `IP ${ip} has been unbanned` });
    } catch (error) {
        console.error('Error unbanning IP:', error);
        res.status(500).json({ success: false, message: 'Error unbanning IP' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Proxy middleware for legitimate traffic
const proxyOptions = {
    target: TARGET_URL,
    changeOrigin: true,
    followRedirects: false, // Отключаем автоматические редиректы
    onProxyReq: (proxyReq, req, res) => {
        // Forward original IP
        proxyReq.setHeader('X-Forwarded-For', req.clientIP || getRealIP(req));
        proxyReq.setHeader('X-Real-IP', req.clientIP || getRealIP(req));
        
        // Устанавливаем правильный Host заголовок для Тильды
        // Тильда ожидает свой домен в Host заголовке
        proxyReq.setHeader('Host', 'pohorony-minsk.by');
        
        // Добавляем заголовки для совместимости с Тильдой
        proxyReq.setHeader('User-Agent', req.headers['user-agent'] || 'Mozilla/5.0 (compatible; Funeral-Defender/1.0)');
        proxyReq.setHeader('Accept', req.headers.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
        proxyReq.setHeader('Accept-Language', req.headers['accept-language'] || 'en-US,en;q=0.5');
        proxyReq.setHeader('Accept-Encoding', req.headers['accept-encoding'] || 'gzip, deflate');
        proxyReq.setHeader('Connection', 'keep-alive');
        
        // Передаем оригинальный Referer если есть
        if (req.headers.referer) {
            proxyReq.setHeader('Referer', req.headers.referer);
        }
        
        console.log(`✅ Proxying request for IP: ${req.clientIP || getRealIP(req)}`);
        console.log(`🎯 Target: ${TARGET_URL}, Host: pohorony-minsk.by`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error occurred' });
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`📤 Response sent to IP: ${req.clientIP || getRealIP(req)}, Status: ${proxyRes.statusCode}`);
    }
};

// Apply proxy to all other routes
app.use('/', createProxyMiddleware(proxyOptions));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Funeral Defender Proxy Server running on port ${PORT}`);
    console.log(`🎯 Target URL: ${TARGET_URL}`);
    console.log(`⏰ Ban duration: ${process.env.BAN_DURATION_HOURS || 4} hours`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Admin endpoints:`);
    console.log(`   - Check IP: http://localhost:${PORT}/admin/ip/[IP_ADDRESS]`);
    console.log(`   - Banned IPs: http://localhost:${PORT}/admin/banned-ips`);
    console.log(`   - Unban IP: POST http://localhost:${PORT}/admin/unban/[IP_ADDRESS]`);
    console.log(`\n📋 Environment Configuration:`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || '5432'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'funeral_defender'}`);
    console.log(`   TARGET_URL: ${process.env.TARGET_URL || 'https://pohorony-minsk.by'}`);
    console.log(`   BAN_DURATION_HOURS: ${process.env.BAN_DURATION_HOURS || '4'}`);
    console.log(`   REDIRECT_DELAY_MS: ${process.env.REDIRECT_DELAY_MS || '1000'}`);
    console.log(`   ALLOW_SEARCH_BOTS: ${process.env.ALLOW_SEARCH_BOTS || 'true'}`);
    console.log(`   DOMAIN: ${process.env.DOMAIN || 'not set'}`);
    console.log(`   Trust Proxy: ${app.get('trust proxy')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});
