// Test n8n webhooks connectivity
console.log('[DEBUG] Test Webhooks - Script started');
console.log('[DEBUG] Test Webhooks - Loading environment configuration...');

require('dotenv').config();

const webhooks = {
    dataLoad: process.env.N8N_DATA_LOAD_WEBHOOK,
    processOrder: process.env.N8N_PROCESS_ORDER_WEBHOOK,
    updateInventory: process.env.N8N_UPDATE_INVENTORY_WEBHOOK,
    lowStock: process.env.N8N_LOW_STOCK_WEBHOOK,
    analytics: process.env.N8N_ANALYTICS_WEBHOOK,
    dashboard: process.env.N8N_DASHBOARD_WEBHOOK
};

console.log('[DEBUG] Test Webhooks - Webhook configuration loaded:');
Object.entries(webhooks).forEach(([name, url]) => {
    console.log(`[DEBUG] Test Webhooks - ${name}: ${url ? 'configured' : 'not set'}`);
    if (url) {
        console.log(`[DEBUG] Test Webhooks - ${name} URL: ${url.substring(0, 50)}...`);
    }
});

async function testWebhook(name, url) {
    console.log(`[DEBUG] testWebhook - Testing ${name}`);
    const startTime = Date.now();
    
    if (!url) {
        console.log(`[DEBUG] testWebhook - ${name}: URL not configured`);
        console.log(`❌ ${name}: URL not configured`);
        return false;
    }

    console.log(`[DEBUG] testWebhook - ${name}: Making request to ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`[DEBUG] testWebhook - ${name}: Response received in ${duration}ms`);
        console.log(`[DEBUG] testWebhook - ${name}: Status ${response.status} ${response.statusText}`);
        console.log(`[DEBUG] testWebhook - ${name}: Headers:`, Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            console.log(`[DEBUG] testWebhook - ${name}: Success - testing response parsing`);
            try {
                const data = await response.json();
                console.log(`[DEBUG] testWebhook - ${name}: JSON response:`, {
                    type: typeof data,
                    keys: typeof data === 'object' ? Object.keys(data) : 'not an object',
                    hasSuccess: 'success' in data
                });
            } catch (jsonError) {
                console.log(`[DEBUG] testWebhook - ${name}: Response not JSON:`, jsonError.message);
            }
            
            console.log(`✅ ${name}: Connected (${response.status}) - ${duration}ms`);
            return true;
        } else {
            console.log(`[DEBUG] testWebhook - ${name}: Non-success status code`);
            console.log(`⚠️  ${name}: Response ${response.status} - ${duration}ms`);
            return false;
        }
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error(`[DEBUG] testWebhook - ${name}: Request failed after ${duration}ms:`, error);
        console.error(`[DEBUG] testWebhook - ${name}: Error details:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            type: error.constructor.name
        });
        
        console.log(`❌ ${name}: Failed - ${error.message} (${duration}ms)`);
        return false;
    }
}

async function testAllWebhooks() {
    console.log('[DEBUG] testAllWebhooks - Function start');
    console.log('[DEBUG] testAllWebhooks - Starting comprehensive webhook testing');
    console.log('🧪 Testing n8n Webhook Connectivity...\n');

    let successCount = 0;
    const totalWebhooks = Object.keys(webhooks).length;
    const results = [];
    const overallStartTime = Date.now();
    
    console.log(`[DEBUG] testAllWebhooks - Testing ${totalWebhooks} webhooks`);

    for (const [name, url] of Object.entries(webhooks)) {
        console.log(`[DEBUG] testAllWebhooks - Starting test for ${name}`);
        const testStartTime = Date.now();
        
        const success = await testWebhook(name, url);
        const testEndTime = Date.now();
        const testDuration = testEndTime - testStartTime;
        
        const result = {
            name,
            url,
            success,
            duration: testDuration,
            status: success ? 'success' : 'failed'
        };
        
        results.push(result);
        console.log(`[DEBUG] testAllWebhooks - ${name} test completed: ${result.status} (${testDuration}ms)`);
        
        if (success) successCount++;
        
        // Add a small delay between tests to avoid overwhelming the server
        if (Object.keys(webhooks).length > 1) {
            console.log('[DEBUG] testAllWebhooks - Waiting 500ms before next test...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    const overallEndTime = Date.now();
    const totalDuration = overallEndTime - overallStartTime;
    
    console.log(`[DEBUG] testAllWebhooks - All tests completed in ${totalDuration}ms`);
    console.log('[DEBUG] testAllWebhooks - Test results summary:');
    results.forEach(result => {
        console.log(`[DEBUG] testAllWebhooks - ${result.name}: ${result.status} (${result.duration}ms)`);
    });

    console.log(`\n📊 Results: ${successCount}/${totalWebhooks} webhooks accessible`);
    console.log(`[DEBUG] testAllWebhooks - Success rate: ${((successCount / totalWebhooks) * 100).toFixed(1)}%`);

    if (successCount === 0) {
        console.log('[DEBUG] testAllWebhooks - No webhooks accessible - providing setup instructions');
        console.log('\n🔧 Setup Instructions:');
        console.log('1. Deploy the n8n workflow to your n8n instance');
        console.log('2. Copy the webhook URLs from n8n');
        console.log('3. Update your .env file with the webhook URLs');
        console.log('4. Run this test again');
    } else if (successCount < totalWebhooks) {
        console.log('[DEBUG] testAllWebhooks - Partial webhook connectivity');
        console.log('\n⚠️  Some webhooks are not accessible. Check your n8n configuration.');
        
        const failedWebhooks = results.filter(r => !r.success);
        console.log('\nFailed webhooks:');
        failedWebhooks.forEach(result => {
            console.log(`  - ${result.name}: ${result.url ? 'Connection failed' : 'URL not configured'}`);
        });
    } else {
        console.log('[DEBUG] testAllWebhooks - All webhooks accessible');
        console.log('\n🎉 All webhooks are working! Your Coffee POS is ready.');
    }
    
    console.log('[DEBUG] testAllWebhooks - Function end');
}

// Add error handling for the main execution
console.log('[DEBUG] Main - Starting webhook testing process');
console.log('[DEBUG] Main - Node.js version:', process.version);
console.log('[DEBUG] Main - Current working directory:', process.cwd());
console.log('[DEBUG] Main - Script arguments:', process.argv.slice(2));

testAllWebhooks()
    .then(() => {
        console.log('[DEBUG] Main - Webhook testing completed successfully');
        console.log('[DEBUG] Main - Process exiting normally');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[DEBUG] Main - Webhook testing failed with error:', error);
        console.error('[DEBUG] Main - Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        console.error('\n❌ Webhook testing failed unexpectedly');
        process.exit(1);
    });