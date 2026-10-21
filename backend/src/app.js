const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/seller', require('./routes/sellerRoutes'));
app.use('/api/evaluator', require('./routes/evaluatorRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/buyer', require('./routes/buyerRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
