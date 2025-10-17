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

// Security middleware
app.use(helmet());
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
        
        // If IP is banned, start infinite redirect loop
        if (ipData.isBanned) {
            console.log(`🚫 Banned IP detected: ${clientIP}, redirecting to infinite loop`);
            
            // Log the redirect to console only
            ipTracker.logRedirect(clientIP, userAgent);
            
            // Get redirect count for this IP (random number for unique URLs)
            const redirectCount = await ipTracker.getRedirectCount(clientIP);
            
            // Create a redirect URL that will trigger another redirect
            const redirectUrl = `/redirect-${redirectCount}`;
            
            // Set a delay before redirect
            setTimeout(() => {
                res.redirect(302, redirectUrl);
            }, parseInt(process.env.REDIRECT_DELAY_MS) || 1000);
            
            return;
        }
        
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
    onProxyReq: (proxyReq, req, res) => {
        // Forward original IP
        proxyReq.setHeader('X-Forwarded-For', req.clientIP || getRealIP(req));
        proxyReq.setHeader('X-Real-IP', req.clientIP || getRealIP(req));
        
        console.log(`✅ Proxying request for IP: ${req.clientIP || getRealIP(req)}`);
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
    console.log(`📊 Admin endpoint: http://localhost:${PORT}/admin/ip/[IP_ADDRESS]`);
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
