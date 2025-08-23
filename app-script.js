/**
 * Coffee Shop POS - Google Sheets Template Generator
 * Creates and formats all necessary sheets for n8n workflow integration
 * 
 * Features:
 * - Automated sheet creation with proper headers
 * - Sample data population for immediate testing
 * - Philippines-specific business logic and formatting
 * - Compatible with n8n workflow requirements
 * 
 * Instructions:
 * 1. Create a new Google Sheets document
 * 2. Open Script Editor (Extensions > Apps Script)
 * 3. Paste this code and save
 * 4. Run initializeCoffeePOSTemplate() function
 * 5. Copy the Google Sheets ID for your n8n workflow
 */

// Configuration Constants
const CONFIG = {
  // Shop Settings
  SHOP_NAME: 'Coffee Paradise',
  CURRENCY: 'PHP',
  TAX_RATE: 0.12,
  TIMEZONE: 'Asia/Manila',
  
  // Business Logic
  COST_ANALYSIS_ENABLED: true,
  INGREDIENT_TRACKING_ENABLED: true,
  
  // Sheet Names - MUST MATCH n8n workflow expectations
  SHEETS: {
    SETTINGS: 'Settings',
    PRODUCTS: 'Products', 
    INGREDIENTS: 'Ingredients',
    RECIPES: 'Recipes',
    SUPPLIERS: 'Suppliers',
    ORDERS: 'Orders',
    INGREDIENT_USAGE_LOG: 'Ingredient_Usage_Log',
    COST_ANALYSIS: 'Cost_Analysis',
    PURCHASE_ORDERS: 'Purchase_Orders',
    PURCHASE_ORDER_ITEMS: 'Purchase_Order_Items'
  }
};

/**
 * Main function to initialize Coffee POS Google Sheets Template
 * Creates all necessary sheets with proper structure for n8n integration
 */
function initializeCoffeePOSTemplate() {
  console.log('🚀 Initializing Coffee POS Google Sheets Template...');
  
  try {
    // Get current spreadsheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // Rename the spreadsheet
    spreadsheet.setName(`${CONFIG.SHOP_NAME} POS System`);
    
    // Create all necessary sheets
    createRequiredSheets();
    
    // Setup sample data
    setupSampleData();
    
    // Format sheets for better UX
    formatAllSheets();
    
    // Create documentation sheet
    createDocumentationSheet();
    
    console.log('✅ Coffee POS Template initialized successfully!');
    
    // Show completion message with next steps
    showCompletionDialog();
    
    return { 
      success: true, 
      message: 'Template created successfully',
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl()
    };
    
  } catch (error) {
    console.error('❌ Template initialization failed:', error);
    Browser.msgBox('Error', 'Template initialization failed: ' + error.message, Browser.Buttons.OK);
    return { success: false, error: error.message };
  }
}

/**
 * Create all required sheets with proper headers for n8n integration
 */
function createRequiredSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  console.log('📋 Creating required sheets...');
  
  // Settings Sheet - Key-value configuration
  createOrUpdateSheet(CONFIG.SHEETS.SETTINGS, [
    ['Setting', 'Value', 'Description', 'Type'],
    ['shopName', CONFIG.SHOP_NAME, 'Shop display name', 'string'],
    ['shopTagline', 'Fresh Coffee Daily', 'Shop tagline', 'string'],
    ['logoEmoji', '☕', 'Shop logo emoji', 'string'],
    ['currency', CONFIG.CURRENCY, 'Currency code', 'string'],
    ['taxRate', CONFIG.TAX_RATE, 'Tax rate (decimal)', 'number'],
    ['lowStockThreshold', 10, 'Default low stock threshold', 'number'],
    ['enableIngredientTracking', true, 'Enable advanced ingredient tracking', 'boolean'],
    ['ingredientAlertDays', 3, 'Days ahead for ingredient alerts', 'number'],
    ['autoReorderEnabled', false, 'Enable automatic reordering', 'boolean'],
    ['address', '123 Coffee Street, Manila, Philippines', 'Shop address', 'string'],
    ['phone', '+63 917 123 4567', 'Shop phone number', 'string'],
    ['email', 'info@coffeeparadise.ph', 'Shop email address', 'string'],
    ['managerEmail', 'manager@coffeeparadise.ph', 'Manager email for alerts', 'string'],
    ['lastModified', new Date(), 'Last modification timestamp', 'datetime']
  ]);
  
  // Products Sheet - Core product catalog
  createOrUpdateSheet(CONFIG.SHEETS.PRODUCTS, [
    ['id', 'name', 'description', 'price', 'category', 'image', 'imageUrl', 'stock', 'lowStockThreshold', 'sku', 'isActive', 'recipeId', 'servingSize', 'variants', 'allergens', 'preparationTime', 'cost', 'lastModified']
  ]);
  
  // Ingredients Sheet - Advanced ingredient tracking
  createOrUpdateSheet(CONFIG.SHEETS.INGREDIENTS, [
    ['ingredientId', 'name', 'description', 'unit', 'currentStock', 'lowStockThreshold', 'costPerUnit', 'supplierId', 'lastRestocked', 'expirationDays', 'storageLocation', 'isActive', 'lastModified']
  ]);
  
  // Recipes Sheet - Product-ingredient relationships
  createOrUpdateSheet(CONFIG.SHEETS.RECIPES, [
    ['recipeId', 'productName', 'ingredientId', 'ingredientName', 'quantityUsed', 'unit', 'notes', 'isOptional', 'lastModified']
  ]);
  
  // Suppliers Sheet - Vendor management
  createOrUpdateSheet(CONFIG.SHEETS.SUPPLIERS, [
    ['supplierId', 'name', 'contactPerson', 'phone', 'email', 'address', 'paymentTerms', 'deliveryDays', 'minimumOrder', 'specialties', 'isActive', 'notes', 'lastModified']
  ]);
  
  // Orders Sheet - Transaction records (n8n will write here)
  createOrUpdateSheet(CONFIG.SHEETS.ORDERS, [
    ['orderId', 'timestamp', 'items', 'subtotal', 'tax', 'total', 'paymentMethod', 'customerInfo', 'status', 'currency', 'ingredientCost', 'cashier', 'location', 'deviceInfo', 'lastModified']
  ]);
  
  // Ingredient Usage Log - Advanced tracking
  createOrUpdateSheet(CONFIG.SHEETS.INGREDIENT_USAGE_LOG, [
    ['timestamp', 'orderId', 'productId', 'productName', 'ingredientId', 'ingredientName', 'quantityUsed', 'unit', 'remainingStock', 'costOfIngredients', 'batchId']
  ]);
  
  // Cost Analysis Sheet - Profitability tracking
  createOrUpdateSheet(CONFIG.SHEETS.COST_ANALYSIS, [
    ['productId', 'productName', 'sellingPrice', 'ingredientCost', 'profitMargin', 'profitPercentage', 'recommendedPrice', 'totalSoldToday', 'profitToday', 'totalSoldWeek', 'profitWeek', 'totalSoldMonth', 'profitMonth', 'lastUpdated']
  ]);
  
  // Purchase Orders Sheet - Supplier order management
  createOrUpdateSheet(CONFIG.SHEETS.PURCHASE_ORDERS, [
    ['orderId', 'supplierId', 'supplierName', 'orderDate', 'expectedDelivery', 'actualDelivery', 'status', 'totalAmount', 'createdBy', 'approvedBy', 'notes', 'lastModified']
  ]);
  
  // Purchase Order Items Sheet - Detailed order items
  createOrUpdateSheet(CONFIG.SHEETS.PURCHASE_ORDER_ITEMS, [
    ['orderId', 'ingredientId', 'ingredientName', 'quantityOrdered', 'quantityReceived', 'unit', 'pricePerUnit', 'totalPrice', 'urgencyLevel', 'notes', 'lastModified']
  ]);
  
  console.log('✅ All sheets created successfully');
}

/**
 * Create or update a sheet with headers and formatting
 */
function createOrUpdateSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    console.log(`✅ Created sheet: ${sheetName}`);
  }
  
  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, headers.length, headers[0].length).setValues(headers);
    
    // Format headers with Coffee theme
    const headerRange = sheet.getRange(1, 1, 1, headers[0].length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#8B4513'); // Coffee brown
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontSize(11);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers[0].length);
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
}

/**
 * Setup comprehensive sample data for immediate testing
 */
