/**
 * Quick script to verify wholesaler routes are properly loaded
 * Run this to check if the send-campaign route exists
 */

const express = require('express');
const app = express();

// Load the wholesaler routes
const wholesalerRoutes = require('./src/routes/wholesalerRoutes');

// Mount the routes
app.use('/api/wholesalers', wholesalerRoutes);

// Get all registered routes
function getRoutes(app) {
    const routes = [];

    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            // Routes registered directly on the app
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            // Router middleware
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    const path = middleware.regexp.source
                        .replace('\\/?', '')
                        .replace('(?=\\/|$)', '')
                        .replace(/\\\//g, '/')
                        .replace('^', '');

                    routes.push({
                        path: path + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });

    return routes;
}

const routes = getRoutes(app);

console.log('\n✅ Wholesaler Routes Verification\n');
console.log('Total routes found:', routes.length);
console.log('\nAll routes:');
routes.forEach(route => {
    console.log(`  ${route.methods.join(', ').toUpperCase()} ${route.path}`);
});

// Check for send-campaign route specifically
const sendCampaignRoute = routes.find(r => r.path.includes('send-campaign'));
if (sendCampaignRoute) {
    console.log('\n✅ SUCCESS: send-campaign route is registered!');
    console.log(`   ${sendCampaignRoute.methods.join(', ').toUpperCase()} ${sendCampaignRoute.path}`);
} else {
    console.log('\n❌ ERROR: send-campaign route NOT found!');
}

console.log('\n');
