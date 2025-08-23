// Test n8n webhooks connectivity
require('dotenv').config();

const webhooks = {
    dataLoad: process.env.N8N_DATA_LOAD_WEBHOOK,
    processOrder: process.env.N8N_PROCESS_ORDER_WEBHOOK,
    updateInventory: process.env.N8N_UPDATE_INVENTORY_WEBHOOK,
    lowStock: process.env.N8N_LOW_STOCK_WEBHOOK,
    analytics: process.env.N8N_ANALYTICS_WEBHOOK,
    dashboard: process.env.N8N_DASHBOARD_WEBHOOK
};

async function testWebhook(name, url) {
    if (!url) {
        console.log(`❌ ${name}: URL not configured`);
        return false;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log(`✅ ${name}: Connected (${response.status})`);
            return true;
        } else {
            console.log(`⚠️  ${name}: Response ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name}: Failed - ${error.message}`);
        return false;
    }
}

async function testAllWebhooks() {
    console.log('🧪 Testing n8n Webhook Connectivity...\n');

    let successCount = 0;
    const totalWebhooks = Object.keys(webhooks).length;

    for (const [name, url] of Object.entries(webhooks)) {
        const success = await testWebhook(name, url);
        if (success) successCount++;
    }

    console.log(`\n📊 Results: ${successCount}/${totalWebhooks} webhooks accessible`);

    if (successCount === 0) {
        console.log('\n🔧 Setup Instructions:');
        console.log('1. Deploy the n8n workflow to your n8n instance');
        console.log('2. Copy the webhook URLs from n8n');
        console.log('3. Update your .env file with the webhook URLs');
        console.log('4. Run this test again');
    } else if (successCount < totalWebhooks) {
        console.log('\n⚠️  Some webhooks are not accessible. Check your n8n configuration.');
    } else {
        console.log('\n🎉 All webhooks are working! Your Coffee POS is ready.');
    }
}

testAllWebhooks().catch(console.error);