function setupSampleData() {
  if (!isSheetEmpty(CONFIG.SHEETS.PRODUCTS)) {
    console.log('📊 Sample data already exists, skipping...');
    return;
  }
  
  console.log('📊 Setting up comprehensive sample data...');
  
  // Sample Products - Philippines coffee shop typical items
  const sampleProducts = [
    ['espresso-single', 'Single Espresso', 'Rich, bold shot of premium espresso', 65, 'Coffee - Espresso', '☕', '', 50, 10, 'ESP-SGL', true, 'RCP-ESP', '1 shot', '', 'None', 2, 18.50, new Date()],
    ['americano', 'Americano', 'Espresso with hot water', 85, 'Coffee - Espresso', '☕', '', 45, 10, 'AME-REG', true, 'RCP-AME', '1 cup', 'Regular,Large', 'None', 3, 22.00, new Date()],
    ['latte', 'Café Latte', 'Espresso with steamed milk and foam', 120, 'Coffee - Milk Based', '🥛', '', 30, 10, 'LAT-REG', true, 'RCP-LAT', '1 cup', 'Regular,Large,Decaf,Oat Milk', 'Milk', 4, 35.50, new Date()],
    ['cappuccino', 'Cappuccino', 'Perfect balance of espresso, steamed milk and foam', 115, 'Coffee - Milk Based', '☕', '', 25, 10, 'CAP-REG', true, 'RCP-CAP', '1 cup', 'Regular,Large,Dry', 'Milk', 4, 33.00, new Date()],
    ['mocha', 'Café Mocha', 'Chocolate espresso drink with whipped cream', 135, 'Coffee - Specialty', '🍫', '', 20, 5, 'MOC-REG', true, 'RCP-MOC', '1 cup', 'Regular,Large,Dark Chocolate', 'Milk,Chocolate', 5, 42.00, new Date()],
    ['frappuccino', 'Iced Frappuccino', 'Blended iced coffee drink', 150, 'Coffee - Cold', '🧊', '', 15, 5, 'FRA-REG', true, 'RCP-FRA', '1 cup', 'Vanilla,Caramel,Mocha,Coffee', 'Milk', 6, 45.00, new Date()],
    ['iced-coffee', 'Iced Coffee', 'Cold brew served over ice', 95, 'Coffee - Cold', '🧊', '', 35, 10, 'ICE-COF', true, 'RCP-ICE', '1 cup', 'Black,With Milk,Sweet', 'None', 3, 28.00, new Date()],
    ['hot-chocolate', 'Hot Chocolate', 'Rich Belgian chocolate drink', 110, 'Non-Coffee', '🍫', '', 25, 5, 'HOT-CHO', true, 'RCP-CHO', '1 cup', 'Regular,Dark,White Chocolate', 'Milk,Chocolate', 4, 35.00, new Date()],
    ['chai-latte', 'Chai Tea Latte', 'Spiced tea blend with steamed milk', 125, 'Tea', '🍵', '', 20, 5, 'CHI-LAT', true, 'RCP-CHI', '1 cup', 'Regular,Iced,Extra Spice', 'Milk,Spices', 4, 38.00, new Date()],
    ['matcha-latte', 'Matcha Latte', 'Premium Japanese green tea with milk', 140, 'Tea', '🍵', '', 15, 3, 'MAT-LAT', true, 'RCP-MAT', '1 cup', 'Regular,Iced,Sugar-free', 'Milk', 4, 48.00, new Date()],
    ['croissant', 'Butter Croissant', 'Fresh baked buttery pastry', 75, 'Food - Pastry', '🥐', '', 12, 3, 'CRO-BUT', true, '', '1 piece', 'Plain,Almond,Chocolate', 'Gluten,Dairy', 0, 25.00, new Date()],
    ['muffin-blueberry', 'Blueberry Muffin', 'Homemade muffin with fresh blueberries', 85, 'Food - Pastry', '🧁', '', 8, 2, 'MUF-BLU', true, '', '1 piece', 'Blueberry,Chocolate Chip,Banana Walnut', 'Gluten,Dairy,Eggs', 0, 30.00, new Date()],
    ['sandwich-club', 'Club Sandwich', 'Triple-decker with chicken, bacon & vegetables', 165, 'Food - Sandwiches', '🥪', '', 5, 2, 'SAN-CLB', true, '', '1 piece', 'Club,BLT,Grilled Cheese,Tuna', 'Gluten,Dairy', 0, 85.00, new Date()],
    ['salad-caesar', 'Caesar Salad', 'Fresh romaine with caesar dressing', 145, 'Food - Salads', '🥗', '', 8, 2, 'SAL-CAE', true, '', '1 bowl', 'Regular,Chicken,Shrimp', 'Dairy,Eggs', 0, 65.00, new Date()],
    ['water-bottle', 'Bottled Water', 'Premium spring water', 25, 'Beverages - Non-Coffee', '💧', '', 50, 10, 'WAT-BOT', true, '', '500ml', 'Still,Sparkling', 'None', 0, 8.00, new Date()]
  ];
  
  addDataToSheet(CONFIG.SHEETS.PRODUCTS, sampleProducts);
  
  // Sample Ingredients for advanced tracking
  const sampleIngredients = [
    ['coffee-beans-arabica', 'Arabica Coffee Beans', 'Premium single-origin arabica beans', 'grams', 5000, 500, 0.03, 'SUP001', new Date(), 30, 'Storage Room - Dry', true, new Date()],
    ['coffee-beans-robusta', 'Robusta Coffee Beans', 'Strong robusta blend for espresso', 'grams', 3000, 300, 0.025, 'SUP001', new Date(), 30, 'Storage Room - Dry', true, new Date()],
    ['whole-milk', 'Whole Milk', 'Fresh dairy milk 3.25%', 'ml', 2000, 200, 0.002, 'SUP002', new Date(), 7, 'Refrigerator', true, new Date()],
    ['oat-milk', 'Oat Milk', 'Plant-based oat milk alternative', 'ml', 1000, 100, 0.004, 'SUP002', new Date(), 14, 'Refrigerator', true, new Date()],
    ['chocolate-syrup', 'Chocolate Syrup', 'Premium Belgian chocolate syrup', 'ml', 1000, 100, 0.05, 'SUP001', new Date(), 90, 'Storage Room', true, new Date()],
    ['vanilla-syrup', 'Vanilla Syrup', 'Natural vanilla flavoring syrup', 'ml', 800, 80, 0.045, 'SUP001', new Date(), 90, 'Storage Room', true, new Date()],
    ['caramel-syrup', 'Caramel Syrup', 'Rich caramel flavoring syrup', 'ml', 800, 80, 0.045, 'SUP001', new Date(), 90, 'Storage Room', true, new Date()],
    ['whipped-cream', 'Whipped Cream', 'Fresh whipped cream', 'ml', 500, 50, 0.008, 'SUP002', new Date(), 5, 'Refrigerator', true, new Date()],
    ['disposable-cups-12oz', '12oz Paper Cups', 'Eco-friendly disposable cups', 'pieces', 500, 50, 3.00, 'SUP003', new Date(), 365, 'Storage Room', true, new Date()],
    ['disposable-cups-16oz', '16oz Paper Cups', 'Large eco-friendly cups', 'pieces', 300, 30, 3.50, 'SUP003', new Date(), 365, 'Storage Room', true, new Date()],
    ['cup-lids', 'Cup Lids', 'Plastic lids for takeaway cups', 'pieces', 800, 80, 0.50, 'SUP003', new Date(), 365, 'Storage Room', true, new Date()],
    ['sugar-white', 'White Sugar', 'Fine granulated white sugar', 'grams', 2000, 200, 0.001, 'SUP001', new Date(), 180, 'Storage Room - Dry', true, new Date()],
    ['sugar-brown', 'Brown Sugar', 'Raw brown sugar', 'grams', 1500, 150, 0.0012, 'SUP001', new Date(), 180, 'Storage Room - Dry', true, new Date()],
    ['sweetener-stevia', 'Stevia Sweetener', 'Natural stevia packets', 'pieces', 200, 20, 0.25, 'SUP001', new Date(), 365, 'Storage Room - Dry', true, new Date()],
    ['matcha-powder', 'Matcha Powder', 'Premium Japanese matcha powder', 'grams', 200, 20, 0.15, 'SUP004', new Date(), 365, 'Storage Room - Dry', true, new Date()]
  ];
  
  addDataToSheet(CONFIG.SHEETS.INGREDIENTS, sampleIngredients);
  
  // Sample Recipes - Product to ingredient mapping
  const sampleRecipes = [
    ['RCP-ESP', 'Single Espresso', 'coffee-beans-arabica', 'Arabica Coffee Beans', 18, 'grams', 'Double shot extraction', false, new Date()],
    ['RCP-ESP', 'Single Espresso', 'disposable-cups-12oz', '12oz Paper Cups', 1, 'pieces', '6oz cup for single shot', false, new Date()],
    
    ['RCP-LAT', 'Café Latte', 'coffee-beans-arabica', 'Arabica Coffee Beans', 18, 'grams', 'Double shot base', false, new Date()],
    ['RCP-LAT', 'Café Latte', 'whole-milk', 'Whole Milk', 200, 'ml', 'Steamed to 65°C', false, new Date()],
    ['RCP-LAT', 'Café Latte', 'disposable-cups-12oz', '12oz Paper Cups', 1, 'pieces', '12oz cup standard', false, new Date()],
    
    ['RCP-MOC', 'Café Mocha', 'coffee-beans-arabica', 'Arabica Coffee Beans', 18, 'grams', 'Double shot base', false, new Date()],
    ['RCP-MOC', 'Café Mocha', 'whole-milk', 'Whole Milk', 180, 'ml', 'Steamed milk', false, new Date()],
    ['RCP-MOC', 'Café Mocha', 'chocolate-syrup', 'Chocolate Syrup', 30, 'ml', 'Premium chocolate', false, new Date()],
    ['RCP-MOC', 'Café Mocha', 'whipped-cream', 'Whipped Cream', 20, 'ml', 'Topped with whipped cream', true, new Date()],
    ['RCP-MOC', 'Café Mocha', 'disposable-cups-12oz', '12oz Paper Cups', 1, 'pieces', '12oz cup', false, new Date()],
    
    ['RCP-CHI', 'Chai Tea Latte', 'whole-milk', 'Whole Milk', 220, 'ml', 'Steamed milk base', false, new Date()],
    ['RCP-CHI', 'Chai Tea Latte', 'disposable-cups-12oz', '12oz Paper Cups', 1, 'pieces', '12oz cup', false, new Date()],
    
    ['RCP-MAT', 'Matcha Latte', 'matcha-powder', 'Matcha Powder', 3, 'grams', 'Premium grade matcha', false, new Date()],
    ['RCP-MAT', 'Matcha Latte', 'whole-milk', 'Whole Milk', 200, 'ml', 'Steamed milk', false, new Date()],
    ['RCP-MAT', 'Matcha Latte', 'disposable-cups-12oz', '12oz Paper Cups', 1, 'pieces', '12oz cup', false, new Date()]
  ];
  
  addDataToSheet(CONFIG.SHEETS.RECIPES, sampleRecipes);
  
  // Sample Suppliers - Philippines-based vendors
  const sampleSuppliers = [
    ['SUP001', 'Manila Coffee Supply Co.', 'Juan Dela Cruz', '+63 917 123 4567', 'juan@manilacoffee.ph', 'Quezon City, Metro Manila', '30 days', 'Mon,Wed,Fri', 5000, 'Coffee beans, syrups, sugars', true, 'Main coffee and ingredients supplier', new Date()],
    ['SUP002', 'Fresh Dairy Philippines', 'Maria Santos', '+63 917 234 5678', 'maria@freshdairy.ph', 'Marikina City, Metro Manila', '15 days', 'Daily', 2000, 'Dairy products, milk alternatives', true, 'Refrigerated products supplier', new Date()],
    ['SUP003', 'Eco Packaging Solutions', 'Pedro Reyes', '+63 917 345 6789', 'pedro@ecopackaging.ph', 'Pasig City, Metro Manila', '30 days', 'Tue,Thu', 3000, 'Cups, lids, packaging materials', true, 'Sustainable packaging supplier', new Date()],
    ['SUP004', 'Asian Tea Imports', 'Lisa Wong', '+63 917 456 7890', 'lisa@asiantea.ph', 'Makati City, Metro Manila', '45 days', 'Weekly', 10000, 'Premium teas, matcha, specialty items', true, 'Specialty tea and premium ingredients', new Date()],
    ['SUP005', 'Local Bakery Partners', 'Carlos Mendoza', '+63 917 567 8901', 'carlos@bakerypartners.ph', 'Taguig City, Metro Manila', '7 days', 'Daily', 1000, 'Fresh pastries, sandwiches, salads', true, 'Fresh food items supplier', new Date()]
  ];
  
  addDataToSheet(CONFIG.SHEETS.SUPPLIERS, sampleSuppliers);
  
  console.log('✅ Comprehensive sample data setup complete');
}

