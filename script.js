// Coffee Shop POS System - Main JavaScript
class CoffeePOS {
    constructor() {
        this.config = {
            apiBaseUrl: '/api',
            autoRefreshInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 1000
        };
        
        this.state = {
            isAuthenticated: false,
            currentUser: null,
            products: [],
            categories: [],
            cart: [],
            settings: {},
            isOnline: true,
            lastSync: null,
            selectedPaymentMethod: 'cash'
        };
        
        this.charts = {
            sales: null,
            products: null
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Coffee POS System...');
        
        // Check if user is already authenticated
        const storedAuth = localStorage.getItem('coffeepos_auth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                if (this.isTokenValid(authData.token)) {
                    this.state.isAuthenticated = true;
                    this.state.currentUser = authData.user;
                    this.showPOSInterface();
                    await this.loadInitialData();
                    return;
                }
            } catch (error) {
                console.warn('Invalid stored auth data:', error);
                localStorage.removeItem('coffeepos_auth');
            }
        }
        
        this.showAuthScreen();
        this.setupEventListeners();
        this.startConnectionMonitoring();
    }

    isTokenValid(token) {
        // Simple token validation - in production, verify with server
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch {
            return false;
        }
    }

    showAuthScreen() {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('posInterface').classList.add('hidden');
    }

    showPOSInterface() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('posInterface').classList.remove('hidden');
        this.updateHeader();
    }

    setupEventListeners() {
        // Auth form
        document.getElementById('authForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        
        // Product search
        document.getElementById('productSearch').addEventListener('input', this.handleProductSearch.bind(this));
        
        // Cart management
        document.getElementById('clearCart').addEventListener('click', this.clearCart.bind(this));
        
        // Payment methods
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', this.selectPaymentMethod.bind(this));
        });
        
        // Checkout
        document.getElementById('checkoutBtn').addEventListener('click', this.handleCheckout.bind(this));
        
        // Admin dashboard
        document.getElementById('adminToggle').addEventListener('click', this.toggleAdminDashboard.bind(this));
        document.getElementById('closeDashboard').addEventListener('click', this.closeAdminDashboard.bind(this));
        
        // Modal management
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', this.closeModal.bind(this));
        });
        
        // Variant modal quantity controls
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', this.handleQuantityChange.bind(this));
        });
        
        // Add to cart from variant modal
        document.getElementById('addVariantToCart').addEventListener('click', this.addVariantToCart.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Prevent form submission on Enter in search
        document.getElementById('productSearch').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        this.showLoading(true);
        
        try {
            // Simulate authentication - replace with actual API call
            const response = await this.apiCall('/auth/login', 'POST', credentials);
            
            if (response.success) {
                this.state.isAuthenticated = true;
                this.state.currentUser = response.user;
                
                // Store auth data
                localStorage.setItem('coffeepos_auth', JSON.stringify({
                    token: response.token,
                    user: response.user,
                    timestamp: Date.now()
                }));
                
                this.showToast('Login successful!', 'success');
                this.showPOSInterface();
                await this.loadInitialData();
            } else {
                this.showToast('Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        localStorage.removeItem('coffeepos_auth');
        this.state.isAuthenticated = false;
        this.state.currentUser = null;
        this.clearCart();
        this.showAuthScreen();
        this.showToast('Logged out successfully', 'info');
    }

    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // Load settings from Google Sheets
            const settingsPromise = this.loadSettings();
            const productsPromise = this.loadProducts();
            const categoriesPromise = this.loadCategories();
            
            await Promise.all([settingsPromise, productsPromise, categoriesPromise]);
            
            this.renderCategories();
            this.renderProducts();
            this.updateConnectionStatus(true);
            this.startAutoRefresh();
            
            this.showToast('System ready!', 'success');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load data. Check connection.', 'error');
            this.updateConnectionStatus(false);
        } finally {
            this.showLoading(false);
        }
    }

    async loadSettings() {
        try {
            const response = await this.apiCall('/get-settings');
            this.state.settings = response.settings;
            this.applySettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Use default settings
            this.state.settings = {
                shopName: 'Coffee Paradise',
                shopTagline: 'Fresh Coffee Daily',
                logoEmoji: '☕',
                currency: 'PHP',
                taxRate: 0.12,
                enableIngredientTracking: true
            };
        }
    }

    async loadProducts() {
        try {
            const response = await this.apiCall('/get-products');
            this.state.products = response.products.filter(p => p.isActive);
        } catch (error) {
            console.error('Failed to load products:', error);
            // Use demo products
            this.state.products = this.getDemoProducts();
        }
    }

    async loadCategories() {
        const categories = [...new Set(this.state.products.map(p => p.category))];
        this.state.categories = ['All Products', ...categories];
    }

    applySettings() {
        const { shopName, shopTagline, logoEmoji } = this.state.settings;
        
        document.getElementById('shopName').textContent = shopName;
        document.getElementById('shopTagline').textContent = shopTagline;
        
        // Update logo
        document.querySelectorAll('.shop-logo, .logo').forEach(el => {
            el.textContent = logoEmoji;
        });
        
        // Update page title
        document.title = `${shopName} POS`;
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        container.innerHTML = '';
        
        this.state.categories.forEach((category, index) => {
            const button = document.createElement('button');
            button.className = `category-btn ${index === 0 ? 'active' : ''}`;
            button.textContent = category;
            button.dataset.category = category === 'All Products' ? 'all' : category;
            button.addEventListener('click', this.filterByCategory.bind(this));
            container.appendChild(button);
        });
    }

    renderProducts(filteredProducts = null) {
        const container = document.getElementById('productsGrid');
        const products = filteredProducts || this.state.products;
        
        if (products.length === 0) {
            container.innerHTML = '<div class="product-loading"><p>No products found</p></div>';
            return;
        }
        
        container.innerHTML = products.map(product => this.createProductCard(product)).join('');
        
        // Add click listeners
        container.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', this.handleProductClick.bind(this));
        });
    }

    createProductCard(product) {
        const isOutOfStock = product.stock <= 0;
        const isLowStock = product.stock <= product.lowStockThreshold && product.stock > 0;
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product.id}">
                <div class="product-emoji">${product.image || '☕'}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-description">${product.description || ''}</div>
                <div class="product-price">₱${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-stock ${isLowStock ? 'low-stock' : ''}">
                    Stock: ${product.stock} ${isLowStock ? '⚠️' : ''}
                </div>
            </div>
        `;
    }

    handleProductClick(e) {
        const card = e.currentTarget;
        const productId = card.dataset.productId;
        const product = this.state.products.find(p => p.id === productId);
        
        if (!product || product.stock <= 0) {
            this.showToast('Product out of stock', 'warning');
            return;
        }
        
        if (product.variants && product.variants.length > 0) {
            this.showVariantModal(product);
        } else {
            this.addToCart(product, {}, 1);
        }
    }

    showVariantModal(product) {
        const modal = document.getElementById('variantModal');
        const nameEl = document.getElementById('variantProductName');
        const variantsList = document.getElementById('variantsList');
        
        nameEl.textContent = product.name;
        
        // Create variant options
        const variants = product.variants.split(',').map(v => v.trim());
        variantsList.innerHTML = variants.map((variant, index) => `
            <div class="variant-option ${index === 0 ? 'selected' : ''}" data-variant="${variant}">
                <input type="radio" name="variant" value="${variant}" ${index === 0 ? 'checked' : ''}>
                <span>${variant}</span>
            </div>
        `).join('');
        
        // Add variant selection listeners
        variantsList.querySelectorAll('.variant-option').forEach(option => {
            option.addEventListener('click', () => {
                variantsList.querySelectorAll('.variant-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;
            });
        });
        
        // Reset quantity
        document.getElementById('variantQuantity').value = 1;
        
        // Store product reference
        modal.dataset.productId = product.id;
        
        modal.classList.remove('hidden');
    }

    handleQuantityChange(e) {
        const action = e.target.dataset.action;
        const input = document.getElementById('variantQuantity');
        let value = parseInt(input.value) || 1;
        
        if (action === 'increase') {
            value++;
        } else if (action === 'decrease' && value > 1) {
            value--;
        }
        
        input.value = value;
    }

    addVariantToCart() {
        const modal = document.getElementById('variantModal');
        const productId = modal.dataset.productId;
        const product = this.state.products.find(p => p.id === productId);
        
        const selectedVariant = document.querySelector('input[name="variant"]:checked').value;
        const quantity = parseInt(document.getElementById('variantQuantity').value);
        
        this.addToCart(product, { variant: selectedVariant }, quantity);
        this.closeModal();
    }

    addToCart(product, options = {}, quantity = 1) {
        const cartItemId = `${product.id}_${JSON.stringify(options)}`;
        const existingItem = this.state.cart.find(item => item.id === cartItemId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.state.cart.push({
                id: cartItemId,
                productId: product.id,
                name: product.name,
                price: parseFloat(product.price),
                quantity,
                options,
                cost: parseFloat(product.cost || 0)
            });
        }
        
        this.renderCart();
        this.updateCartSummary();
        this.showToast(`${product.name} added to cart`, 'success');
        
        // Play success sound (if enabled)
        this.playSound('add-to-cart');
    }

    renderCart() {
        const container = document.getElementById('cartItems');
        
        if (this.state.cart.length === 0) {
            container.innerHTML = '<div class="empty-cart"><p>No items in cart</p></div>';
            return;
        }
        
        container.innerHTML = this.state.cart.map(item => this.createCartItem(item)).join('');
        
        // Add event listeners
        container.querySelectorAll('.qty-control').forEach(btn => {
            btn.addEventListener('click', this.updateCartItemQuantity.bind(this));
        });
        
        container.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', this.removeCartItem.bind(this));
        });
    }

    createCartItem(item) {
        const variantText = item.options.variant ? ` - ${item.options.variant}` : '';
        const total = item.price * item.quantity;
        
        return `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    ${variantText ? `<div class="cart-item-variant">${variantText}</div>` : ''}
                    <div class="cart-item-price">₱${total.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-control" data-action="decrease">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button class="qty-control" data-action="increase">+</button>
                    <button class="remove-item">×</button>
                </div>
            </div>
        `;
    }

    updateCartItemQuantity(e) {
        const action = e.target.dataset.action;
        const cartItem = e.target.closest('.cart-item');
        const itemId = cartItem.dataset.itemId;
        const item = this.state.cart.find(i => i.id === itemId);
        
        if (action === 'increase') {
            item.quantity++;
        } else if (action === 'decrease' && item.quantity > 1) {
            item.quantity--;
        }
        
        this.renderCart();
        this.updateCartSummary();
    }

    removeCartItem(e) {
        const cartItem = e.target.closest('.cart-item');
        const itemId = cartItem.dataset.itemId;
        this.state.cart = this.state.cart.filter(item => item.id !== itemId);
        
        this.renderCart();
        this.updateCartSummary();
        this.showToast('Item removed from cart', 'info');
    }

    clearCart() {
        this.state.cart = [];
        this.renderCart();
        this.updateCartSummary();
        this.showToast('Cart cleared', 'info');
    }

    updateCartSummary() {
        const subtotal = this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxRate = this.state.settings.taxRate || 0.12;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        
        document.getElementById('subtotal').textContent = `₱${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `₱${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `₱${total.toFixed(2)}`;
        
        // Update ingredient cost if tracking is enabled
        if (this.state.settings.enableIngredientTracking) {
            const ingredientCost = this.state.cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
            const profit = subtotal - ingredientCost;
            
            document.getElementById('ingredientCost').textContent = `₱${ingredientCost.toFixed(2)}`;
            document.getElementById('profit').textContent = `₱${profit.toFixed(2)}`;
            document.getElementById('ingredientCostSection').style.display = 'block';
        }
        
        // Enable/disable checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        checkoutBtn.disabled = this.state.cart.length === 0;
    }

    selectPaymentMethod(e) {
        document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.state.selectedPaymentMethod = e.target.dataset.method;
    }

    async handleCheckout() {
        if (this.state.cart.length === 0) {
            this.showToast('Cart is empty', 'warning');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const orderData = {
                items: this.state.cart,
                paymentMethod: this.state.selectedPaymentMethod,
                subtotal: this.getCartSubtotal(),
                tax: this.getCartTax(),
                total: this.getCartTotal(),
                timestamp: new Date().toISOString()
            };
            
            const response = await this.apiCall('/process-order', 'POST', orderData);
            
            if (response.success) {
                this.showToast('Order completed successfully!', 'success');
                this.playSound('checkout-success');
                this.clearCart();
                
                // Print receipt if enabled
                if (this.state.settings.autoPrintReceipt) {
                    this.printReceipt(response.order);
                }
                
                // Refresh products to update stock
                await this.loadProducts();
                this.renderProducts();
            } else {
                this.showToast('Order failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('Checkout failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    getCartSubtotal() {
        return this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getCartTax() {
        return this.getCartSubtotal() * (this.state.settings.taxRate || 0.12);
    }

    getCartTotal() {
        return this.getCartSubtotal() + this.getCartTax();
    }

    filterByCategory(e) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        const category = e.target.dataset.category;
        
        if (category === 'all') {
            this.renderProducts();
        } else {
            const filtered = this.state.products.filter(p => p.category === category);
            this.renderProducts(filtered);
        }
    }

    handleProductSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            this.renderProducts();
            return;
        }
        
        const filtered = this.state.products.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
        
        this.renderProducts(filtered);
    }

    toggleAdminDashboard() {
        const dashboard = document.getElementById('adminDashboard');
        dashboard.classList.remove('hidden');
        this.loadDashboardData();
    }

    closeAdminDashboard() {
        document.getElementById('adminDashboard').classList.add('hidden');
    }

    async loadDashboardData() {
        try {
            const response = await this.apiCall('/dashboard-stats');
            
            if (response.success) {
                this.updateDashboardStats(response.stats);
                this.renderCharts(response.chartData);
                this.renderStockAlerts(response.alerts);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.loadDemoDashboardData();
        }
    }

    loadDemoDashboardData() {
        // Demo data for offline mode
        const demoStats = {
            todaySales: 15750,
            todayOrders: 42,
            avgOrder: 375,
            profitMargin: 68
        };
        
        const demoChartData = {
            sales: {
                labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'],
                data: [1200, 1800, 2400, 3200, 2800, 2200, 2100]
            },
            products: {
                labels: ['Latte', 'Americano', 'Cappuccino', 'Espresso', 'Mocha'],
                data: [15, 12, 10, 8, 7]
            }
        };
        
        const demoAlerts = [
            { item: 'Coffee Beans', stock: 2, threshold: 5 },
            { item: 'Whole Milk', stock: 1, threshold: 3 }
        ];
        
        this.updateDashboardStats(demoStats);
        this.renderCharts(demoChartData);
        this.renderStockAlerts(demoAlerts);
    }

    updateDashboardStats(stats) {
        document.getElementById('todaySales').textContent = `₱${stats.todaySales.toLocaleString()}`;
        document.getElementById('todayOrders').textContent = stats.todayOrders;
        document.getElementById('avgOrder').textContent = `₱${stats.avgOrder.toFixed(2)}`;
        document.getElementById('profitMargin').textContent = `${stats.profitMargin}%`;
    }

    renderCharts(chartData) {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping chart rendering');
            this.showChartPlaceholder();
            return;
        }

        try {
            // Sales Chart
            const salesCtx = document.getElementById('salesChart').getContext('2d');
            if (this.charts.sales) this.charts.sales.destroy();
            
            this.charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: chartData.sales.labels,
                datasets: [{
                    label: 'Sales (₱)',
                    data: chartData.sales.data,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Products Chart
        const productsCtx = document.getElementById('productsChart').getContext('2d');
        if (this.charts.products) this.charts.products.destroy();
        
        this.charts.products = new Chart(productsCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.products.labels,
                datasets: [{
                    data: chartData.products.data,
                    backgroundColor: [
                        '#8B4513', '#D2B48C', '#5D2F0A', '#7B3F00', '#3C2415'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        
        } catch (error) {
            console.error('Error rendering charts:', error);
            this.showChartPlaceholder();
        }
    }

    showChartPlaceholder() {
        const salesChart = document.getElementById('salesChart');
        const productsChart = document.getElementById('productsChart');
        
        if (salesChart) {
            salesChart.parentElement.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;">Chart unavailable - External resources loading</div>';
        }
        
        if (productsChart) {
            productsChart.parentElement.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;">Chart unavailable - External resources loading</div>';
        }
    }

    renderStockAlerts(alerts) {
        const container = document.getElementById('stockAlerts');
        
        if (alerts.length === 0) {
            container.innerHTML = '<p>No stock alerts</p>';
            return;
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-icon">⚠️</div>
                <div class="alert-content">
                    <div class="alert-title">${alert.item}</div>
                    <div class="alert-message">Stock: ${alert.stock} (Threshold: ${alert.threshold})</div>
                </div>
            </div>
        `).join('');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+F - Focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            document.getElementById('productSearch').focus();
        }
        
        // Ctrl+Enter - Checkout
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!document.getElementById('checkoutBtn').disabled) {
                this.handleCheckout();
            }
        }
        
        // Escape - Close modals
        if (e.key === 'Escape') {
            this.closeModal();
            this.closeAdminDashboard();
        }
    }

    startConnectionMonitoring() {
        setInterval(() => {
            this.checkConnection();
        }, 5000);
    }

    async checkConnection() {
        try {
            await this.apiCall('/health');
            this.updateConnectionStatus(true);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(isOnline) {
        this.state.isOnline = isOnline;
        const statusEl = document.getElementById('connectionStatus');
        const dotEl = statusEl.querySelector('.status-dot');
        
        if (isOnline) {
            dotEl.classList.add('online');
            statusEl.querySelector('span:last-child').textContent = 'Online';
        } else {
            dotEl.classList.remove('online');
            statusEl.querySelector('span:last-child').textContent = 'Offline';
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        this.refreshInterval = setInterval(async () => {
            if (this.state.isOnline && this.state.isAuthenticated) {
                // Refresh all data from Google Sheets via n8n
                await this.refreshAllData();
            }
        }, this.config.autoRefreshInterval);
    }

    async refreshAllData() {
        try {
            // Show subtle loading indicator
            this.showRefreshIndicator();
            
            // Load fresh data from sheets
            await Promise.all([
                this.loadProducts(),
                this.loadSettings()
            ]);
            
            // Re-render everything with fresh data
            this.renderCategories();
            this.renderProducts();
            this.applySettings();
            
            // Hide loading indicator
            this.hideRefreshIndicator();
            
            // Update last sync time
            this.state.lastSync = new Date();
            this.updateSyncStatus();
            
        } catch (error) {
            console.error('Auto-refresh failed:', error);
            this.hideRefreshIndicator();
        }
    }

    showRefreshIndicator() {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.classList.add('syncing');
        statusEl.querySelector('span:last-child').textContent = 'Syncing...';
    }

    hideRefreshIndicator() {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.classList.remove('syncing');
        if (this.state.isOnline) {
            statusEl.querySelector('span:last-child').textContent = 'Online';
        }
    }

    updateSyncStatus() {
        if (this.state.lastSync) {
            const timeAgo = this.getTimeAgo(this.state.lastSync);
            const statusEl = document.getElementById('connectionStatus');
            statusEl.title = `Last synced: ${timeAgo}`;
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    updateHeader() {
        if (this.state.currentUser) {
            document.getElementById('staffName').textContent = this.state.currentUser.name || 'Staff Member';
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        // Add auth header if authenticated
        const authData = localStorage.getItem('coffeepos_auth');
        if (authData) {
            const { token } = JSON.parse(authData);
            options.headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }
        
        return response.json();
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">${this.getToastTitle(type)}</div>
                <button class="toast-close">×</button>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.remove();
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    playSound(type) {
        // Simple sound feedback using Web Audio API
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const frequencies = {
            'add-to-cart': 800,
            'checkout-success': 1000,
            'error': 300
        };
        
        const frequency = frequencies[type] || 600;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    }

    printReceipt(order) {
        const receiptContent = this.generateReceiptHTML(order);
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        margin: 0; 
                        padding: 20px;
                        width: 300px;
                    }
                    .receipt-header { text-align: center; margin-bottom: 20px; }
                    .receipt-line { display: flex; justify-content: space-between; margin: 2px 0; }
                    .receipt-total { border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; }
                    .receipt-footer { text-align: center; margin-top: 20px; font-size: 10px; }
                </style>
            </head>
            <body class="receipt-print">
                ${receiptContent}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }

    generateReceiptHTML(order) {
        const { shopName, address, phone } = this.state.settings;
        const timestamp = new Date().toLocaleString();
        
        let itemsHTML = order.items.map(item => {
            const variantText = item.options.variant ? ` (${item.options.variant})` : '';
            return `
                <div class="receipt-line">
                    <span>${item.name}${variantText} x${item.quantity}</span>
                    <span>₱${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="receipt-header">
                <h2>${shopName}</h2>
                <p>${address || ''}</p>
                <p>${phone || ''}</p>
                <p>Order #${order.id}</p>
                <p>${timestamp}</p>
            </div>
            
            <div class="receipt-items">
                ${itemsHTML}
            </div>
            
            <div class="receipt-totals">
                <div class="receipt-line">
                    <span>Subtotal:</span>
                    <span>₱${order.subtotal.toFixed(2)}</span>
                </div>
                <div class="receipt-line">
                    <span>Tax (12%):</span>
                    <span>₱${order.tax.toFixed(2)}</span>
                </div>
                <div class="receipt-line receipt-total">
                    <span>TOTAL:</span>
                    <span>₱${order.total.toFixed(2)}</span>
                </div>
                <div class="receipt-line">
                    <span>Payment:</span>
                    <span>${order.paymentMethod.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="receipt-footer">
                <p>Thank you for your business!</p>
                <p>Please come again</p>
                <p>Powered by Coffee POS</p>
            </div>
        `;
    }

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
                cost: 18.50,
                variants: ''
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
                cost: 22.00,
                variants: 'Regular,Large'
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
                cost: 35.50,
                variants: 'Regular,Large,Decaf'
            },
            {
                id: 'cappuccino',
                name: 'Cappuccino',
                description: 'Espresso with steamed milk foam',
                price: 115,
                category: 'Coffee - Milk Based',
                image: '☕',
                stock: 25,
                lowStockThreshold: 10,
                isActive: true,
                cost: 33.00,
                variants: 'Regular,Large,Extra Foam'
            },
            {
                id: 'mocha',
                name: 'Mocha',
                description: 'Chocolate espresso drink',
                price: 135,
                category: 'Coffee - Specialty',
                image: '🍫',
                stock: 20,
                lowStockThreshold: 5,
                isActive: true,
                cost: 42.00,
                variants: 'Regular,Large,Extra Chocolate'
            },
            {
                id: 'frappuccino',
                name: 'Frappuccino',
                description: 'Iced blended coffee drink',
                price: 150,
                category: 'Coffee - Cold',
                image: '🧊',
                stock: 15,
                lowStockThreshold: 5,
                isActive: true,
                cost: 45.00,
                variants: 'Vanilla,Caramel,Mocha'
            },
            {
                id: 'iced-coffee',
                name: 'Iced Coffee',
                description: 'Cold brew coffee',
                price: 95,
                category: 'Coffee - Cold',
                image: '🧊',
                stock: 35,
                lowStockThreshold: 10,
                isActive: true,
                cost: 28.00,
                variants: 'Regular,Large,With Milk'
            },
            {
                id: 'hot-chocolate',
                name: 'Hot Chocolate',
                description: 'Rich chocolate drink',
                price: 110,
                category: 'Non-Coffee',
                image: '🍫',
                stock: 25,
                lowStockThreshold: 5,
                isActive: true,
                cost: 35.00,
                variants: 'Regular,Large,Extra Marshmallows'
            },
            {
                id: 'chai-latte',
                name: 'Chai Latte',
                description: 'Spiced tea with milk',
                price: 125,
                category: 'Tea',
                image: '🍵',
                stock: 20,
                lowStockThreshold: 5,
                isActive: true,
                cost: 38.00,
                variants: 'Regular,Large,Iced'
            },
            {
                id: 'croissant',
                name: 'Butter Croissant',
                description: 'Fresh baked pastry',
                price: 75,
                category: 'Food',
                image: '🥐',
                stock: 12,
                lowStockThreshold: 3,
                isActive: true,
                cost: 25.00,
                variants: ''
            },
            {
                id: 'muffin',
                name: 'Blueberry Muffin',
                description: 'Homemade muffin',
                price: 85,
                category: 'Food',
                image: '🧁',
                stock: 8,
                lowStockThreshold: 2,
                isActive: true,
                cost: 30.00,
                variants: 'Blueberry,Chocolate Chip,Banana'
            },
            {
                id: 'sandwich',
                name: 'Club Sandwich',
                description: 'Fresh sandwich',
                price: 165,
                category: 'Food',
                image: '🥪',
                stock: 5,
                lowStockThreshold: 2,
                isActive: true,
                cost: 85.00,
                variants: 'Club,BLT,Grilled Cheese'
            }
        ];
    }

    // Utility methods for local storage fallback
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`coffeepos_${key}`, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(`coffeepos_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    // Network retry logic
    async retryOperation(operation, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await this.delay(this.config.retryDelay * Math.pow(2, i)); // Exponential backoff
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup method
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }
        
        if (this.charts.products) {
            this.charts.products.destroy();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Initialize the POS system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.coffeePOS = new CoffeePOS();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.coffeePOS) {
        window.coffeePOS.destroy();
    }
});

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeePOS;
}