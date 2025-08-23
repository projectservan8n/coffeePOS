/**
 * Coffee Shop POS - Google Apps Script Backend
 * Makes all POS data editable in Google Sheets with real-time sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheets document
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Save and deploy as a web app
 * 5. Copy the web app URL to your n8n workflow
 */

// Configuration
const CONFIG = {
  SHEET_NAMES: {
    PRODUCTS: 'Products',
    SETTINGS: 'Settings',
    ORDERS: 'Orders',
    INGREDIENTS: 'Ingredients',
    SUPPLIERS: 'Suppliers',
    ANALYTICS: 'Analytics'
  },
  TIMEZONE: 'Asia/Manila'
};

/**
 * Main entry point for all API calls from n8n
 */
function doGet(e) {
  return doPost(e); // Handle both GET and POST requests
}

function doPost(e) {
  try {
    const endpoint = e.parameter.endpoint || e.parameters?.endpoint?.[0];
    
    if (!endpoint) {
      return createResponse(false, 'Missing endpoint parameter');
    }
    
    // Parse JSON body if present
    let requestData = {};
    if (e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        console.log('JSON parse error:', parseError);
      }
    }
    
    // Route to appropriate handler
    switch (endpoint) {
      case 'products':
        return getProducts();
      case 'settings':
        return getSettings();
      case 'process-order':
        return processOrder(requestData);
      case 'update-inventory':
        return updateInventory(requestData);
      case 'low-stock':
        return getLowStock();
      case 'analytics':
        return getAnalytics(e.parameter.period || '1d');
      case 'reset-daily-counters':
        return resetDailyCounters();
      case 'generate-purchase-order':
        return generatePurchaseOrder(requestData);
      default:
        return createResponse(false, `Unknown endpoint: ${endpoint}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Initialize all required sheets with proper structure
 */
function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Products sheet
  createProductsSheet(spreadsheet);
  
  // Create Settings sheet
  createSettingsSheet(spreadsheet);
  
  // Create Orders sheet
  createOrdersSheet(spreadsheet);
  
  // Create Ingredients sheet
  createIngredientsSheet(spreadsheet);
  
  // Create Suppliers sheet
  createSuppliersSheet(spreadsheet);
  
  // Create Analytics sheet
  createAnalyticsSheet(spreadsheet);
  
  console.log('All sheets initialized successfully!');
}

/**
 * Create Products sheet with sample data
 */
function createProductsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.PRODUCTS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.PRODUCTS);
  }
  
  // Clear existing data
  sheet.clear();
  
  // Headers
  const headers = [
    'ID', 'Name', 'Description', 'Price', 'Category', 'Image', 
    'Stock', 'LowStockThreshold', 'IsActive', 'Cost', 'Variants'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample products data
  const products = [
    ['espresso-single', 'Single Espresso', 'Rich, bold shot', 65, 'Coffee - Espresso', '☕', 50, 10, 'TRUE', 18.50, ''],
    ['americano', 'Americano', 'Espresso with hot water', 85, 'Coffee - Espresso', '☕', 45, 10, 'TRUE', 22.00, 'Regular,Large'],
    ['latte', 'Latte', 'Espresso with steamed milk', 120, 'Coffee - Milk Based', '🥛', 30, 10, 'TRUE', 35.50, 'Regular,Large,Decaf'],
    ['cappuccino', 'Cappuccino', 'Espresso with steamed milk foam', 115, 'Coffee - Milk Based', '☕', 25, 10, 'TRUE', 33.00, 'Regular,Large,Extra Foam'],
    ['mocha', 'Mocha', 'Chocolate espresso drink', 135, 'Coffee - Specialty', '🍫', 20, 5, 'TRUE', 42.00, 'Regular,Large,Extra Chocolate'],
    ['frappuccino', 'Frappuccino', 'Iced blended coffee drink', 150, 'Coffee - Cold', '🧊', 15, 5, 'TRUE', 45.00, 'Vanilla,Caramel,Mocha'],
    ['iced-coffee', 'Iced Coffee', 'Cold brew coffee', 95, 'Coffee - Cold', '🧊', 35, 10, 'TRUE', 28.00, 'Regular,Large,With Milk'],
    ['hot-chocolate', 'Hot Chocolate', 'Rich chocolate drink', 110, 'Non-Coffee', '🍫', 25, 5, 'TRUE', 35.00, 'Regular,Large,Extra Marshmallows'],
    ['chai-latte', 'Chai Latte', 'Spiced tea with milk', 125, 'Tea', '🍵', 20, 5, 'TRUE', 38.00, 'Regular,Large,Iced'],
    ['croissant', 'Butter Croissant', 'Fresh baked pastry', 75, 'Food', '🥐', 12, 3, 'TRUE', 25.00, ''],
    ['muffin', 'Blueberry Muffin', 'Homemade muffin', 85, 'Food', '🧁', 8, 2, 'TRUE', 30.00, 'Blueberry,Chocolate Chip,Banana'],
    ['sandwich', 'Club Sandwich', 'Fresh sandwich', 165, 'Food', '🥪', 5, 2, 'TRUE', 85.00, 'Club,BLT,Grilled Cheese']
  ];
  
  sheet.getRange(2, 1, products.length, products[0].length).setValues(products);
  
  // Format as table
  formatSheet(sheet, headers.length, products.length + 1);
}

/**
 * Create Settings sheet
 */
function createSettingsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.SETTINGS);
  }
  
  sheet.clear();
  
  const headers = ['Setting', 'Value', 'Description'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const settings = [
    ['shopName', 'Coffee Paradise', 'Name of your coffee shop'],
    ['shopTagline', 'Fresh Coffee Daily', 'Shop tagline/slogan'],
    ['logoEmoji', '☕', 'Emoji to use as logo'],
    ['currency', 'PHP', 'Currency symbol'],
    ['taxRate', '0.12', 'Tax rate (12% VAT in Philippines)'],
    ['lowStockThreshold', '10', 'Default low stock threshold'],
    ['enableIngredientTracking', 'TRUE', 'Track ingredient costs'],
    ['address', '123 Coffee Street, Manila', 'Shop address'],
    ['phone', '+63 917 123 4567', 'Shop phone number'],
    ['email', 'info@coffeeparadise.ph', 'Shop email'],
    ['ownerEmail', 'owner@coffeeparadise.ph', 'Owner email for notifications'],
    ['ownerPhone', '+63 917 123 4567', 'Owner phone for SMS alerts'],
    ['systemEmail', 'noreply@coffeeparadise.ph', 'System email for reports'],
    ['autoPrintReceipt', 'TRUE', 'Auto print receipts'],
    ['autoRefreshInterval', '30', 'Auto refresh interval (seconds)']
  ];
  
  sheet.getRange(2, 1, settings.length, settings[0].length).setValues(settings);
  formatSheet(sheet, headers.length, settings.length + 1);
}

/**
 * Create Orders sheet
 */
function createOrdersSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.ORDERS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.ORDERS);
  }
  
  sheet.clear();
  
  const headers = [
    'OrderID', 'Timestamp', 'Cashier', 'Items', 'Subtotal', 
    'Tax', 'Total', 'PaymentMethod', 'Status', 'Notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatSheet(sheet, headers.length, 1);
}

/**
 * Create Ingredients sheet
 */
function createIngredientsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.INGREDIENTS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.INGREDIENTS);
  }
  
  sheet.clear();
  
  const headers = [
    'ID', 'Name', 'Unit', 'Stock', 'LowStockThreshold', 
    'CostPerUnit', 'Supplier', 'LastRestocked'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample ingredients
  const ingredients = [
    ['coffee-beans', 'Coffee Beans', 'kg', 50, 10, 450, 'Coffee Supply Co', new Date()],
    ['whole-milk', 'Whole Milk', 'liters', 20, 5, 65, 'Fresh Dairy Inc', new Date()],
    ['sugar', 'Sugar', 'kg', 15, 3, 45, 'Sweet Supply', new Date()],
    ['chocolate-syrup', 'Chocolate Syrup', 'bottles', 8, 2, 125, 'Flavor Co', new Date()],
    ['paper-cups-12oz', '12oz Paper Cups', 'pieces', 500, 100, 2.5, 'Packaging Solutions', new Date()]
  ];
  
  sheet.getRange(2, 1, ingredients.length, ingredients[0].length).setValues(ingredients);
  formatSheet(sheet, headers.length, ingredients.length + 1);
}

/**
 * Create Suppliers sheet
 */
function createSuppliersSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.SUPPLIERS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.SUPPLIERS);
  }
  
  sheet.clear();
  
  const headers = ['Name', 'Contact', 'Email', 'Address', 'PaymentTerms', 'Notes'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const suppliers = [
    ['Coffee Supply Co', '+63 917 123 4567', 'orders@coffeesupply.ph', 'Quezon City', '30 days', 'Premium coffee beans'],
    ['Fresh Dairy Inc', '+63 917 234 5678', 'sales@freshdairy.ph', 'Laguna', '15 days', 'Fresh milk daily delivery'],
    ['Packaging Solutions', '+63 917 345 6789', 'info@packaging.ph', 'Makati', 'COD', 'Cups, lids, sleeves']
  ];
  
  sheet.getRange(2, 1, suppliers.length, suppliers[0].length).setValues(suppliers);
  formatSheet(sheet, headers.length, suppliers.length + 1);
}

/**
 * Create Analytics sheet
 */
function createAnalyticsSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.ANALYTICS);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.ANALYTICS);
  }
  
  sheet.clear();
  
  const headers = [
    'Date', 'TotalRevenue', 'TotalOrders', 'AvgOrderValue', 
    'TopProduct', 'ProfitMargin', 'CustomerCount'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample analytics data
  const today = new Date();
  const analytics = [
    [today, 15750, 42, 375, 'Latte', 68, 38],
    [new Date(today.getTime() - 86400000), 14200, 38, 374, 'Americano', 65, 35],
    [new Date(today.getTime() - 2*86400000), 16800, 45, 373, 'Cappuccino', 70, 41]
  ];
  
  sheet.getRange(2, 1, analytics.length, analytics[0].length).setValues(analytics);
  formatSheet(sheet, headers.length, analytics.length + 1);
}

/**
 * Format sheet as a proper table
 */
function formatSheet(sheet, numCols, numRows) {
  if (numRows <= 1) return;
  
  const range = sheet.getRange(1, 1, numRows, numCols);
  
  // Header formatting
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  
  // Data formatting
  if (numRows > 1) {
    const dataRange = sheet.getRange(2, 1, numRows - 1, numCols);
    dataRange.setBackground('#F8F9FA');
  }
  
  // Add borders
  range.setBorder(true, true, true, true, true, true);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, numCols);
}

/**
 * Get all products from the sheet
 */
function getProducts() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.PRODUCTS);
    if (!sheet) {
      return createResponse(false, 'Products sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const products = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Skip empty rows
        const product = {};
        headers.forEach((header, index) => {
          product[header.toLowerCase().replace(/\s+/g, '')] = row[index];
        });
        
        // Convert data types
        product.price = parseFloat(product.price) || 0;
        product.stock = parseInt(product.stock) || 0;
        product.lowstockthreshold = parseInt(product.lowstockthreshold) || 10;
        product.cost = parseFloat(product.cost) || 0;
        product.isactive = product.isactive === 'TRUE' || product.isactive === true;
        
        products.push(product);
      }
    }
    
    return createResponse(true, { products });
  } catch (error) {
    console.error('Get products error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Get settings from the sheet
 */
function getSettings() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
    if (!sheet) {
      return createResponse(false, 'Settings sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const settings = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        const key = row[0];
        let value = row[1];
        
        // Convert boolean strings
        if (value === 'TRUE') value = true;
        if (value === 'FALSE') value = false;
        
        // Convert numeric strings
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        
        settings[key] = value;
      }
    }
    
    return createResponse(true, { settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Process a new order
 */
function processOrder(orderData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.ORDERS);
    if (!sheet) {
      return createResponse(false, 'Orders sheet not found');
    }
    
    // Generate order ID if not provided
    const orderId = orderData.orderId || `ORD${Date.now()}`;
    
    // Prepare order data for sheet
    const orderRow = [
      orderId,
      new Date(),
      orderData.cashier || 'Unknown',
      JSON.stringify(orderData.items || []),
      orderData.subtotal || 0,
      orderData.tax || 0,
      orderData.total || 0,
      orderData.paymentMethod || 'cash',
      'completed',
      orderData.notes || ''
    ];
    
    // Add to sheet
    sheet.appendRow(orderRow);
    
    // Update inventory (reduce stock)
    updateProductStock(orderData.items || []);
    
    // Update analytics
    updateAnalytics(orderData);
    
    return createResponse(true, { 
      orderId,
      message: 'Order processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Process order error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Update product stock levels
 */
function updateProductStock(items) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.PRODUCTS);
    const data = sheet.getDataRange().getValues();
    
    items.forEach(item => {
      // Find product by ID
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === item.productId) {
          const currentStock = parseInt(data[i][6]) || 0;
          const newStock = Math.max(0, currentStock - (item.quantity || 0));
          sheet.getRange(i + 1, 7).setValue(newStock);
          break;
        }
      }
    });
  } catch (error) {
    console.error('Update product stock error:', error);
  }
}

/**
 * Update inventory manually
 */
function updateInventory(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.PRODUCTS);
    const sheetData = sheet.getDataRange().getValues();
    
    // Find product by ID
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === data.productId) {
        sheet.getRange(i + 1, 7).setValue(data.newStock);
        return createResponse(true, 'Inventory updated successfully');
      }
    }
    
    return createResponse(false, 'Product not found');
  } catch (error) {
    console.error('Update inventory error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Get low stock items
 */
function getLowStock() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.PRODUCTS);
    const data = sheet.getDataRange().getValues();
    const lowStockItems = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const stock = parseInt(row[6]) || 0;
      const threshold = parseInt(row[7]) || 10;
      
      if (stock <= threshold && row[8] === 'TRUE') { // Only active products
        lowStockItems.push({
          type: 'product',
          name: row[1],
          stock: stock,
          threshold: threshold,
          category: row[4]
        });
      }
    }
    
    return createResponse(true, { lowStockItems });
  } catch (error) {
    console.error('Get low stock error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Update daily analytics
 */
function updateAnalytics(orderData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.ANALYTICS);
    const today = new Date().toDateString();
    const data = sheet.getDataRange().getValues();
    
    let todayRow = -1;
    
    // Find today's row
    for (let i = 1; i < data.length; i++) {
      if (new Date(data[i][0]).toDateString() === today) {
        todayRow = i;
        break;
      }
    }
    
    if (todayRow === -1) {
      // Create new row for today
      const newRow = [
        new Date(),
        orderData.total || 0,
        1,
        orderData.total || 0,
        getMostOrderedProduct(orderData.items || []),
        calculateProfitMargin(orderData),
        1
      ];
      sheet.appendRow(newRow);
    } else {
      // Update existing row
      const currentRevenue = parseFloat(data[todayRow][1]) || 0;
      const currentOrders = parseInt(data[todayRow][2]) || 0;
      const currentCustomers = parseInt(data[todayRow][6]) || 0;
      
      const newRevenue = currentRevenue + (orderData.total || 0);
      const newOrders = currentOrders + 1;
      const newCustomers = currentCustomers + 1;
      const newAvgOrder = newRevenue / newOrders;
      
      sheet.getRange(todayRow + 1, 2, 1, 5).setValues([[
        newRevenue,
        newOrders,
        newAvgOrder,
        getMostOrderedProduct(orderData.items || []),
        calculateProfitMargin(orderData)
      ]]);
      
      sheet.getRange(todayRow + 1, 7).setValue(newCustomers);
    }
  } catch (error) {
    console.error('Update analytics error:', error);
  }
}

/**
 * Get analytics data
 */
function getAnalytics(period = '1d') {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.ANALYTICS);
    const data = sheet.getDataRange().getValues();
    
    const days = period === '7d' ? 7 : 1;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalProfit = 0;
    const productCounts = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const date = new Date(row[0]);
      
      if (date >= cutoffDate) {
        totalRevenue += parseFloat(row[1]) || 0;
        totalOrders += parseInt(row[2]) || 0;
        const profit = parseFloat(row[5]) || 0;
        totalProfit += (totalRevenue * profit / 100);
        
        // Count top products (simplified)
        if (row[4]) {
          productCounts[row[4]] = (productCounts[row[4]] || 0) + 1;
        }
      }
    }
    
    // Get top products
    const topProducts = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
    
    return createResponse(true, {
      analytics: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        topProducts,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        totalProfit
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Helper functions
 */
function getMostOrderedProduct(items) {
  if (!items || items.length === 0) return 'N/A';
  
  const counts = {};
  items.forEach(item => {
    counts[item.name] = (counts[item.name] || 0) + item.quantity;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function calculateProfitMargin(orderData) {
  if (!orderData.items) return 0;
  
  const totalCost = orderData.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const revenue = orderData.subtotal || 0;
  
  return revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
}

function resetDailyCounters() {
  return createResponse(true, { message: 'Daily counters reset' });
}

function generatePurchaseOrder(data) {
  return createResponse(true, { 
    orderId: data.orderId || `PO${Date.now()}`,
    message: 'Purchase order generated'
  });
}

function createResponse(success, data, message = null) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success,
      data: typeof data === 'string' ? { message: data } : data,
      message: message || (success ? 'Success' : 'Error'),
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle OPTIONS requests for CORS
 */
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}