/**
 * Format all sheets for better user experience
 */
function formatAllSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  console.log('🎨 Formatting sheets...');
  
  Object.values(CONFIG.SHEETS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
      // Alternate row colors for better readability
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).applyRowBanding();
      }
      
      // Set column widths based on content
      sheet.autoResizeColumns(1, sheet.getLastColumn());
      
      // Protect header row
      const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      const protection = headerRange.protect().setDescription('Header row');
      protection.setWarningOnly(true);
    }
  });
  
  console.log('✅ Sheet formatting complete');
}

/**
 * Create a documentation sheet with setup instructions
 */
function createDocumentationSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const docSheet = spreadsheet.insertSheet('📖 Setup Instructions', 0); // Insert as first sheet
  
  const instructions = [
    ['Coffee Shop POS - Setup Instructions', '', '', ''],
    ['', '', '', ''],
    ['📋 What This Template Provides:', '', '', ''],
    ['✅ Complete Google Sheets structure for Coffee Shop POS', '', '', ''],
    ['✅ Sample data for immediate testing', '', '', ''],
    ['✅ Philippines-specific business logic', '', '', ''],
    ['✅ Ready for n8n workflow integration', '', '', ''],
    ['', '', '', ''],
    ['🔧 Next Steps:', '', '', ''],
    ['1. Copy this Google Sheets ID: ' + spreadsheet.getId(), '', '', ''],
    ['2. Import the n8n workflow to your n8n instance', '', '', ''],
    ['3. Update the Google Sheets ID in all n8n nodes', '', '', ''],
    ['4. Configure your Google Sheets credentials in n8n', '', '', ''],
    ['5. Update webhook URLs in your frontend .env file', '', '', ''],
    ['6. Test the integration using the sample data', '', '', ''],
    ['', '', '', ''],
    ['📊 Sheet Structure:', '', '', ''],
    ['• Settings - Shop configuration and preferences', '', '', ''],
    ['• Products - Your coffee and food menu items', '', '', ''],
    ['• Ingredients - Raw materials for cost tracking', '', '', ''],
    ['• Recipes - Product-to-ingredient relationships', '', '', ''],
    ['• Suppliers - Vendor information and contacts', '', '', ''],
    ['• Orders - Transaction records (auto-filled by n8n)', '', '', ''],
    ['• Ingredient_Usage_Log - Usage tracking for cost analysis', '', '', ''],
    ['• Cost_Analysis - Profitability reports', '', '', ''],
    ['• Purchase_Orders - Supplier order management', '', '', ''],
    ['• Purchase_Order_Items - Detailed order items', '', '', ''],
    ['', '', '', ''],
    ['⚠️ Important Notes:', '', '', ''],
    ['• Do not delete or rename sheet headers', '', '', ''],
    ['• The n8n workflow expects exact column names', '', '', ''],
    ['• Sample data can be modified or replaced', '', '', ''],
    ['• Keep the Settings sheet updated with your shop info', '', '', ''],
    ['', '', '', ''],
    ['🆔 Spreadsheet Information:', '', '', ''],
    ['Spreadsheet ID: ' + spreadsheet.getId(), '', '', ''],
    ['Spreadsheet URL: ' + spreadsheet.getUrl(), '', '', ''],
    ['Created: ' + new Date().toLocaleString(), '', '', ''],
    ['Template Version: 1.0.0', '', '', '']
  ];
  
  // Set the instructions
  docSheet.getRange(1, 1, instructions.length, 4).setValues(instructions);
  
  // Format the documentation sheet
  docSheet.getRange('A1:D1').merge().setFontSize(16).setFontWeight('bold').setBackground('#8B4513').setFontColor('#FFFFFF');
  docSheet.getRange('A3:D3').merge().setFontWeight('bold').setBackground('#D2B48C');
  docSheet.getRange('A9:D9').merge().setFontWeight('bold').setBackground('#D2B48C');
  docSheet.getRange('A18:D18').merge().setFontWeight('bold').setBackground('#D2B48C');
  docSheet.getRange('A29:D29').merge().setFontWeight('bold').setBackground('#D2B48C');
  docSheet.getRange('A36:D36').merge().setFontWeight('bold').setBackground('#D2B48C');
  
  // Auto-resize columns
  docSheet.autoResizeColumns(1, 4);
  
  console.log('✅ Documentation sheet created');
}

