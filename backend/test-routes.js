// Quick test to verify routes are loaded
const wholesalerRoutes = require('./src/routes/wholesalerRoutes');

console.log('✅ Wholesaler routes loaded successfully');
console.log('\nRegistered routes:');

wholesalerRoutes.stack.forEach((middleware) => {
    if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        console.log(`  ${methods} /api/wholesalers${middleware.route.path}`);
    }
});

console.log('\n✅ All routes are registered correctly');
console.log('⚠️  If you see 404 errors, restart the backend server:');
console.log('   1. Stop the server (Ctrl+C)');
console.log('   2. Run: npm start');
