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
        console.log('[DEBUG] Initializing Coffee POS System...');
        console.log('[DEBUG] Initial State:', this.state);
        
        // Check if user is already authenticated
        const storedAuth = localStorage.getItem('coffeepos_auth');
        console.log('[DEBUG] Stored Auth Data:', storedAuth ? 'Found' : 'Not Found');
        
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                console.log('[DEBUG] Auth Data Parsed:', authData);
                
                if (this.isTokenValid(authData.token)) {
                    console.log('[DEBUG] Token Valid - Auto-logging in');
                    this.state.isAuthenticated = true;
                    this.state.currentUser = authData.user;
                    this.showPOSInterface();
                    console.log('[DEBUG] POS Interface Shown - Loading Initial Data...');
                    await this.loadInitialData();
                    console.log('[DEBUG] Auto-login complete');
                    return;
                } else {
                    console.log('[DEBUG] Token Invalid - Clearing stored auth');
                }
            } catch (error) {
                console.warn('[DEBUG] Invalid stored auth data:', error);
                localStorage.removeItem('coffeepos_auth');
            }
        }
        
        console.log('[DEBUG] Showing Auth Screen');
        this.showAuthScreen();
        console.log('[DEBUG] Setting up Event Listeners');
        this.setupEventListeners();
        console.log('[DEBUG] Starting Connection Monitoring');
        this.startConnectionMonitoring();
        console.log('[DEBUG] Init complete - waiting for user login');
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
        console.log('[DEBUG] Setting up Event Listeners...');
        console.log('[DEBUG] DOM ready state:', document.readyState);
        console.log('[DEBUG] Current URL:', window.location.href);
        
        // Auth form
        const authForm = document.getElementById('authForm');
        console.log('[DEBUG] Auth Form Element:', authForm);
        console.log('[DEBUG] Auth Form exists:', !!authForm);
        if (authForm) {
            console.log('[DEBUG] Auth Form classList:', authForm.classList);
            console.log('[DEBUG] Auth Form innerHTML length:', authForm.innerHTML.length);
            authForm.addEventListener('submit', this.handleLogin.bind(this));
            console.log('[DEBUG] Auth form listener added');
        } else {
            console.error('[DEBUG] Auth form element not found');
            console.error('[DEBUG] Available form elements:', document.querySelectorAll('form'));
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        console.log('[DEBUG] Logout Button:', logoutBtn);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
            console.log('[DEBUG] Logout button listener added');
        } else {
            console.error('[DEBUG] Logout button not found');
        }
        
        // Product search
        const productSearch = document.getElementById('productSearch');
        console.log('[DEBUG] Product Search:', productSearch);
        console.log('[DEBUG] Product Search exists:', !!productSearch);
        if (productSearch) {
            console.log('[DEBUG] Product Search type:', productSearch.type);
            console.log('[DEBUG] Product Search value:', productSearch.value);
            
            productSearch.addEventListener('input', (e) => {
                console.log('[DEBUG] Product search input event:', e.target.value);
                this.handleProductSearch(e);
            });
            console.log('[DEBUG] Product search listener added');
            
            // Prevent form submission on Enter in search
            productSearch.addEventListener('keydown', (e) => {
                console.log('[DEBUG] Product search keydown:', e.key);
                if (e.key === 'Enter') {
                    console.log('[DEBUG] Preventing Enter key form submission');
                    e.preventDefault();
                }
            });
            console.log('[DEBUG] Product search keydown listener added');
        } else {
            console.error('[DEBUG] Product search element not found');
            console.error('[DEBUG] Available input elements:', document.querySelectorAll('input'));
        }
        
        // Cart management
        const clearCart = document.getElementById('clearCart');
        console.log('[DEBUG] Clear Cart Button:', clearCart);
        if (clearCart) {
            clearCart.addEventListener('click', this.clearCart.bind(this));
            console.log('[DEBUG] Clear cart listener added');
        } else {
            console.error('[DEBUG] Clear cart button not found');
        }
        
        // Payment methods
        const paymentBtns = document.querySelectorAll('.payment-btn');
        console.log('[DEBUG] Payment Buttons Found:', paymentBtns.length);
        paymentBtns.forEach((btn, index) => {
            btn.addEventListener('click', this.selectPaymentMethod.bind(this));
            console.log(`[DEBUG] Payment button ${index + 1} listener added`);
        });
        
        // Checkout
        const checkoutBtn = document.getElementById('checkoutBtn');
        console.log('[DEBUG] Checkout Button:', checkoutBtn);
        console.log('[DEBUG] Checkout Button exists:', !!checkoutBtn);
        if (checkoutBtn) {
            console.log('[DEBUG] Checkout Button disabled:', checkoutBtn.disabled);
            console.log('[DEBUG] Checkout Button classList:', checkoutBtn.classList);
            
            checkoutBtn.addEventListener('click', (e) => {
                console.log('[DEBUG] Checkout button clicked!');
                console.log('[DEBUG] Cart items:', this.state.cart.length);
                console.log('[DEBUG] Button disabled:', e.target.disabled);
                this.handleCheckout(e);
            });
            console.log('[DEBUG] Checkout button listener added');
        } else {
            console.error('[DEBUG] Checkout button not found');
            console.error('[DEBUG] Available buttons:', document.querySelectorAll('button'));
        }
        
        // Admin dashboard
        const adminToggle = document.getElementById('adminToggle');
        const closeDashboard = document.getElementById('closeDashboard');
        console.log('[DEBUG] Admin Toggle:', adminToggle);
        console.log('[DEBUG] Close Dashboard:', closeDashboard);
        
        if (adminToggle) {
            adminToggle.addEventListener('click', this.toggleAdminDashboard.bind(this));
            console.log('[DEBUG] Admin toggle listener added');
        } else {
            console.error('[DEBUG] Admin toggle button not found');
        }
        
        if (closeDashboard) {
            closeDashboard.addEventListener('click', this.closeAdminDashboard.bind(this));
            console.log('[DEBUG] Close dashboard listener added');
        } else {
            console.error('[DEBUG] Close dashboard button not found');
        }
        
        // Modal management
        const modalCloseBtns = document.querySelectorAll('.modal-close');
        console.log('[DEBUG] Modal Close Buttons Found:', modalCloseBtns.length);
        modalCloseBtns.forEach((btn, index) => {
            btn.addEventListener('click', this.closeModal.bind(this));
            console.log(`[DEBUG] Modal close button ${index + 1} listener added`);
        });
        
        // Variant modal quantity controls
        const qtyBtns = document.querySelectorAll('.qty-btn');
        console.log('[DEBUG] Quantity Buttons Found:', qtyBtns.length);
        qtyBtns.forEach((btn, index) => {
            btn.addEventListener('click', this.handleQuantityChange.bind(this));
            console.log(`[DEBUG] Quantity button ${index + 1} listener added`);
        });
        
        // Add to cart from variant modal
        const addVariantToCart = document.getElementById('addVariantToCart');
        console.log('[DEBUG] Add Variant to Cart:', addVariantToCart);
        if (addVariantToCart) {
            addVariantToCart.addEventListener('click', this.addVariantToCart.bind(this));
            console.log('[DEBUG] Add variant to cart listener added');
        } else {
            console.error('[DEBUG] Add variant to cart button not found');
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        console.log('[DEBUG] Keyboard shortcuts listener added');
        
        console.log('[DEBUG] All Event Listeners Setup Complete');
    }

    async handleLogin(e) {
        console.log('[DEBUG] handleLogin() - Function start');
        console.log('[DEBUG] handleLogin() - Event:', e.type, 'Target:', e.target.tagName);
        
        e.preventDefault();
        const formData = new FormData(e.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        console.log('[DEBUG] handleLogin() - Extracted credentials:', {
            username: credentials.username,
            passwordLength: credentials.password ? credentials.password.length : 0
        });
        
        console.log('[DEBUG] handleLogin() - Showing loading overlay');
        this.showLoading(true);
        
        const startTime = performance.now();
        try {
            console.log('[DEBUG] handleLogin() - Starting authentication API call');
            const response = await this.apiCall('/auth/login', 'POST', credentials);
            console.log('[DEBUG] handleLogin() - API response received:', {
                success: response.success,
                hasToken: !!response.token,
                hasUser: !!response.user,
                message: response.message
            });
            
            if (response.success) {
                console.log('[DEBUG] handleLogin() - Authentication successful');
                console.log('[DEBUG] handleLogin() - Updating state with user data');
                this.state.isAuthenticated = true;
                this.state.currentUser = response.user;
                
                const authData = {
                    token: response.token,
                    user: response.user,
                    timestamp: Date.now()
                };
                
                console.log('[DEBUG] handleLogin() - Storing auth data to localStorage');
                localStorage.setItem('coffeepos_auth', JSON.stringify(authData));
                
                console.log('[DEBUG] handleLogin() - Showing success toast');
                this.showToast('Login successful!', 'success');
                console.log('[DEBUG] handleLogin() - Switching to POS interface');
                this.showPOSInterface();
                console.log('[DEBUG] handleLogin() - Starting initial data load');
                await this.loadInitialData();
                console.log('[DEBUG] handleLogin() - Login process completed successfully');
            } else {
                console.warn('[DEBUG] handleLogin() - Authentication failed:', response.message);
                this.showToast('Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('[DEBUG] handleLogin() - Login error:', error);
            console.error('[DEBUG] handleLogin() - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            this.showToast('Login failed. Please try again.', 'error');
        } finally {
            const endTime = performance.now();
            console.log(`[DEBUG] handleLogin() - Total login time: ${(endTime - startTime).toFixed(2)}ms`);
            console.log('[DEBUG] handleLogin() - Hiding loading overlay');
            this.showLoading(false);
            console.log('[DEBUG] handleLogin() - Function end');
        }
    }

    handleLogout() {
        console.log('[DEBUG] handleLogout() - Function start');
        console.log('[DEBUG] handleLogout() - Current user:', this.state.currentUser?.username);
        console.log('[DEBUG] handleLogout() - Cart items:', this.state.cart.length);
        
        console.log('[DEBUG] handleLogout() - Removing auth data from localStorage');
        localStorage.removeItem('coffeepos_auth');
        
        console.log('[DEBUG] handleLogout() - Updating state');
        this.state.isAuthenticated = false;
        this.state.currentUser = null;
        
        console.log('[DEBUG] handleLogout() - Clearing cart');
        this.clearCart();
        
        console.log('[DEBUG] handleLogout() - Showing auth screen');
        this.showAuthScreen();
        
        console.log('[DEBUG] handleLogout() - Showing logout toast');
        this.showToast('Logged out successfully', 'info');
        
        console.log('[DEBUG] handleLogout() - Logout process completed');
    }

    async loadInitialData() {
        console.log('[DEBUG] Loading initial data...');
        console.log('[DEBUG] Current state:', this.state);
        
        try {
            this.showLoading(true);
            console.log('[DEBUG] Loading overlay shown');
            
            // Load settings from Google Sheets
            console.log('[DEBUG] Starting parallel data loads...');
            const settingsPromise = this.loadSettings();
            const productsPromise = this.loadProducts();
            const categoriesPromise = this.loadCategories();
            
            console.log('[DEBUG] Waiting for all data to load...');
            await Promise.all([settingsPromise, productsPromise, categoriesPromise]);
            console.log('[DEBUG] All data loaded successfully');
            
            console.log('[DEBUG] Rendering categories...');
            this.renderCategories();
            console.log('[DEBUG] Categories rendered');
            
            console.log('[DEBUG] Rendering products...');
            console.log('[DEBUG] Products in state before render:', this.state.products.length);
            this.renderProducts();
            console.log('[DEBUG] Products rendered');
            
            console.log('[DEBUG] Updating connection status...');
            this.updateConnectionStatus(true);
            console.log('[DEBUG] Starting auto refresh...');
            this.startAutoRefresh();
            
            console.log('[DEBUG] System initialization complete!');
            this.showToast('System ready!', 'success');
        } catch (error) {
            console.error('[DEBUG] Failed to load initial data:', error);
            console.error('[DEBUG] Error details:', error.message);
            console.error('[DEBUG] Error stack:', error.stack);
            this.showToast('Failed to load data. Check connection.', 'error');
            this.updateConnectionStatus(false);
            
            // Try to continue with demo data if possible
            console.log('[DEBUG] Attempting to continue with demo data...');
            if (this.state.products.length === 0) {
                console.log('[DEBUG] Loading demo products as fallback...');
                this.state.products = this.getDemoProducts();
                this.renderCategories();
                this.renderProducts();
                console.log('[DEBUG] Demo mode activated after error');
            }
        } finally {
            console.log('[DEBUG] Hiding loading overlay');
            this.showLoading(false);
        }
    }

    async loadSettings() {
        console.log('[DEBUG] loadSettings() - Function start');
        const startTime = performance.now();
        
        try {
            console.log('[DEBUG] loadSettings() - Making API call to /get-settings');
            const response = await this.apiCall('/get-settings');
            console.log('[DEBUG] loadSettings() - API response received:', {
                hasSettings: !!response.settings,
                settingsKeys: response.settings ? Object.keys(response.settings) : []
            });
            
            this.state.settings = response.settings;
            console.log('[DEBUG] loadSettings() - Settings updated in state:', this.state.settings);
            
            console.log('[DEBUG] loadSettings() - Applying settings to UI');
            this.applySettings();
            
            const endTime = performance.now();
            console.log(`[DEBUG] loadSettings() - Settings loaded successfully in ${(endTime - startTime).toFixed(2)}ms`);
        } catch (error) {
            const endTime = performance.now();
            console.error('[DEBUG] loadSettings() - Failed to load settings:', error);
            console.error('[DEBUG] loadSettings() - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            console.log('[DEBUG] loadSettings() - Using default settings fallback');
            this.state.settings = {
                shopName: 'Coffee Paradise',
                shopTagline: 'Fresh Coffee Daily',
                logoEmoji: '[COFFEE]',
                currency: 'PHP',
                taxRate: 0.12,
                enableIngredientTracking: true
            };
            console.log('[DEBUG] loadSettings() - Default settings applied:', this.state.settings);
            console.log(`[DEBUG] loadSettings() - Function completed with fallback in ${(endTime - startTime).toFixed(2)}ms`);
        }
    }

    async loadProducts() {
        console.log('[DEBUG] Loading products...');
        console.log('[DEBUG] Current URL:', window.location.href);
        console.log('[DEBUG] Current API base URL:', this.config.apiBaseUrl);
        console.log('[DEBUG] Current auth state:', this.state.isAuthenticated);
        console.log('[DEBUG] Network status:', this.state.isOnline);
        
        try {
            console.log('[DEBUG] Making API call to /get-products');
            const response = await this.apiCall('/get-products');
            console.log('[DEBUG] Raw API Response:', response);
            console.log('[DEBUG] Response type:', typeof response);
            console.log('[DEBUG] Response has products property:', response.hasOwnProperty('products'));
            
            if (response && response.products) {
                console.log('[DEBUG] Total products received:', response.products.length);
                const activeProducts = response.products.filter(p => p.isActive);
                console.log('[DEBUG] Products loaded from API:', activeProducts.length, 'active products');
                console.log('[DEBUG] Product data:', activeProducts);
                console.log('[DEBUG] Setting products to state...');
                this.state.products = activeProducts;
                console.log('[DEBUG] Products state updated successfully');
            } else {
                console.warn('[DEBUG] Invalid response structure from API, using demo products');
                console.warn('[DEBUG] Response was:', response);
                console.log('[DEBUG] Switching to demo mode...');
                this.state.products = this.getDemoProducts();
                console.log('[DEBUG] Demo products loaded:', this.state.products.length, 'products');
            }
        } catch (error) {
            console.error('[DEBUG] Failed to load products:', error);
            console.error('[DEBUG] Error details:', error.message);
            console.error('[DEBUG] Error stack:', error.stack);
            console.log('[DEBUG] Falling back to demo products due to error');
            // Use demo products
            this.state.products = this.getDemoProducts();
            console.log('[DEBUG] Demo products loaded after error:', this.state.products.length, 'products');
        }
        
        console.log('[DEBUG] Final products state:', this.state.products);
        console.log('[DEBUG] Products count in state:', this.state.products.length);
        console.log('[DEBUG] First product:', this.state.products[0]);
    }

    async loadCategories() {
        const categories = [...new Set(this.state.products.map(p => p.category))];
        this.state.categories = ['All Products', ...categories];
    }

    applySettings() {
        console.log('[DEBUG] applySettings() - Function start');
        console.log('[DEBUG] applySettings() - Current settings:', this.state.settings);
        
        const { shopName, shopTagline, logoEmoji } = this.state.settings;
        console.log('[DEBUG] applySettings() - Extracted values:', { shopName, shopTagline, logoEmoji });
        
        const shopNameEl = document.getElementById('shopName');
        const shopTaglineEl = document.getElementById('shopTagline');
        
        console.log('[DEBUG] applySettings() - DOM elements found:', {
            shopNameEl: !!shopNameEl,
            shopTaglineEl: !!shopTaglineEl
        });
        
        if (shopNameEl) {
            shopNameEl.textContent = shopName;
            console.log('[DEBUG] applySettings() - Updated shop name in DOM');
        } else {
            console.warn('[DEBUG] applySettings() - Shop name element not found');
        }
        
        if (shopTaglineEl) {
            shopTaglineEl.textContent = shopTagline;
            console.log('[DEBUG] applySettings() - Updated shop tagline in DOM');
        } else {
            console.warn('[DEBUG] applySettings() - Shop tagline element not found');
        }
        
        const logoElements = document.querySelectorAll('.shop-logo, .logo');
        console.log(`[DEBUG] applySettings() - Found ${logoElements.length} logo elements`);
        logoElements.forEach((el, index) => {
            el.textContent = logoEmoji;
            console.log(`[DEBUG] applySettings() - Updated logo element ${index + 1}`);
        });
        
        const newTitle = `${shopName} POS`;
        document.title = newTitle;
        console.log('[DEBUG] applySettings() - Updated page title:', newTitle);
        
        console.log('[DEBUG] applySettings() - Function completed');
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
        console.log('[DEBUG] Rendering products...');
        console.log('[DEBUG] Function called with filtered products:', filteredProducts ? filteredProducts.length : 'null');
        
        const container = document.getElementById('productsGrid');
        console.log('[DEBUG] Products Grid Container:', container);
        console.log('[DEBUG] Container exists:', !!container);
        console.log('[DEBUG] Container innerHTML before:', container ? container.innerHTML.length : 'N/A');
        
        const products = filteredProducts || this.state.products;
        console.log('[DEBUG] Products to render:', products.length);
        console.log('[DEBUG] Products data:', products);
        console.log('[DEBUG] Using filtered products:', !!filteredProducts);
        console.log('[DEBUG] State products count:', this.state.products.length);
        
        if (products.length === 0) {
            console.warn('[DEBUG] No products to display');
            console.warn('[DEBUG] State products:', this.state.products);
            console.warn('[DEBUG] Filtered products:', filteredProducts);
            if (container) {
                container.innerHTML = '<div class="product-loading"><p>No products found</p></div>';
                console.log('[DEBUG] Set "No products found" message');
            }
            return;
        }
        
        console.log('[DEBUG] Creating product cards...');
        const productCards = products.map((product, index) => {
            console.log(`[DEBUG] Creating card ${index + 1} for product:`, product.id, product.name);
            const card = this.createProductCard(product);
            console.log(`[DEBUG] Card ${index + 1} HTML length:`, card.length);
            return card;
        });
        console.log('[DEBUG] Generated product cards:', productCards.length);
        console.log('[DEBUG] Total HTML length:', productCards.join('').length);
        
        if (container) {
            container.innerHTML = productCards.join('');
            console.log('[DEBUG] Products HTML updated');
            console.log('[DEBUG] Container innerHTML after:', container.innerHTML.length);
        } else {
            console.error('[DEBUG] Container not found, cannot update HTML');
            return;
        }
        
        // Add click listeners
        const cardElements = container.querySelectorAll('.product-card');
        console.log('[DEBUG] Found product card elements:', cardElements.length);
        console.log('[DEBUG] Adding click listeners to', cardElements.length, 'product cards');
        
        cardElements.forEach((card, index) => {
            const productId = card.dataset.productId;
            console.log(`[DEBUG] Adding listener to card ${index + 1}:`, productId);
            console.log(`[DEBUG] Card ${index + 1} element:`, card.className);
            
            // Remove any existing listeners
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            newCard.addEventListener('click', (e) => {
                console.log('[DEBUG] Click detected on card:', productId);
                this.handleProductClick(e);
            });
            console.log(`[DEBUG] Listener added to card ${index + 1}`);
        });
        
        console.log('[DEBUG] Product rendering complete');
        console.log('[DEBUG] Final card count in DOM:', document.querySelectorAll('.product-card').length);
    }

    createProductCard(product) {
        const isOutOfStock = product.stock <= 0;
        const isLowStock = product.stock <= product.lowStockThreshold && product.stock > 0;
        
        return `
            <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product.id}">
                <div class="product-emoji">${product.image || '[COFFEE]'}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-description">${product.description || ''}</div>
                <div class="product-price">₱${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-stock ${isLowStock ? 'low-stock' : ''}">
                    Stock: ${product.stock} ${isLowStock ? '[LOW]' : ''}
                </div>
            </div>
        `;
    }

    handleProductClick(e) {
        console.log('[DEBUG] Product clicked!', e);
        console.log('[DEBUG] Event target:', e.target);
        console.log('[DEBUG] Event currentTarget:', e.currentTarget);
        console.log('[DEBUG] Event type:', e.type);
        
        const card = e.currentTarget;
        console.log('[DEBUG] Card element:', card);
        console.log('[DEBUG] Card classList:', card.classList);
        console.log('[DEBUG] Card dataset:', card.dataset);
        
        const productId = card.dataset.productId;
        console.log('[DEBUG] Product ID:', productId);
        console.log('[DEBUG] Product ID type:', typeof productId);
        
        if (!productId) {
            console.error('[DEBUG] No product ID found on card');
            console.error('[DEBUG] Card HTML:', card.outerHTML);
            this.showToast('Product ID not found', 'error');
            return;
        }
        
        console.log('[DEBUG] Searching for product in state...');
        console.log('[DEBUG] Current products state count:', this.state.products.length);
        console.log('[DEBUG] Product IDs in state:', this.state.products.map(p => p.id));
        
        const product = this.state.products.find(p => {
            console.log(`[DEBUG] Comparing '${p.id}' === '${productId}'`);
            return p.id === productId;
        });
        
        console.log('[DEBUG] Found product:', product);
        
        if (!product) {
            console.error('[DEBUG] Product not found for ID:', productId);
            console.error('[DEBUG] Available product IDs:', this.state.products.map(p => p.id));
            console.error('[DEBUG] Current products state:', this.state.products);
            this.showToast('Product not found', 'error');
            return;
        }
        
        console.log('[DEBUG] Product details:', {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            variants: product.variants
        });
        
        if (product.stock <= 0) {
            console.warn('[DEBUG] Product out of stock:', product.name);
            this.showToast('Product out of stock', 'warning');
            return;
        }
        
        console.log('[DEBUG] Product available, checking variants...');
        console.log('[DEBUG] Product variants:', product.variants);
        console.log('[DEBUG] Variants length:', product.variants ? product.variants.length : 'N/A');
        
        if (product.variants && product.variants.length > 0) {
            console.log('[DEBUG] Product has variants, showing modal');
            this.showVariantModal(product);
        } else {
            console.log('[DEBUG] Adding product directly to cart');
            this.addToCart(product, {}, 1);
        }
    }

    showVariantModal(product) {
        console.log('[DEBUG] showVariantModal() - Function start');
        console.log('[DEBUG] showVariantModal() - Product:', {
            id: product.id,
            name: product.name,
            variants: product.variants
        });
        
        const modal = document.getElementById('variantModal');
        const nameEl = document.getElementById('variantProductName');
        const variantsList = document.getElementById('variantsList');
        
        console.log('[DEBUG] showVariantModal() - Modal elements found:', {
            modal: !!modal,
            nameEl: !!nameEl,
            variantsList: !!variantsList
        });
        
        if (nameEl) {
            nameEl.textContent = product.name;
            console.log('[DEBUG] showVariantModal() - Set product name in modal:', product.name);
        }
        
        const variants = product.variants.split(',').map(v => v.trim());
        console.log('[DEBUG] showVariantModal() - Parsed variants:', variants);
        
        const variantHTML = variants.map((variant, index) => {
            const isFirst = index === 0;
            console.log(`[DEBUG] showVariantModal() - Creating variant option ${index + 1}: "${variant}" (selected: ${isFirst})`);
            return `
                <div class="variant-option ${isFirst ? 'selected' : ''}" data-variant="${variant}">
                    <input type="radio" name="variant" value="${variant}" ${isFirst ? 'checked' : ''}>
                    <span>${variant}</span>
                </div>
            `;
        }).join('');
        
        if (variantsList) {
            variantsList.innerHTML = variantHTML;
            console.log('[DEBUG] showVariantModal() - Variants HTML set in modal');
        }
        
        const variantOptions = variantsList.querySelectorAll('.variant-option');
        console.log(`[DEBUG] showVariantModal() - Adding click listeners to ${variantOptions.length} variant options`);
        
        variantOptions.forEach((option, index) => {
            option.addEventListener('click', () => {
                console.log(`[DEBUG] showVariantModal() - Variant option ${index + 1} clicked:`, option.dataset.variant);
                variantsList.querySelectorAll('.variant-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;
                console.log('[DEBUG] showVariantModal() - Updated variant selection:', option.dataset.variant);
            });
        });
        
        const quantityEl = document.getElementById('variantQuantity');
        if (quantityEl) {
            quantityEl.value = 1;
            console.log('[DEBUG] showVariantModal() - Reset quantity to 1');
        } else {
            console.warn('[DEBUG] showVariantModal() - Quantity element not found');
        }
        
        if (modal) {
            modal.dataset.productId = product.id;
            modal.classList.remove('hidden');
            console.log('[DEBUG] showVariantModal() - Modal shown with product ID:', product.id);
        } else {
            console.error('[DEBUG] showVariantModal() - Modal element not found!');
        }
        
        console.log('[DEBUG] showVariantModal() - Function end');
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
        console.log('[DEBUG] addToCart() - Function start');
        console.log('[DEBUG] addToCart() - Product details:', {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            options: options
        });
        
        const cartItemId = `${product.id}_${JSON.stringify(options)}`;
        console.log('[DEBUG] addToCart() - Generated cart item ID:', cartItemId);
        
        const existingItem = this.state.cart.find(item => item.id === cartItemId);
        console.log('[DEBUG] addToCart() - Existing item found:', !!existingItem);
        
        if (existingItem) {
            const oldQuantity = existingItem.quantity;
            existingItem.quantity += quantity;
            console.log(`[DEBUG] addToCart() - Updated existing item quantity: ${oldQuantity} -> ${existingItem.quantity}`);
        } else {
            const newItem = {
                id: cartItemId,
                productId: product.id,
                name: product.name,
                price: parseFloat(product.price),
                quantity,
                options,
                cost: parseFloat(product.cost || 0)
            };
            this.state.cart.push(newItem);
            console.log('[DEBUG] addToCart() - Added new item to cart:', newItem);
        }
        
        console.log('[DEBUG] addToCart() - Current cart state:', {
            totalItems: this.state.cart.length,
            totalQuantity: this.state.cart.reduce((sum, item) => sum + item.quantity, 0)
        });
        
        console.log('[DEBUG] addToCart() - Rendering cart UI');
        this.renderCart();
        console.log('[DEBUG] addToCart() - Updating cart summary');
        this.updateCartSummary();
        
        const toastMessage = `${product.name} added to cart`;
        console.log('[DEBUG] addToCart() - Showing success toast:', toastMessage);
        this.showToast(toastMessage, 'success');
        
        console.log('[DEBUG] addToCart() - Playing add-to-cart sound');
        this.playSound('add-to-cart');
        
        console.log('[DEBUG] addToCart() - Function end');
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
        console.log('[DEBUG] clearCart() - Function start');
        console.log('[DEBUG] clearCart() - Current cart items:', this.state.cart.length);
        
        const previousCartSize = this.state.cart.length;
        this.state.cart = [];
        console.log(`[DEBUG] clearCart() - Cart cleared: ${previousCartSize} -> ${this.state.cart.length} items`);
        
        console.log('[DEBUG] clearCart() - Re-rendering cart UI');
        this.renderCart();
        console.log('[DEBUG] clearCart() - Updating cart summary');
        this.updateCartSummary();
        
        console.log('[DEBUG] clearCart() - Showing cart cleared toast');
        this.showToast('Cart cleared', 'info');
        
        console.log('[DEBUG] clearCart() - Function end');
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
        console.log('[DEBUG] selectPaymentMethod() - Function start');
        console.log('[DEBUG] selectPaymentMethod() - Event target:', e.target);
        console.log('[DEBUG] selectPaymentMethod() - Previous payment method:', this.state.selectedPaymentMethod);
        
        const previousMethod = this.state.selectedPaymentMethod;
        const newMethod = e.target.dataset.method;
        
        console.log('[DEBUG] selectPaymentMethod() - New payment method:', newMethod);
        
        const paymentBtns = document.querySelectorAll('.payment-btn');
        console.log(`[DEBUG] selectPaymentMethod() - Found ${paymentBtns.length} payment buttons`);
        
        paymentBtns.forEach((btn, index) => {
            const wasActive = btn.classList.contains('active');
            btn.classList.remove('active');
            if (wasActive) {
                console.log(`[DEBUG] selectPaymentMethod() - Removed active class from button ${index + 1}`);
            }
        });
        
        e.target.classList.add('active');
        console.log('[DEBUG] selectPaymentMethod() - Added active class to selected button');
        
        this.state.selectedPaymentMethod = newMethod;
        console.log(`[DEBUG] selectPaymentMethod() - Payment method updated: ${previousMethod} -> ${newMethod}`);
        
        console.log('[DEBUG] selectPaymentMethod() - Function end');
    }

    async handleCheckout() {
        console.log('[DEBUG] handleCheckout() - Function start');
        console.log('[DEBUG] handleCheckout() - Cart state:', {
            itemCount: this.state.cart.length,
            items: this.state.cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity }))
        });
        console.log('[DEBUG] handleCheckout() - Payment method:', this.state.selectedPaymentMethod);
        
        if (this.state.cart.length === 0) {
            console.warn('[DEBUG] handleCheckout() - Cart is empty, aborting checkout');
            this.showToast('Cart is empty', 'warning');
            return;
        }
        
        console.log('[DEBUG] handleCheckout() - Showing loading overlay');
        this.showLoading(true);
        
        const startTime = performance.now();
        try {
            const subtotal = this.getCartSubtotal();
            const tax = this.getCartTax();
            const total = this.getCartTotal();
            
            const orderData = {
                items: this.state.cart,
                paymentMethod: this.state.selectedPaymentMethod,
                subtotal: subtotal,
                tax: tax,
                total: total,
                timestamp: new Date().toISOString()
            };
            
            console.log('[DEBUG] handleCheckout() - Order data prepared:', {
                itemCount: orderData.items.length,
                paymentMethod: orderData.paymentMethod,
                subtotal: orderData.subtotal,
                tax: orderData.tax,
                total: orderData.total,
                timestamp: orderData.timestamp
            });
            
            console.log('[DEBUG] handleCheckout() - Processing order via API');
            const response = await this.apiCall('/process-order', 'POST', orderData);
            console.log('[DEBUG] handleCheckout() - API response received:', {
                success: response.success,
                orderId: response.orderId,
                message: response.message
            });
            
            if (response.success) {
                const endTime = performance.now();
                console.log(`[DEBUG] handleCheckout() - Order processed successfully in ${(endTime - startTime).toFixed(2)}ms`);
                console.log('[DEBUG] handleCheckout() - Order ID:', response.orderId);
                
                this.showToast('Order completed successfully!', 'success');
                console.log('[DEBUG] handleCheckout() - Playing success sound');
                this.playSound('checkout-success');
                
                console.log('[DEBUG] handleCheckout() - Clearing cart after successful order');
                this.clearCart();
                
                // Print receipt if enabled
                if (this.state.settings.autoPrintReceipt) {
                    console.log('[DEBUG] handleCheckout() - Auto-print receipt enabled, printing...');
                    this.printReceipt(response.order);
                } else {
                    console.log('[DEBUG] handleCheckout() - Auto-print receipt disabled');
                }
                
                console.log('[DEBUG] handleCheckout() - Refreshing products to update stock');
                await this.loadProducts();
                this.renderProducts();
                console.log('[DEBUG] handleCheckout() - Products refreshed after checkout');
            } else {
                console.error('[DEBUG] handleCheckout() - Order processing failed:', response.message);
                this.showToast('Order failed. Please try again.', 'error');
            }
        } catch (error) {
            const endTime = performance.now();
            console.error('[DEBUG] handleCheckout() - Checkout error:', error);
            console.error('[DEBUG] handleCheckout() - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            console.log(`[DEBUG] handleCheckout() - Error occurred after ${(endTime - startTime).toFixed(2)}ms`);
            this.showToast('Checkout failed. Please try again.', 'error');
        } finally {
            console.log('[DEBUG] handleCheckout() - Hiding loading overlay');
            this.showLoading(false);
            console.log('[DEBUG] handleCheckout() - Function end');
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
        console.log('[DEBUG] filterByCategory() - Function start');
        console.log('[DEBUG] filterByCategory() - Event target:', e.target.textContent);
        
        const category = e.target.dataset.category;
        console.log('[DEBUG] filterByCategory() - Selected category:', category);
        console.log('[DEBUG] filterByCategory() - Total products in state:', this.state.products.length);
        
        const categoryBtns = document.querySelectorAll('.category-btn');
        console.log(`[DEBUG] filterByCategory() - Found ${categoryBtns.length} category buttons`);
        
        categoryBtns.forEach((btn, index) => {
            const wasActive = btn.classList.contains('active');
            btn.classList.remove('active');
            if (wasActive) {
                console.log(`[DEBUG] filterByCategory() - Removed active from button: ${btn.textContent}`);
            }
        });
        
        e.target.classList.add('active');
        console.log('[DEBUG] filterByCategory() - Set active category button:', e.target.textContent);
        
        if (category === 'all') {
            console.log('[DEBUG] filterByCategory() - Showing all products');
            this.renderProducts();
        } else {
            const filtered = this.state.products.filter(p => p.category === category);
            console.log(`[DEBUG] filterByCategory() - Filtered products for category "${category}": ${filtered.length} products`);
            console.log('[DEBUG] filterByCategory() - Filtered product names:', filtered.map(p => p.name));
            this.renderProducts(filtered);
        }
        
        console.log('[DEBUG] filterByCategory() - Function end');
    }

    handleProductSearch(e) {
        console.log('[DEBUG] handleProductSearch() - Function start');
        
        const query = e.target.value.toLowerCase().trim();
        console.log('[DEBUG] handleProductSearch() - Search query:', `"${query}"`);
        console.log('[DEBUG] handleProductSearch() - Query length:', query.length);
        console.log('[DEBUG] handleProductSearch() - Total products to search:', this.state.products.length);
        
        if (query === '') {
            console.log('[DEBUG] handleProductSearch() - Empty query, showing all products');
            this.renderProducts();
            return;
        }
        
        const filtered = this.state.products.filter(product => {
            const nameMatch = product.name.toLowerCase().includes(query);
            const descMatch = product.description.toLowerCase().includes(query);
            const categoryMatch = product.category.toLowerCase().includes(query);
            const matches = nameMatch || descMatch || categoryMatch;
            
            if (matches) {
                console.log(`[DEBUG] handleProductSearch() - Match found: "${product.name}" (name:${nameMatch}, desc:${descMatch}, cat:${categoryMatch})`);
            }
            
            return matches;
        });
        
        console.log(`[DEBUG] handleProductSearch() - Search results: ${filtered.length} products matched`);
        console.log('[DEBUG] handleProductSearch() - Matched product names:', filtered.map(p => p.name));
        
        this.renderProducts(filtered);
        
        console.log('[DEBUG] handleProductSearch() - Function end');
    }

    toggleAdminDashboard() {
        console.log('[DEBUG] toggleAdminDashboard() - Function start');
        
        const dashboard = document.getElementById('adminDashboard');
        if (!dashboard) {
            console.error('[DEBUG] toggleAdminDashboard() - Admin dashboard element not found');
            return;
        }
        
        const wasHidden = dashboard.classList.contains('hidden');
        console.log('[DEBUG] toggleAdminDashboard() - Dashboard was hidden:', wasHidden);
        
        dashboard.classList.remove('hidden');
        console.log('[DEBUG] toggleAdminDashboard() - Dashboard shown');
        
        console.log('[DEBUG] toggleAdminDashboard() - Loading dashboard data');
        this.loadDashboardData();
        
        console.log('[DEBUG] toggleAdminDashboard() - Function end');
    }

    closeAdminDashboard() {
        console.log('[DEBUG] closeAdminDashboard() - Function start');
        
        const dashboard = document.getElementById('adminDashboard');
        if (!dashboard) {
            console.error('[DEBUG] closeAdminDashboard() - Admin dashboard element not found');
            return;
        }
        
        const wasVisible = !dashboard.classList.contains('hidden');
        dashboard.classList.add('hidden');
        
        if (wasVisible) {
            console.log('[DEBUG] closeAdminDashboard() - Dashboard closed');
        } else {
            console.log('[DEBUG] closeAdminDashboard() - Dashboard was already hidden');
        }
        
        console.log('[DEBUG] closeAdminDashboard() - Function end');
    }

    async loadDashboardData() {
        console.log('[DEBUG] loadDashboardData() - Function start');
        const startTime = performance.now();
        
        try {
            console.log('[DEBUG] loadDashboardData() - Fetching dashboard stats from API');
            const response = await this.apiCall('/dashboard-stats');
            
            console.log('[DEBUG] loadDashboardData() - API response received:', {
                success: response.success,
                hasStats: !!response.stats,
                hasChartData: !!response.chartData,
                hasAlerts: !!response.alerts
            });
            
            if (response.success) {
                const endTime = performance.now();
                console.log(`[DEBUG] loadDashboardData() - Processing dashboard data after ${(endTime - startTime).toFixed(2)}ms`);
                
                console.log('[DEBUG] loadDashboardData() - Updating dashboard stats');
                this.updateDashboardStats(response.stats);
                
                console.log('[DEBUG] loadDashboardData() - Rendering charts');
                this.renderCharts(response.chartData);
                
                console.log('[DEBUG] loadDashboardData() - Rendering stock alerts');
                this.renderStockAlerts(response.alerts);
                
                console.log('[DEBUG] loadDashboardData() - Dashboard data loaded successfully');
            } else {
                console.warn('[DEBUG] loadDashboardData() - API response unsuccessful, loading demo data');
                this.loadDemoDashboardData();
            }
        } catch (error) {
            const endTime = performance.now();
            console.error(`[DEBUG] loadDashboardData() - Failed to load dashboard data after ${(endTime - startTime).toFixed(2)}ms:`, error);
            console.error('[DEBUG] loadDashboardData() - Error details:', {
                name: error.name,
                message: error.message
            });
            console.log('[DEBUG] loadDashboardData() - Falling back to demo dashboard data');
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
                <div class="alert-icon">[WARNING]</div>
                <div class="alert-content">
                    <div class="alert-title">${alert.item}</div>
                    <div class="alert-message">Stock: ${alert.stock} (Threshold: ${alert.threshold})</div>
                </div>
            </div>
        `).join('');
    }

    closeModal() {
        console.log('[DEBUG] closeModal() - Function start');
        
        const modals = document.querySelectorAll('.modal');
        console.log(`[DEBUG] closeModal() - Found ${modals.length} modal elements`);
        
        modals.forEach((modal, index) => {
            const wasVisible = !modal.classList.contains('hidden');
            modal.classList.add('hidden');
            if (wasVisible) {
                console.log(`[DEBUG] closeModal() - Closed modal ${index + 1}:`, modal.id || 'unnamed');
            }
        });
        
        console.log('[DEBUG] closeModal() - All modals closed');
    }

    handleKeyboardShortcuts(e) {
        console.log('[DEBUG] handleKeyboardShortcuts() - Key pressed:', {
            key: e.key,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey
        });
        
        // Ctrl+F - Focus search
        if (e.ctrlKey && e.key === 'f') {
            console.log('[DEBUG] handleKeyboardShortcuts() - Ctrl+F shortcut triggered');
            e.preventDefault();
            const searchElement = document.getElementById('productSearch');
            if (searchElement) {
                searchElement.focus();
                console.log('[DEBUG] handleKeyboardShortcuts() - Product search focused');
            } else {
                console.warn('[DEBUG] handleKeyboardShortcuts() - Product search element not found');
            }
        }
        
        // Ctrl+Enter - Checkout
        if (e.ctrlKey && e.key === 'Enter') {
            console.log('[DEBUG] handleKeyboardShortcuts() - Ctrl+Enter shortcut triggered');
            e.preventDefault();
            const checkoutBtn = document.getElementById('checkoutBtn');
            if (checkoutBtn) {
                if (!checkoutBtn.disabled) {
                    console.log('[DEBUG] handleKeyboardShortcuts() - Initiating checkout via keyboard');
                    this.handleCheckout();
                } else {
                    console.log('[DEBUG] handleKeyboardShortcuts() - Checkout button disabled, ignoring shortcut');
                }
            } else {
                console.warn('[DEBUG] handleKeyboardShortcuts() - Checkout button not found');
            }
        }
        
        // Escape - Close modals
        if (e.key === 'Escape') {
            console.log('[DEBUG] handleKeyboardShortcuts() - Escape key pressed');
            console.log('[DEBUG] handleKeyboardShortcuts() - Closing modals and admin dashboard');
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
        console.log('[DEBUG] updateConnectionStatus() - Function start');
        console.log('[DEBUG] updateConnectionStatus() - New status:', isOnline ? 'Online' : 'Offline');
        console.log('[DEBUG] updateConnectionStatus() - Previous status:', this.state.isOnline ? 'Online' : 'Offline');
        
        const statusChanged = this.state.isOnline !== isOnline;
        this.state.isOnline = isOnline;
        
        if (statusChanged) {
            console.log('[DEBUG] updateConnectionStatus() - Connection status changed');
        }
        
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) {
            console.error('[DEBUG] updateConnectionStatus() - Connection status element not found');
            return;
        }
        
        const dotEl = statusEl.querySelector('.status-dot');
        const textEl = statusEl.querySelector('span:last-child');
        
        console.log('[DEBUG] updateConnectionStatus() - Status elements found:', {
            statusEl: !!statusEl,
            dotEl: !!dotEl,
            textEl: !!textEl
        });
        
        if (isOnline) {
            if (dotEl) dotEl.classList.add('online');
            if (textEl) textEl.textContent = 'Online';
            console.log('[DEBUG] updateConnectionStatus() - UI updated to online state');
        } else {
            if (dotEl) dotEl.classList.remove('online');
            if (textEl) textEl.textContent = 'Offline';
            console.log('[DEBUG] updateConnectionStatus() - UI updated to offline state');
        }
        
        console.log('[DEBUG] updateConnectionStatus() - Function end');
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
        console.log('[DEBUG] apiCall() - Function start');
        console.log('[DEBUG] apiCall() - Parameters:', {
            endpoint: endpoint,
            method: method,
            hasData: !!data,
            dataType: data ? typeof data : 'none'
        });
        
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        console.log('[DEBUG] apiCall() - Full URL:', url);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
            console.log('[DEBUG] apiCall() - Request body size:', options.body.length, 'characters');
            if (method !== 'POST' || !data.password) {
                console.log('[DEBUG] apiCall() - Request data:', data);
            } else {
                console.log('[DEBUG] apiCall() - Request data (password hidden):', { ...data, password: '[HIDDEN]' });
            }
        }
        
        const authData = localStorage.getItem('coffeepos_auth');
        if (authData) {
            try {
                const { token } = JSON.parse(authData);
                options.headers.Authorization = `Bearer ${token}`;
                console.log('[DEBUG] apiCall() - Authorization header added');
            } catch (error) {
                console.warn('[DEBUG] apiCall() - Failed to parse auth data:', error);
            }
        } else {
            console.log('[DEBUG] apiCall() - No auth data found');
        }
        
        console.log('[DEBUG] apiCall() - Final request options:', {
            method: options.method,
            headers: { ...options.headers, Authorization: options.headers.Authorization ? '[PRESENT]' : '[NONE]' },
            bodySize: options.body ? options.body.length : 0
        });
        
        const startTime = performance.now();
        try {
            console.log('[DEBUG] apiCall() - Making fetch request...');
            const response = await fetch(url, options);
            const endTime = performance.now();
            
            console.log(`[DEBUG] apiCall() - Response received in ${(endTime - startTime).toFixed(2)}ms`);
            console.log('[DEBUG] apiCall() - Response details:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (!response.ok) {
                console.error(`[DEBUG] apiCall() - HTTP error: ${response.status} ${response.statusText}`);
                throw new Error(`API call failed: ${response.status}`);
            }
            
            console.log('[DEBUG] apiCall() - Parsing JSON response...');
            const jsonData = await response.json();
            const totalTime = performance.now();
            
            console.log(`[DEBUG] apiCall() - JSON parsed successfully in ${(totalTime - startTime).toFixed(2)}ms total`);
            console.log('[DEBUG] apiCall() - Response data structure:', {
                type: typeof jsonData,
                hasSuccess: 'success' in jsonData,
                success: jsonData.success,
                keys: Object.keys(jsonData)
            });
            
            return jsonData;
        } catch (error) {
            const endTime = performance.now();
            console.error(`[DEBUG] apiCall() - Request failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
            console.error('[DEBUG] apiCall() - Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    showLoading(show) {
        console.log('[DEBUG] showLoading() - Function start');
        console.log('[DEBUG] showLoading() - Show loading:', show);
        
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            console.error('[DEBUG] showLoading() - Loading overlay element not found');
            return;
        }
        
        const wasVisible = !overlay.classList.contains('hidden');
        console.log('[DEBUG] showLoading() - Loading overlay was visible:', wasVisible);
        
        if (show) {
            overlay.classList.remove('hidden');
            if (!wasVisible) {
                console.log('[DEBUG] showLoading() - Loading overlay shown');
            }
        } else {
            overlay.classList.add('hidden');
            if (wasVisible) {
                console.log('[DEBUG] showLoading() - Loading overlay hidden');
            }
        }
        
        console.log('[DEBUG] showLoading() - Function end');
    }

    showToast(message, type = 'info', duration = 3000) {
        console.log('[DEBUG] showToast() - Function start');
        console.log('[DEBUG] showToast() - Parameters:', {
            message: message,
            type: type,
            duration: duration
        });
        
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.error('[DEBUG] showToast() - Toast container not found!');
            return;
        }
        
        console.log('[DEBUG] showToast() - Creating toast element');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const toastTitle = this.getToastTitle(type);
        console.log('[DEBUG] showToast() - Toast title:', toastTitle);
        
        toast.innerHTML = `
            <div class="toast-header">
                <div class="toast-title">${toastTitle}</div>
                <button class="toast-close">×</button>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        console.log('[DEBUG] showToast() - Adding toast to container');
        container.appendChild(toast);
        
        const currentToasts = container.children.length;
        console.log(`[DEBUG] showToast() - Total toasts now: ${currentToasts}`);
        
        console.log(`[DEBUG] showToast() - Setting auto-remove timer for ${duration}ms`);
        const autoRemoveTimer = setTimeout(() => {
            if (toast.parentNode) {
                console.log('[DEBUG] showToast() - Auto-removing toast after timeout');
                toast.remove();
            }
        }, duration);
        
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                console.log('[DEBUG] showToast() - Manual close button clicked');
                clearTimeout(autoRemoveTimer);
                if (toast.parentNode) {
                    toast.remove();
                }
            });
            console.log('[DEBUG] showToast() - Close button listener added');
        } else {
            console.warn('[DEBUG] showToast() - Close button not found in toast');
        }
        
        console.log('[DEBUG] showToast() - Toast creation completed');
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
        console.log('[DEBUG] playSound() - Function start');
        console.log('[DEBUG] playSound() - Sound type:', type);
        
        if (!this.audioContext) {
            try {
                console.log('[DEBUG] playSound() - Creating new AudioContext');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[DEBUG] playSound() - AudioContext created:', this.audioContext.state);
            } catch (error) {
                console.error('[DEBUG] playSound() - Failed to create AudioContext:', error);
                return;
            }
        }
        
        const frequencies = {
            'add-to-cart': 800,
            'checkout-success': 1000,
            'error': 300
        };
        
        const frequency = frequencies[type] || 600;
        console.log('[DEBUG] playSound() - Selected frequency:', frequency, 'Hz');
        
        try {
            console.log('[DEBUG] playSound() - Creating oscillator and gain nodes');
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            console.log('[DEBUG] playSound() - Oscillator configured');
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            console.log('[DEBUG] playSound() - Gain envelope configured');
            
            const startTime = this.audioContext.currentTime;
            const stopTime = startTime + 0.2;
            
            oscillator.start(startTime);
            oscillator.stop(stopTime);
            
            console.log(`[DEBUG] playSound() - Sound scheduled: ${startTime.toFixed(3)}s to ${stopTime.toFixed(3)}s`);
            console.log('[DEBUG] playSound() - Sound playback initiated successfully');
        } catch (error) {
            console.warn('[DEBUG] playSound() - Sound playback failed:', error);
            console.warn('[DEBUG] playSound() - Error details:', {
                name: error.name,
                message: error.message
            });
        }
        
        console.log('[DEBUG] playSound() - Function end');
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
        console.log('[DEBUG] Loading demo products...');
        console.log('[DEBUG] Demo mode activated');
        const demoProducts = [
            {
                id: 'espresso-single',
                name: 'Single Espresso',
                description: 'Rich, bold shot',
                price: 65,
                category: 'Coffee - Espresso',
                image: '[COFFEE]',
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
                image: '[COFFEE]',
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
                image: '[MILK]',
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
                image: '[COFFEE]',
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
                image: '[CHOCOLATE]',
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
                image: '[ICE]',
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
                image: '[ICE]',
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
                image: '[CHOCOLATE]',
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
                image: '[TEA]',
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
                image: '[PASTRY]',
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
                image: '[MUFFIN]',
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
                image: '[SANDWICH]',
                stock: 5,
                lowStockThreshold: 2,
                isActive: true,
                cost: 85.00,
                variants: 'Club,BLT,Grilled Cheese'
            }
        ];
        console.log('[DEBUG] Demo products created:', demoProducts.length, 'products');
        console.log('[DEBUG] First demo product:', demoProducts[0]);
        return demoProducts;
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