/**
 * Show completion dialog with next steps
 */
function showCompletionDialog() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const message = `
🎉 Coffee Shop POS Template Created Successfully!

📋 Your Google Sheets is now ready with:
✅ All required sheets and headers
✅ Sample data for testing
✅ Philippines business formatting
✅ n8n workflow compatibility

🔧 Next Steps:
1. Copy this Spreadsheet ID: ${spreadsheet.getId()}
2. Import the n8n workflow 
3. Update Google Sheets ID in n8n nodes
4. Configure credentials and test

📖 Check the "Setup Instructions" sheet for detailed guidance.

Ready to build your Coffee Shop POS system! ☕
  `;
  
  Browser.msgBox('Setup Complete!', message, Browser.Buttons.OK);
}

// Helper functions
function isSheetEmpty(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  return !sheet || sheet.getLastRow() <= 1;
}

function addDataToSheet(sheetName, data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet && data.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * Utility function to reset all sample data (for testing)
 */
function resetSampleData() {
  const response = Browser.msgBox(
    'Reset Sample Data',
    'This will clear all sample data and recreate it. Continue?',
    Browser.Buttons.YES_NO
  );
  
  if (response === 'yes') {
    try {
      // Clear existing data (keep headers)
      const sheetsWithData = [CONFIG.SHEETS.PRODUCTS, CONFIG.SHEETS.INGREDIENTS, CONFIG.SHEETS.RECIPES, CONFIG.SHEETS.SUPPLIERS];
      
      sheetsWithData.forEach(sheetName => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (sheet && sheet.getLastRow() > 1) {
          sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        }
      });
      
      // Recreate sample data
      setupSampleData();
      
      Browser.msgBox('Sample data reset successfully!');
      
    } catch (error) {
      Browser.msgBox('Reset failed: ' + error.message);
    }
  }
}

