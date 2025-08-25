// Coffee Shop POS Server - n8n Integration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

class CoffeePOSServer {
    constructor() {
        console.log('[DEBUG] CoffeePOSServer constructor - Starting server initialization');
        console.log('[DEBUG] Environment variables:', {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            RAILWAY_PORT: process.env.RAILWAY_PORT,
            SHOP_NAME: process.env.SHOP_NAME
        });
        
        this.app = express();
        this.port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
        console.log('[DEBUG] Server port determined:', this.port);
        
        // n8n webhook URLs - Individual Endpoints
        this.n8nWebhooks = {
            getProducts: process.env.N8N_GET_PRODUCTS_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/get-products',
            getSettings: process.env.N8N_GET_SETTINGS_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/get-settings',
            processOrder: process.env.N8N_PROCESS_ORDER_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/process-order',
            updateStock: process.env.N8N_UPDATE_STOCK_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/update-stock',
            analytics: process.env.N8N_ANALYTICS_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/analytics',
            lowStock: process.env.N8N_LOW_STOCK_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/low-stock',
            dashboardStats: process.env.N8N_DASHBOARD_STATS_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/dashboard-stats',
            ingredientUsage: process.env.N8N_INGREDIENT_USAGE_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/ingredient-usage',
            generatePurchaseOrder: process.env.N8N_PURCHASE_ORDER_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/generate-purchase-order'
        };
        console.log('[DEBUG] n8n webhook URLs configured:', Object.keys(this.n8nWebhooks));
        
        // Configuration
        this.config = {
            shopName: process.env.SHOP_NAME || 'Coffee Paradise',
            currency: process.env.CURRENCY || 'PHP',
            taxRate: parseFloat(process.env.TAX_RATE) || 0.12,
            jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
            environment: process.env.NODE_ENV || 'development'
        };
        console.log('[DEBUG] Server configuration:', {
            shopName: this.config.shopName,
            currency: this.config.currency,
            taxRate: this.config.taxRate,
            environment: this.config.environment,
            jwtSecretLength: this.config.jwtSecret.length
        });
        
        console.log('[DEBUG] Initializing middleware...');
        this.initializeMiddleware();
        console.log('[DEBUG] Initializing routes...');
        this.initializeRoutes();
        console.log('[DEBUG] CoffeePOSServer constructor - Initialization complete');
    }

    initializeMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://primary-production-3ef2.up.railway.app"]
                }
            }
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: this.config.environment === 'production' 
                ? ['https://your-domain.com'] 
                : ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        
        // Compression
        this.app.use(compression());
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use(this.requestLogger.bind(this));
        
        // Static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.static(__dirname, {
            index: 'index.html'
        }));
    }

    requestLogger(req, res, next) {
        const start = Date.now();
        const timestamp = new Date().toISOString();
        
        console.log(`[DEBUG] ${timestamp} - Incoming ${req.method} ${req.url}`);
        console.log(`[DEBUG] Request headers:`, {
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type'),
            authorization: req.get('Authorization') ? '[PRESENT]' : '[NONE]',
            origin: req.get('Origin')
        });
        
        if (req.body && Object.keys(req.body).length > 0) {
            if (req.body.password) {
                console.log('[DEBUG] Request body (password hidden):', { ...req.body, password: '[HIDDEN]' });
            } else {
                console.log('[DEBUG] Request body:', req.body);
            }
        }
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logLevel = res.statusCode >= 400 ? '[ERROR]' : '[DEBUG]';
            console.log(`${logLevel} ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
            
            if (res.statusCode >= 400) {
                console.log(`[ERROR] Error response details:`, {
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    contentType: res.get('Content-Type')
                });
            }
        });
        
        next();
    }

    initializeRoutes() {
        // Health check - both paths for compatibility
        this.app.get('/health', this.handleHealthCheck.bind(this));
        this.app.get('/api/health', this.handleHealthCheck.bind(this));
        
        // Authentication routes
        this.app.post('/api/auth/login', this.handleLogin.bind(this));
        this.app.post('/api/auth/logout', this.authenticateToken.bind(this), this.handleLogout.bind(this));
        
        // POS Data routes - Individual n8n Webhooks
        this.app.get('/api/get-settings', this.handleGetSettings.bind(this));
        this.app.get('/api/get-products', this.handleGetProducts.bind(this));
        this.app.post('/api/process-order', this.authenticateToken.bind(this), this.handleProcessOrder.bind(this));
        this.app.post('/api/update-inventory', this.authenticateToken.bind(this), this.handleUpdateInventory.bind(this));
        
        // Dashboard routes
        this.app.get('/api/dashboard-stats', this.authenticateToken.bind(this), this.handleDashboardStats.bind(this));
        this.app.get('/api/low-stock', this.authenticateToken.bind(this), this.handleLowStock.bind(this));
        this.app.get('/api/analytics', this.authenticateToken.bind(this), this.handleAnalytics.bind(this));
        
        // Error handling
        this.app.use(this.errorHandler.bind(this));
        
        // Catch-all route
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    // Authentication middleware (simplified)
    authenticateToken(req, res, next) {
        console.log('[DEBUG] authenticateToken - Function start');
        console.log('[DEBUG] authenticateToken - Request URL:', req.url);
        
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        console.log('[DEBUG] authenticateToken - Auth header present:', !!authHeader);
        console.log('[DEBUG] authenticateToken - Token extracted:', !!token);
        
        if (!token) {
            console.warn('[DEBUG] authenticateToken - No token provided');
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        try {
            console.log('[DEBUG] authenticateToken - Verifying token');
            const decoded = this.verifyToken(token);
            req.user = decoded;
            
            console.log('[DEBUG] authenticateToken - Token valid, user authenticated:', {
                userId: decoded.id,
                username: decoded.username,
                role: decoded.role
            });
            
            next();
        } catch (error) {
            console.error('[DEBUG] authenticateToken - Token verification failed:', error.message);
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    }

    generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        
        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', this.config.jwtSecret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64url');
        
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    verifyToken(token) {
        console.log('[DEBUG] verifyToken - Function start');
        console.log('[DEBUG] verifyToken - Token length:', token.length);
        
        const parts = token.split('.');
        console.log('[DEBUG] verifyToken - Token parts count:', parts.length);
        
        if (parts.length !== 3) {
            console.error('[DEBUG] verifyToken - Invalid token format, expected 3 parts');
            throw new Error('Invalid token format');
        }
        
        const [header, payload, signature] = parts;
        console.log('[DEBUG] verifyToken - Token parts lengths:', {
            header: header.length,
            payload: payload.length,
            signature: signature.length
        });
        
        const expectedSignature = crypto
            .createHmac('sha256', this.config.jwtSecret)
            .update(`${header}.${payload}`)
            .digest('base64url');
        
        console.log('[DEBUG] verifyToken - Signature verification:', {
            provided: signature.substring(0, 10) + '...',
            expected: expectedSignature.substring(0, 10) + '...'
        });
        
        if (signature !== expectedSignature) {
            console.error('[DEBUG] verifyToken - Signature mismatch');
            throw new Error('Invalid token signature');
        }
        
        console.log('[DEBUG] verifyToken - Decoding payload');
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
        
        const currentTime = Math.floor(Date.now() / 1000);
        console.log('[DEBUG] verifyToken - Token expiry check:', {
            tokenExp: decoded.exp,
            currentTime: currentTime,
            isExpired: decoded.exp < currentTime
        });
        
        if (decoded.exp < currentTime) {
            console.error('[DEBUG] verifyToken - Token expired');
            throw new Error('Token expired');
        }
        
        console.log('[DEBUG] verifyToken - Token valid for user:', decoded.username);
        return decoded;
    }

    // Route handlers - Updated for Consolidated n8n Webhooks
    handleHealthCheck(req, res) {
        console.log('[DEBUG] handleHealthCheck - Function start');
        
        const healthData = {
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: this.config.environment,
            version: '1.0.0',
            port: this.port,
            ready: true
        };
        
        console.log('[DEBUG] handleHealthCheck - Health check data:', {
            status: healthData.status,
            uptime: Math.floor(healthData.uptime),
            environment: healthData.environment,
            port: healthData.port
        });
        
        res.status(200).json(healthData);
        
        console.log('[DEBUG] handleHealthCheck - Health check completed');
    }

    async handleLogin(req, res) {
        console.log('[DEBUG] handleLogin - Function start');
        const startTime = Date.now();
        
        try {
            const { username, password } = req.body;
            console.log('[DEBUG] handleLogin - Login attempt for username:', username);
            
            if (!username || !password) {
                console.warn('[DEBUG] handleLogin - Missing credentials');
                return res.status(400).json({
                    success: false,
                    message: 'Username and password required'
                });
            }
            
            // Demo users
            const demoUsers = [
                { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
                { id: 2, username: 'staff', password: 'staff123', role: 'staff', name: 'Staff Member' },
                { id: 3, username: 'manager', password: 'manager123', role: 'manager', name: 'Store Manager' }
            ];
            console.log('[DEBUG] handleLogin - Available users:', demoUsers.map(u => u.username));
            
            const user = demoUsers.find(u => u.username === username && u.password === password);
            
            if (!user) {
                console.warn('[DEBUG] handleLogin - Invalid credentials for username:', username);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            console.log('[DEBUG] handleLogin - User authenticated:', {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            });
            
            console.log('[DEBUG] handleLogin - Generating JWT token');
            const token = this.generateToken(user);
            const { password: _, ...userWithoutPassword } = user;
            
            const response = {
                success: true,
                token,
                user: userWithoutPassword,
                message: 'Login successful'
            };
            
            console.log('[DEBUG] handleLogin - Login successful for user:', username);
            const endTime = Date.now();
            console.log(`[DEBUG] handleLogin - Authentication completed in ${endTime - startTime}ms`);
            
            res.json(response);
            
        } catch (error) {
            const endTime = Date.now();
            console.error(`[DEBUG] handleLogin - Login error after ${endTime - startTime}ms:`, error);
            console.error('[DEBUG] handleLogin - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    handleLogout(req, res) {
        console.log('[DEBUG] handleLogout - Function start');
        console.log('[DEBUG] handleLogout - User logging out:', {
            userId: req.user?.id,
            username: req.user?.username,
            role: req.user?.role
        });
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
        console.log('[DEBUG] handleLogout - Logout successful');
    }

    async handleGetSettings(req, res) {
        console.log('[DEBUG] handleGetSettings - Function start');
        const startTime = Date.now();
        
        try {
            console.log('[DEBUG] handleGetSettings - Calling n8n settings webhook:', this.n8nWebhooks.getSettings);
            const response = await this.callN8NWebhook(this.n8nWebhooks.getSettings, 'GET');
            const endTime = Date.now();
            
            console.log(`[DEBUG] handleGetSettings - Webhook response received in ${endTime - startTime}ms:`, {
                success: response?.success,
                hasSettings: !!response?.settings
            });
            
            if (response && response.success) {
                console.log('[DEBUG] handleGetSettings - Returning webhook settings');
                return res.json(response);
            }
            
            console.log('[DEBUG] handleGetSettings - Webhook unsuccessful, using default settings');
            const defaultSettings = this.getDefaultSettings();
            res.json({
                success: true,
                settings: defaultSettings
            });
            
        } catch (webhookError) {
            const endTime = Date.now();
            console.log(`[DEBUG] handleGetSettings - Webhook error after ${endTime - startTime}ms:`, webhookError.message);
            console.log('[DEBUG] handleGetSettings - Using default settings fallback');
            
            const defaultSettings = this.getDefaultSettings();
            console.log('[DEBUG] handleGetSettings - Default settings:', Object.keys(defaultSettings));
            
            res.json({
                success: true,
                settings: defaultSettings
            });
        }
    }

    async handleGetProducts(req, res) {
        console.log('[DEBUG] handleGetProducts - Function start');
        const startTime = Date.now();
        
        try {
            console.log('[DEBUG] handleGetProducts - Calling n8n products webhook:', this.n8nWebhooks.getProducts);
            const response = await this.callN8NWebhook(this.n8nWebhooks.getProducts, 'GET');
            const endTime = Date.now();
            
            console.log(`[DEBUG] handleGetProducts - Webhook response received in ${endTime - startTime}ms:`, {
                success: response?.success,
                hasProducts: !!response?.products,
                productCount: response?.products?.length || 0
            });
            
            if (response && response.success) {
                console.log('[DEBUG] handleGetProducts - Returning webhook products:', response.products.length, 'products');
                return res.json(response);
            }
            
            console.log('[DEBUG] handleGetProducts - Webhook unsuccessful, using demo products');
            const demoProducts = this.getDemoProducts();
            const response_data = {
                success: true,
                products: demoProducts,
                lastUpdate: new Date().toISOString(),
                totalProducts: demoProducts.length,
                activeProducts: demoProducts.length
            };
            console.log('[DEBUG] handleGetProducts - Demo products response:', {
                productCount: demoProducts.length,
                firstProduct: demoProducts[0]?.name
            });
            res.json(response_data);
            
        } catch (webhookError) {
            const endTime = Date.now();
            console.log(`[DEBUG] handleGetProducts - Webhook error after ${endTime - startTime}ms:`, webhookError.message);
            console.log('[DEBUG] handleGetProducts - Error details:', {
                name: webhookError.name,
                message: webhookError.message
            });
            
            const demoProducts = this.getDemoProducts();
            console.log('[DEBUG] handleGetProducts - Using demo products fallback:', demoProducts.length, 'products');
            
            res.json({
                success: true,
                products: demoProducts,
                lastUpdate: new Date().toISOString(),
                totalProducts: demoProducts.length,
                activeProducts: demoProducts.length
            });
        }
    }

    // Extract default settings into a reusable method
    getDefaultSettings() {
        return {
            shopName: this.config.shopName,
            shopTagline: 'Fresh Coffee Daily',
            logoEmoji: '☕',
            currency: this.config.currency,
            taxRate: this.config.taxRate,
            lowStockThreshold: 10,
            enableIngredientTracking: true,
            address: '123 Coffee Street, Manila',
            phone: '+63 917 123 4567',
            email: 'info@coffeeparadise.ph'
        };
    }

    async handleProcessOrder(req, res) {
        console.log('[DEBUG] handleProcessOrder - Function start');
        const startTime = Date.now();
        
        try {
            const orderData = {
                ...req.body,
                cashier: req.user.username,
                cashierId: req.user.id,
                timestamp: new Date().toISOString()
            };
            
            console.log('[DEBUG] handleProcessOrder - Order data prepared:', {
                itemCount: orderData.items?.length || 0,
                total: orderData.total,
                paymentMethod: orderData.paymentMethod,
                cashier: orderData.cashier,
                cashierId: orderData.cashierId
            });
            
            console.log('[DEBUG] handleProcessOrder - Items in order:', 
                orderData.items?.map(item => ({ name: item.name, quantity: item.quantity })) || []
            );
            
            // Try to call n8n webhook to process order
            try {
                console.log('[DEBUG] handleProcessOrder - Calling n8n process order webhook');
                const response = await this.callN8NWebhook(this.n8nWebhooks.processOrder, 'POST', orderData);
                const webhookTime = Date.now();
                
                console.log(`[DEBUG] handleProcessOrder - Webhook response received in ${webhookTime - startTime}ms:`, {
                    success: response?.success,
                    orderId: response?.orderId,
                    hasLowStockAlert: !!response?.lowStockAlert
                });
                
                if (response && response.success) {
                    const responseData = {
                        success: true,
                        orderId: response.orderId,
                        total: response.total || orderData.total,
                        message: response.message || 'Order processed successfully',
                        lowStockAlert: response.lowStockAlert || false,
                        lowStockCount: response.lowStockCount || 0,
                        emailSent: response.emailSent || false
                    };
                    console.log('[DEBUG] handleProcessOrder - Order processed via webhook:', responseData.orderId);
                    return res.json(responseData);
                }
            } catch (webhookError) {
                console.log('[DEBUG] handleProcessOrder - Webhook error:', webhookError.message);
                console.log('[DEBUG] handleProcessOrder - Processing order locally as fallback');
            }
            
            // Fallback: Process order locally without n8n
            const orderId = 'ORD-' + Date.now();
            console.log('[DEBUG] handleProcessOrder - Generated local order ID:', orderId);
            
            const localResponse = {
                success: true,
                orderId: orderId,
                total: orderData.total,
                message: 'Order processed successfully (demo mode)',
                lowStockAlert: false,
                lowStockCount: 0,
                emailSent: false
            };
            
            const endTime = Date.now();
            console.log(`[DEBUG] handleProcessOrder - Order processed locally in ${endTime - startTime}ms`);
            res.json(localResponse);
            
        } catch (error) {
            const endTime = Date.now();
            console.error(`[DEBUG] handleProcessOrder - Order processing error after ${endTime - startTime}ms:`, error);
            console.error('[DEBUG] handleProcessOrder - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to process order'
            });
        }
    }

    async handleUpdateInventory(req, res) {
        try {
            const { productId, newStock } = req.body;
            
            if (!productId || newStock === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID and new stock level required'
                });
            }
            
            // Call n8n webhook to update stock  
            const response = await this.callN8NWebhook(this.n8nWebhooks.updateStock, 'POST', {
                stockUpdates: [{
                    productId,
                    newStock,
                    updateType: 'manual',
                    reason: 'Admin stock adjustment',
                    updatedBy: req.user.username
                }]
            });
            
            if (response && response.success) {
                return res.json({
                    success: true,
                    message: 'Inventory updated successfully'
                });
            }
            
            throw new Error('n8n webhook returned error');
            
        } catch (error) {
            console.error('Update inventory error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update inventory'
            });
        }
    }

    async handleDashboardStats(req, res) {
        try {
            // Call individual dashboard stats webhook
            const response = await this.callN8NWebhook(this.n8nWebhooks.dashboardStats, 'GET');
            
            if (response && response.success) {
                return res.json(response);
            }
            
            // Fallback to demo stats
            const demoStats = this.getDemoStats();
            res.json(demoStats);
            
        } catch (webhookError) {
            console.log('n8n dashboard webhook not available, using demo stats:', webhookError.message);
            
            const demoStats = this.getDemoStats();
            res.json(demoStats);
        }
    }

    async handleLowStock(req, res) {
        try {
            // Call individual low stock webhook
            const response = await this.callN8NWebhook(this.n8nWebhooks.lowStock, 'GET');
            
            if (response && response.success) {
                return res.json(response);
            }
            
            // Fallback response
            res.json({
                success: true,
                lowStockItems: [],
                summary: { total: 0, critical: 0, warning: 0 }
            });
            
        } catch (webhookError) {
            console.log('n8n low stock webhook not available:', webhookError.message);
            
            res.json({
                success: true,
                lowStockItems: [],
                summary: { total: 0, critical: 0, warning: 0 }
            });
        }
    }

    async handleAnalytics(req, res) {
        try {
            const { period = '7d' } = req.query;
            
            // Call individual analytics webhook
            const response = await this.callN8NWebhook(this.n8nWebhooks.analytics, 'GET', { period });
            
            if (response && response.success) {
                return res.json(response);
            }
            
            // Fallback analytics
            const analytics = this.calculateDemoAnalytics(period);
            res.json({
                success: true,
                analytics,
                period
            });
            
        } catch (webhookError) {
            console.log('n8n analytics webhook not available, using demo analytics:', webhookError.message);
            
            const analytics = this.calculateDemoAnalytics(period);
            res.json({
                success: true,
                analytics,
                period
            });
        }
    }

    async callN8NWebhook(url, method = 'GET', data = null) {
        console.log('[DEBUG] callN8NWebhook - Function start');
        console.log('[DEBUG] callN8NWebhook - Parameters:', {
            url: url,
            method: method,
            hasData: !!data,
            dataType: data ? typeof data : 'none'
        });
        
        const startTime = Date.now();
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
            console.log('[DEBUG] callN8NWebhook - Request body size:', options.body.length, 'characters');
        } else if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            url += `?${params}`;
            console.log('[DEBUG] callN8NWebhook - GET parameters added to URL');
        }
        
        console.log('[DEBUG] callN8NWebhook - Making request to:', url);
        
        try {
            const response = await fetch(url, options);
            const fetchTime = Date.now();
            
            console.log(`[DEBUG] callN8NWebhook - Response received in ${fetchTime - startTime}ms`);
            console.log('[DEBUG] callN8NWebhook - Response status:', response.status, response.statusText);
            console.log('[DEBUG] callN8NWebhook - Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                console.error(`[DEBUG] callN8NWebhook - HTTP error: ${response.status} ${response.statusText}`);
                throw new Error(`n8n webhook call failed: ${response.status}`);
            }
            
            console.log('[DEBUG] callN8NWebhook - Parsing JSON response');
            const jsonData = await response.json();
            const totalTime = Date.now();
            
            console.log(`[DEBUG] callN8NWebhook - JSON parsed successfully, total time: ${totalTime - startTime}ms`);
            console.log('[DEBUG] callN8NWebhook - Response data structure:', {
                type: typeof jsonData,
                keys: Object.keys(jsonData),
                hasSuccess: 'success' in jsonData,
                success: jsonData.success
            });
            
            return jsonData;
        } catch (error) {
            const endTime = Date.now();
            console.error(`[DEBUG] callN8NWebhook - Request failed after ${endTime - startTime}ms:`, error.message);
            console.error('[DEBUG] callN8NWebhook - Error details:', {
                name: error.name,
                message: error.message,
                type: error.constructor.name
            });
            throw error;
        }
    }

    // Demo data methods
    getDemoProducts() {
        return [
            {
                id: 'espresso-single',
                name: 'Single Espresso',
                description: 'Rich, bold shot',
                price: 65,
                category: 'Coffee - Espresso',
                image: '☕',
                stock: 50,
                lowStockThreshold: 10,
                isActive: true,
                cost: 18.50
            },
            {
                id: 'americano',
                name: 'Americano',
                description: 'Espresso with hot water',
                price: 85,
                category: 'Coffee - Espresso',
                image: '☕',
                stock: 45,
                lowStockThreshold: 10,
                isActive: true,
                cost: 22.00
            },
            {
                id: 'latte',
                name: 'Latte',
                description: 'Espresso with steamed milk',
                price: 120,
                category: 'Coffee - Milk Based',
                image: '🥛',
                stock: 30,
                lowStockThreshold: 10,
                isActive: true,
                cost: 35.50
            }
        ];
    }

    getDemoStats() {
        return {
            success: true,
            stats: {
                todaySales: 15750,
                todayOrders: 42,
                avgOrder: 375,
                profitMargin: 68
            },
            chartData: {
                sales: {
                    labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'],
                    data: [1200, 1800, 2400, 3200, 2800, 2200, 2100]
                },
                products: {
                    labels: ['Latte', 'Americano', 'Cappuccino', 'Espresso', 'Mocha'],
                    data: [15, 12, 10, 8, 7]
                }
            },
            alerts: []
        };
    }

    calculateDemoAnalytics(period) {
        return {
            totalRevenue: 35000,
            totalOrders: 95,
            avgOrderValue: 368,
            topProducts: [
                { name: 'Latte', quantity: 25 },
                { name: 'Americano', quantity: 20 },
                { name: 'Cappuccino', quantity: 18 }
            ]
        };
    }

    errorHandler(error, req, res, next) {
        console.error('[DEBUG] errorHandler - Unhandled error occurred');
        console.error('[DEBUG] errorHandler - Error details:', {
            name: error.name,
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        console.error('[DEBUG] errorHandler - Request details:', {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        const isDevelopment = this.config.environment === 'development';
        const statusCode = error.status || 500;
        
        console.error(`[DEBUG] errorHandler - Sending ${statusCode} error response`);
        
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error',
            ...(isDevelopment && { stack: error.stack })
        });
    }

    start() {
        const server = this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`
🚀 Coffee POS Server Started Successfully!

📊 Server Details:
   Port: ${this.port}
   Environment: ${this.config.environment}
   Shop: ${this.config.shopName}

🔗 n8n Webhooks:
   Get Products: ${this.n8nWebhooks.getProducts}
   Get Settings: ${this.n8nWebhooks.getSettings}
   Process Order: ${this.n8nWebhooks.processOrder}
   Update Stock: ${this.n8nWebhooks.updateStock}
   Dashboard Stats: ${this.n8nWebhooks.dashboardStats}
   Analytics: ${this.n8nWebhooks.analytics}
   Low Stock: ${this.n8nWebhooks.lowStock}
   Ingredient Usage: ${this.n8nWebhooks.ingredientUsage}
   Purchase Orders: ${this.n8nWebhooks.generatePurchaseOrder}

🎯 Features Enabled:
   ✅ Authentication System
   ✅ POS Interface
   ✅ Individual n8n Webhooks
   ✅ Google Sheets Backend
   ✅ Real-time Updates
   ✅ Stock Management
   ✅ Analytics & Reporting

Ready to serve coffee! ☕️
            `);
        });

        server.on('error', (err) => {
            console.error('❌ Server failed to start:', err);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('✅ Process terminated');
                process.exit(0);
            });
        });
    }
}

// Start the server
if (require.main === module) {
    try {
        console.log('🚀 Initializing Coffee POS Server...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Port from env:', process.env.PORT);
        console.log('Railway Port from env:', process.env.RAILWAY_PORT);
        
        global.server = new CoffeePOSServer();
        global.server.start();
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

module.exports = CoffeePOSServer;