const app = require('./app');
const prisma = require('./config/db');
const { startAutoPricingScheduler } = require('./services/autoPricingScheduler');


const PORT = process.env.PORT || 3000;

async function bootstrap() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to Postgres Database via Prisma');

        app.listen(PORT, () => {
            console.log(`🚀 Takealot Backend Server running on port ${PORT}`);
        });

        startAutoPricingScheduler();

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();