/**
 * Utility function to validate sheet structure for n8n compatibility
 */
function validateSheetStructure() {
  console.log('🔍 Validating sheet structure for n8n compatibility...');
  
  const results = [];
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Expected headers for each sheet
  const expectedHeaders = {
    [CONFIG.SHEETS.SETTINGS]: ['Setting', 'Value', 'Description', 'Type'],
    [CONFIG.SHEETS.PRODUCTS]: ['id', 'name', 'description', 'price', 'category', 'image', 'imageUrl', 'stock', 'lowStockThreshold', 'sku', 'isActive', 'recipeId', 'servingSize', 'variants', 'allergens', 'preparationTime', 'cost', 'lastModified'],
    [CONFIG.SHEETS.INGREDIENTS]: ['ingredientId', 'name', 'description', 'unit', 'currentStock', 'lowStockThreshold', 'costPerUnit', 'supplierId', 'lastRestocked', 'expirationDays', 'storageLocation', 'isActive', 'lastModified'],
    [CONFIG.SHEETS.ORDERS]: ['orderId', 'timestamp', 'items', 'subtotal', 'tax', 'total', 'paymentMethod', 'customerInfo', 'status', 'currency', 'ingredientCost', 'cashier', 'location', 'deviceInfo', 'lastModified']
  };
  
  // Check each critical sheet
  Object.entries(expectedHeaders).forEach(([sheetName, expectedCols]) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      results.push(`❌ Sheet missing: ${sheetName}`);
      return;
    }
    
    if (sheet.getLastRow() === 0) {
      results.push(`⚠️ Sheet empty: ${sheetName}`);
      return;
    }
    
    const actualHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const missingHeaders = expectedCols.filter(col => !actualHeaders.includes(col));
    
    if (missingHeaders.length > 0) {
      results.push(`❌ ${sheetName} missing columns: ${missingHeaders.join(', ')}`);
    } else {
      results.push(`✅ ${sheetName} structure valid`);
    }
  });
  
  // Show results
  const message = results.join('\n');
  console.log(message);
  Browser.msgBox('Validation Results', message, Browser.Buttons.OK);
  
  return results;
}

