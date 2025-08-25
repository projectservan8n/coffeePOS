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
        this.app = express();
        this.port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
        
        // n8n webhook URLs - Updated for Simplified Workflow
        this.n8nWebhooks = {
            dataLoad: process.env.N8N_DATALOAD_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/dataload',
            processOrder: process.env.N8N_PROCESS_ORDER_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/process-order',
            updateStock: process.env.N8N_UPDATE_STOCK_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/update-stock',
            analytics: process.env.N8N_ANALYTICS_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/analytics',
            lowStock: process.env.N8N_LOW_STOCK_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/low-stock',
            ingredientUsage: process.env.N8N_INGREDIENT_USAGE_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/ingredient-usage',
            generatePurchaseOrder: process.env.N8N_PURCHASE_ORDER_WEBHOOK || 'https://primary-production-3ef2.up.railway.app/webhook/generate-purchase-order'
        };
        
        // Configuration
        this.config = {
            shopName: process.env.SHOP_NAME || 'Coffee Paradise',
            currency: process.env.CURRENCY || 'PHP',
            taxRate: parseFloat(process.env.TAX_RATE) || 0.12,
            jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
            environment: process.env.NODE_ENV || 'development'
        };
        
        this.initializeMiddleware();
        this.initializeRoutes();
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
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (this.config.environment === 'development') {
                console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
            }
        });
        
        next();
    }

    initializeRoutes() {
        // Health check
        this.app.get('/health', this.handleHealthCheck.bind(this));
        
        // Authentication routes
        this.app.post('/api/auth/login', this.handleLogin.bind(this));
        this.app.post('/api/auth/logout', this.authenticateToken.bind(this), this.handleLogout.bind(this));
        
        // POS Data routes - Updated for Consolidated n8n Workflow
        this.app.get('/api/get-settings', this.handleGetData.bind(this, 'settings'));
        this.app.get('/api/get-products', this.handleGetData.bind(this, 'products'));
        this.app.post('/api/process-order', this.authenticateToken.bind(this), this.handleProcessOrder.bind(this));
        this.app.post('/api/update-inventory', this.authenticateToken.bind(this), this.handleUpdateInventory.bind(this));
        
        // Dashboard routes
        this.app.get('/api/dashboard-stats', this.authenticateToken.bind(this), this.handleDashboardStats.bind(this));
        this.app.get('/api/low-stock', this.authenticateToken.bind(this), this.handleLowStock.bind(this));
        this.app.get('/api/analytics', this.authenticateToken.bind(this), this.handleAnalytics.bind(this));
        
        // New consolidated data endpoint
        this.app.get('/api/data', this.handleConsolidatedData.bind(this));
        
        // Error handling
        this.app.use(this.errorHandler.bind(this));
        
        // Catch-all route
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    // Authentication middleware (simplified)
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
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
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }
        
        const [header, payload, signature] = parts;
        const expectedSignature = crypto
            .createHmac('sha256', this.config.jwtSecret)
            .update(`${header}.${payload}`)
            .digest('base64url');
        
        if (signature !== expectedSignature) {
            throw new Error('Invalid token signature');
        }
        
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
        
        if (decoded.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('Token expired');
        }
        
        return decoded;
    }

    // Route handlers - Updated for Consolidated n8n Webhooks
    handleHealthCheck(req, res) {
        res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: this.config.environment,
            version: '1.0.0',
            port: this.port,
            ready: true
        });
    }

    async handleLogin(req, res) {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
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
            
            const user = demoUsers.find(u => u.username === username && u.password === password);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            const token = this.generateToken(user);
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                token,
                user: userWithoutPassword,
                message: 'Login successful'
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    handleLogout(req, res) {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }

    // New consolidated data handler
    async handleConsolidatedData(req, res) {
        try {
            // Call the consolidated dataload webhook
            const response = await this.callN8NWebhook(this.n8nWebhooks.dataLoad, 'GET');
            
            if (response && response.success) {
                return res.json(response);
            }
            
            // If webhook fails, return fallback data
            throw new Error('Webhook returned no data');
            
        } catch (webhookError) {
            console.log('n8n consolidated webhook not available, using demo data:', webhookError.message);
            
            // Return fallback consolidated data structure
            const fallbackData = {
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    products: this.getDemoProducts(),
                    settings: this.getDefaultSettings(),
                    productsByCategory: {},
                    lowStockItems: [],
                    orders: { total: 0, todayCount: 0, todayRevenue: 0 }
                },
                summary: {
                    totalProducts: this.getDemoProducts().length,
                    activeProducts: this.getDemoProducts().length,
                    totalSettings: 8,
                    totalOrders: 0,
                    todayOrders: 0,
                    lowStockCount: 0,
                    criticalStockCount: 0,
                    categories: ['Coffee - Espresso', 'Coffee - Milk Based'],
                    avgPrice: 90
                }
            };
            
            // Group demo products by category
            const products = this.getDemoProducts();
            products.forEach(product => {
                if (!fallbackData.data.productsByCategory[product.category]) {
                    fallbackData.data.productsByCategory[product.category] = [];
                }
                fallbackData.data.productsByCategory[product.category].push(product);
            });
            
            res.json(fallbackData);
        }
    }

    // Individual data handlers that use the consolidated endpoint
    async handleGetData(dataType, req, res) {
        try {
            const consolidatedData = await this.getConsolidatedData();
            
            if (dataType === 'settings') {
                res.json({
                    success: true,
                    settings: consolidatedData.data.settings
                });
            } else if (dataType === 'products') {
                res.json({
                    success: true,
                    products: consolidatedData.data.products,
                    lastUpdate: consolidatedData.timestamp,
                    totalProducts: consolidatedData.summary.totalProducts,
                    activeProducts: consolidatedData.summary.activeProducts
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Invalid data type requested'
                });
            }
        } catch (error) {
            console.error(`Get ${dataType} error:`, error);
            
            // Fallback for specific data types
            if (dataType === 'settings') {
                res.json({
                    success: true,
                    settings: this.getDefaultSettings()
                });
            } else if (dataType === 'products') {
                const demoProducts = this.getDemoProducts();
                res.json({
                    success: true,
                    products: demoProducts,
                    lastUpdate: new Date().toISOString()
                });
            }
        }
    }

    // Helper method to get consolidated data
    async getConsolidatedData() {
        try {
            const response = await this.callN8NWebhook(this.n8nWebhooks.dataLoad, 'GET');
            if (response && response.success) {
                return response;
            }
            throw new Error('Webhook failed');
        } catch (error) {
            // Return fallback data
            return {
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    products: this.getDemoProducts(),
                    settings: this.getDefaultSettings(),
                    productsByCategory: {},
                    lowStockItems: [],
                    orders: { total: 0, todayCount: 0, todayRevenue: 0 }
                },
                summary: {
                    totalProducts: this.getDemoProducts().length,
                    activeProducts: this.getDemoProducts().length,
                    totalSettings: 8,
                    totalOrders: 0,
                    todayOrders: 0,
                    lowStockCount: 0,
                    criticalStockCount: 0,
                    categories: ['Coffee - Espresso', 'Coffee - Milk Based'],
                    avgPrice: 90
                }
            };
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
        try {
            const orderData = {
                ...req.body,
                cashier: req.user.username,
                cashierId: req.user.id,
                timestamp: new Date().toISOString()
            };
            
            // Try to call n8n webhook to process order
            try {
                const response = await this.callN8NWebhook(this.n8nWebhooks.processOrder, 'POST', orderData);
                
                if (response && response.success) {
                    return res.json({
                        success: true,
                        orderId: response.orderId,
                        total: response.total || orderData.total,
                        message: response.message || 'Order processed successfully',
                        lowStockAlert: response.lowStockAlert || false,
                        lowStockCount: response.lowStockCount || 0,
                        emailSent: response.emailSent || false
                    });
                }
            } catch (webhookError) {
                console.log('n8n webhook not available, processing order locally:', webhookError.message);
            }
            
            // Fallback: Process order locally without n8n
            const orderId = 'ORD-' + Date.now();
            console.log('Order processed locally:', orderId);
            
            res.json({
                success: true,
                orderId: orderId,
                total: orderData.total,
                message: 'Order processed successfully (demo mode)',
                lowStockAlert: false,
                lowStockCount: 0,
                emailSent: false
            });
            
        } catch (error) {
            console.error('Process order error:', error);
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
            // Get consolidated data which includes dashboard information
            const consolidatedData = await this.getConsolidatedData();
            
            if (consolidatedData && consolidatedData.success) {
                const stats = {
                    success: true,
                    stats: {
                        todaySales: consolidatedData.data.orders.todayRevenue || 0,
                        todayOrders: consolidatedData.data.orders.todayCount || 0,
                        avgOrder: consolidatedData.data.orders.todayCount > 0 
                            ? Math.round((consolidatedData.data.orders.todayRevenue / consolidatedData.data.orders.todayCount) * 100) / 100 
                            : 0,
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
                    alerts: consolidatedData.data.lowStockItems || []
                };
                
                return res.json(stats);
            }
            
            // Fallback to demo stats
            const demoStats = this.getDemoStats();
            res.json(demoStats);
            
        } catch (error) {
            console.error('Dashboard stats error:', error);
            const demoStats = this.getDemoStats();
            res.json(demoStats);
        }
    }

    async handleLowStock(req, res) {
        try {
            // Try n8n webhook first
            try {
                const response = await this.callN8NWebhook(this.n8nWebhooks.lowStock, 'GET');
                
                if (response && response.success) {
                    return res.json(response);
                }
            } catch (webhookError) {
                console.log('n8n low stock webhook not available, using consolidated data:', webhookError.message);
            }
            
            // Fallback to consolidated data
            const consolidatedData = await this.getConsolidatedData();
            
            res.json({
                success: true,
                lowStockItems: consolidatedData.data.lowStockItems || [],
                summary: {
                    total: consolidatedData.summary.lowStockCount || 0,
                    critical: consolidatedData.summary.criticalStockCount || 0,
                    warning: (consolidatedData.summary.lowStockCount || 0) - (consolidatedData.summary.criticalStockCount || 0)
                }
            });
            
        } catch (error) {
            console.error('Low stock error:', error);
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
            
            // Try n8n webhook first
            try {
                const response = await this.callN8NWebhook(this.n8nWebhooks.analytics, 'GET', { period });
                
                if (response && response.success) {
                    return res.json(response);
                }
            } catch (webhookError) {
                console.log('n8n analytics webhook not available, using demo analytics:', webhookError.message);
            }
            
            // Fallback analytics
            const analytics = this.calculateDemoAnalytics(period);
            res.json({
                success: true,
                analytics,
                period
            });
            
        } catch (error) {
            console.error('Analytics error:', error);
            res.json({
                success: true,
                analytics: this.calculateDemoAnalytics(period),
                period
            });
        }
    }

    async callN8NWebhook(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        } else if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            url += `?${params}`;
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`n8n webhook call failed: ${response.status}`);
        }
        
        return response.json();
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
        console.error('Server error:', error);
        
        const isDevelopment = this.config.environment === 'development';
        
        res.status(error.status || 500).json({
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
   Data Load (Consolidated): ${this.n8nWebhooks.dataLoad}
   Process Order: ${this.n8nWebhooks.processOrder}
   Update Stock: ${this.n8nWebhooks.updateStock}
   Analytics: ${this.n8nWebhooks.analytics}
   Low Stock: ${this.n8nWebhooks.lowStock}
   Ingredient Usage: ${this.n8nWebhooks.ingredientUsage}
   Purchase Orders: ${this.n8nWebhooks.generatePurchaseOrder}

🎯 Features Enabled:
   ✅ Authentication System
   ✅ POS Interface
   ✅ Consolidated n8n Integration
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