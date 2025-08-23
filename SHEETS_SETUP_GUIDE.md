# Coffee POS - Google Sheets Integration Setup Guide

## Overview
This setup makes **ALL your POS data editable in Google Sheets** with real-time sync to the frontend. Every time you refresh the POS, it gets the latest data from your sheets.

## 📊 What You Can Edit in Sheets:
- ✅ **Products**: Name, price, stock, categories, variants
- ✅ **Settings**: Shop name, tax rate, currency, contact info
- ✅ **Inventory**: Stock levels, thresholds, costs
- ✅ **Ingredients**: Raw materials, suppliers, costs
- ✅ **Suppliers**: Contact details, terms
- ✅ **View Orders**: All processed orders
- ✅ **View Analytics**: Sales data, reports

## 🚀 Setup Steps

### Step 1: Create Google Sheets Backend

1. **Create a new Google Sheets document**
   - Go to https://sheets.google.com
   - Click "Create new spreadsheet"
   - Name it "Coffee POS Database"

2. **Add the Apps Script**
   - In your Google Sheet, go to `Extensions > Apps Script`
   - Delete the default code
   - Copy and paste the entire content from `google-apps-script.js`
   - Save the project (Ctrl+S)

3. **Initialize the Sheets**
   - In Apps Script editor, run the `initializeSheets()` function:
     - Select `initializeSheets` from the function dropdown
     - Click the ▶️ Run button
     - Grant permissions when prompted
   - This creates 6 sheets with sample data:
     - **Products**: Your menu items
     - **Settings**: Shop configuration
     - **Orders**: Order history
     - **Ingredients**: Raw materials
     - **Suppliers**: Vendor contacts
     - **Analytics**: Sales data

4. **Deploy as Web App**
   - Click `Deploy > New deployment`
   - Click the gear icon ⚙️ next to "Type"
   - Select "Web app"
   - Set "Execute as": Me
   - Set "Who has access": Anyone
   - Click `Deploy`
   - **Copy the Web App URL** - you'll need this!

### Step 2: Configure n8n Workflow

1. **Update the n8n workflow**
   - In your n8n workflow, find the "Get Settings" node
   - Update the `apps_script_url` with your Web App URL:
   ```json
   {
     "apps_script_url": "https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec",
     "systemEmail": "noreply@yourdomain.com",
     "ownerEmail": "your-email@domain.com",
     "shopName": "Coffee Paradise"
   }
   ```

2. **Deploy your n8n workflow**
   - Activate the workflow
   - Copy all the webhook URLs

3. **Update your .env file**
   - Replace the placeholder URLs in `.env` with your actual n8n webhook URLs
   ```env
   N8N_DATA_LOAD_WEBHOOK=https://your-n8n-instance.com/webhook/get-products
   N8N_PROCESS_ORDER_WEBHOOK=https://your-n8n-instance.com/webhook/process-order
   # ... etc
   ```

### Step 3: Test the Integration

1. **Run the test**
   ```bash
   node test-webhooks.js
   ```

2. **Start your POS server**
   ```bash
   npm start
   ```

3. **Test real-time sync**
   - Open the POS in your browser
   - Edit a product in Google Sheets (change price or stock)
   - Wait 30 seconds or refresh the POS
   - See the changes appear instantly!

## 📝 How to Edit Data in Sheets

### Products Sheet
- **ID**: Unique identifier (don't change existing ones)
- **Name**: Product name shown in POS
- **Price**: Price in your currency
- **Stock**: Current inventory level
- **Category**: Used for filtering in POS
- **Variants**: Comma-separated (e.g., "Regular,Large,Decaf")
- **IsActive**: TRUE/FALSE to show/hide products

### Settings Sheet
- **shopName**: Your coffee shop name
- **currency**: Currency symbol (PHP, USD, etc.)
- **taxRate**: Tax rate as decimal (0.12 = 12%)
- **ownerEmail**: Email for notifications
- **autoRefreshInterval**: Sync frequency in seconds

### Ingredients Sheet
- **Stock**: Current quantity available
- **LowStockThreshold**: When to trigger alerts
- **CostPerUnit**: Cost for profit calculations

## 🔄 Auto-Refresh Features

- **Frontend auto-refreshes every 30 seconds**
- **Fetches fresh data from Google Sheets**
- **Shows sync status in header**
- **Visual indicators when syncing**
- **Hover over status to see last sync time**

## 📊 Real-Time Analytics

Your n8n workflow automatically:
- ✅ Records every order in Google Sheets
- ✅ Updates inventory after each sale
- ✅ Calculates daily analytics
- ✅ Sends low stock email alerts
- ✅ Generates weekly business reports
- ✅ Tracks ingredient costs and profits

## 🛠 Customization

### Add New Products
1. Go to Products sheet
2. Add new row with all details
3. Set IsActive to TRUE
4. POS will show it on next refresh

### Change Prices
1. Edit Price column in Products sheet
2. Changes appear in POS within 30 seconds

### Update Stock
1. Edit Stock column in Products sheet
2. OR use the POS inventory update feature
3. Both update the same Google Sheet

### Add Categories
1. Add products with new Category names
2. Categories appear automatically in POS

## 🚨 Troubleshooting

### Data Not Updating?
1. Check n8n workflow is active
2. Verify webhook URLs in .env
3. Test individual webhooks with test-webhooks.js
4. Check Apps Script execution permissions

### Products Not Showing?
1. Ensure IsActive = TRUE in Products sheet
2. Check for empty rows or missing data
3. Verify category names don't have extra spaces

### Orders Not Recording?
1. Check n8n process-order webhook
2. Verify Orders sheet exists
3. Look at n8n execution logs

## 📈 What Happens When You Make Changes

1. **Edit Google Sheets** → Data changes instantly
2. **POS auto-refreshes** → Gets fresh data every 30 seconds
3. **Process order in POS** → Updates Google Sheets via n8n
4. **Stock levels decrease** → Reflected in sheets
5. **Low stock triggers** → Email alerts sent automatically

Your POS is now a complete business management system with Google Sheets as your editable database! 🎉