/**
 * Generate Google Sheets configuration for n8n workflow
 */
function generateN8NConfig() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  const config = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetNames: CONFIG.SHEETS,
    webhookEndpoints: {
      dataLoad: 'https://your-n8n-instance.com/webhook/dataload',
      processOrder: 'https://your-n8n-instance.com/webhook/ordersubmit',
      updateInventory: 'https://your-n8n-instance.com/webhook/update-inventory',
      lowStock: 'https://your-n8n-instance.com/webhook/low-stock',
      analytics: 'https://your-n8n-instance.com/webhook/analytics',
      dashboard: 'https://your-n8n-instance.com/webhook/dashboard-stats'
    },
    environment: {
      NODE_ENV: 'production',
      SHOP_NAME: CONFIG.SHOP_NAME,
      CURRENCY: CONFIG.CURRENCY,
      TAX_RATE: CONFIG.TAX_RATE,
      GOOGLE_SHEETS_ID: spreadsheet.getId()
    },
    setupInstructions: [
      '1. Import the Coffee Shop POS n8n workflow',
      '2. Update all Google Sheets nodes with this spreadsheet ID: ' + spreadsheet.getId(),
      '3. Configure Google Sheets OAuth2 credentials in n8n',
      '4. Update webhook URLs in your frontend .env file',
      '5. Test the data load endpoint first',
      '6. Verify order processing with sample data'
    ]
  };
  
  // Create a new sheet with the config
  const configSheet = spreadsheet.insertSheet('🔧 n8n Configuration');
  
  const configData = [
    ['Coffee Shop POS - n8n Configuration', '', ''],
    ['', '', ''],
    ['Spreadsheet ID:', spreadsheet.getId(), 'Copy this for n8n nodes'],
    ['Spreadsheet URL:', spreadsheet.getUrl(), ''],
    ['', '', ''],
    ['Sheet Names for n8n:', '', ''],
    ['Settings Sheet:', CONFIG.SHEETS.SETTINGS, ''],
    ['Products Sheet:', CONFIG.SHEETS.PRODUCTS, ''],
    ['Ingredients Sheet:', CONFIG.SHEETS.INGREDIENTS, ''],
    ['Orders Sheet:', CONFIG.SHEETS.ORDERS, ''],
    ['Suppliers Sheet:', CONFIG.SHEETS.SUPPLIERS, ''],
    ['', '', ''],
    ['Environment Variables (.env):', '', ''],
    ['GOOGLE_SHEETS_ID=' + spreadsheet.getId(), '', 'Add to your .env file'],
    ['SHOP_NAME=' + CONFIG.SHOP_NAME, '', ''],
    ['CURRENCY=' + CONFIG.CURRENCY, '', ''],
    ['TAX_RATE=' + CONFIG.TAX_RATE, '', ''],
    ['', '', ''],
    ['n8n Webhook URLs (update these):', '', ''],
    ['N8N_DATA_LOAD_WEBHOOK=https://your-n8n.com/webhook/dataload', '', ''],
    ['N8N_PROCESS_ORDER_WEBHOOK=https://your-n8n.com/webhook/ordersubmit', '', ''],
    ['N8N_UPDATE_INVENTORY_WEBHOOK=https://your-n8n.com/webhook/update-inventory', '', ''],
    ['N8N_LOW_STOCK_WEBHOOK=https://your-n8n.com/webhook/low-stock', '', ''],
    ['N8N_ANALYTICS_WEBHOOK=https://your-n8n.com/webhook/analytics', '', ''],
    ['N8N_DASHBOARD_WEBHOOK=https://your-n8n.com/webhook/dashboard-stats', '', ''],
    ['', '', ''],
    ['Setup Status:', '', ''],
    ['✅ Google Sheets template created', '', ''],
    ['⏳ Import n8n workflow', '', ''],
    ['⏳ Configure Google Sheets credentials', '', ''],
    ['⏳ Update spreadsheet ID in n8n nodes', '', ''],
    ['⏳ Test webhook endpoints', '', ''],
    ['⏳ Deploy frontend with webhook URLs', '', '']
  ];
  
  configSheet.getRange(1, 1, configData.length, 3).setValues(configData);
  
  // Format the config sheet
  configSheet.getRange('A1:C1').merge().setFontSize(14).setFontWeight('bold').setBackground('#8B4513').setFontColor('#FFFFFF');
  configSheet.getRange('A6:C6').merge().setFontWeight('bold').setBackground('#D2B48C');
  configSheet.getRange('A13:C13').merge().setFontWeight('bold').setBackground('#D2B48C');
  configSheet.getRange('A19:C19').merge().setFontWeight('bold').setBackground('#D2B48C');
  configSheet.getRange('A27:C27').merge().setFontWeight('bold').setBackground('#D2B48C');
  
  configSheet.autoResizeColumns(1, 3);
  
  Browser.msgBox(
    'n8n Configuration Generated!',
    'Check the "n8n Configuration" sheet for your spreadsheet ID and setup instructions.',
    Browser.Buttons.OK
  );
  
  return config;
}

