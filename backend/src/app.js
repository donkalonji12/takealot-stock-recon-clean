// backend/src/app.js
const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/errorMiddleware');
const logger = require('./middleware/logger');
const offersRoutes = require('./routes/offersRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const competitorRoutes = require('./routes/competitorRoutes');


// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const returnsRoutes = require('./routes/returnsRoutes');
const salesRoutes = require('./routes/salesRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');


const app = express();
app.use('/api/competitors', competitorRoutes);
// Global Middleware
app.use(cors());

app.use('/api/competitors', competitorRoutes);


// Crucial: Use JSON parsing for all routes EXCEPT webhooks which usually need raw body for signature validation
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(logger);

app.use('/api/offers', offersRoutes);
app.use('/api/pricing', pricingRoutes);



// Base Routes
app.use('/api/health', healthRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Custom Error Handling (must be placed after all routes)
app.use(errorMiddleware);

module.exports = app;