/**
 * Test function to create a sample order (for testing n8n integration)
 */
function createSampleOrder() {
  const sampleOrder = {
    orderId: 'TEST-' + Date.now(),
    timestamp: new Date().toISOString(),
    items: JSON.stringify([
      {
        productId: 'latte',
        name: 'Café Latte',
        price: 120,
        quantity: 2,
        cost: 35.50
      },
      {
        productId: 'croissant',
        name: 'Butter Croissant',
        price: 75,
        quantity: 1,
        cost: 25.00
      }
    ]),
    subtotal: 315,
    tax: 37.80,
    total: 352.80,
    paymentMethod: 'cash',
    customerInfo: 'Test Customer',
    status: 'completed',
    currency: 'PHP',
    ingredientCost: 96.00,
    cashier: 'Test Cashier',
    location: 'Main Store',
    deviceInfo: 'Template Test',
    lastModified: new Date()
  };
  
  // Add to Orders sheet
  const ordersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.ORDERS);
  if (ordersSheet) {
    const values = [
      sampleOrder.orderId,
      sampleOrder.timestamp,
      sampleOrder.items,
      sampleOrder.subtotal,
      sampleOrder.tax,
      sampleOrder.total,
      sampleOrder.paymentMethod,
      sampleOrder.customerInfo,
      sampleOrder.status,
      sampleOrder.currency,
      sampleOrder.ingredientCost,
      sampleOrder.cashier,
      sampleOrder.location,
      sampleOrder.deviceInfo,
      sampleOrder.lastModified
    ];
    
    ordersSheet.appendRow(values);
    
    Browser.msgBox(
      'Sample Order Created!',
      `Test order ${sampleOrder.orderId} has been added to the Orders sheet. Use this to test your n8n workflow.`,
      Browser.Buttons.OK
    );
  }
  
  return sampleOrder;
}

/**
 * Menu functions for easy access from Google Sheets UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('☕ Coffee POS Setup')
    .addItem('🚀 Initialize Template', 'initializeCoffeePOSTemplate')
    .addSeparator()
    .addItem('🔧 Generate n8n Config', 'generateN8NConfig')
    .addItem('🔍 Validate Structure', 'validateSheetStructure')
    .addSeparator()
    .addItem('📊 Reset Sample Data', 'resetSampleData')
    .addItem('🧪 Create Test Order', 'createSampleOrder')
    .addToUi();
}

/**
 * Installation function - run this when setting up for a new client
 */
function onInstall() {
  onOpen();
  initializeCoffeePOSTemplate();
}