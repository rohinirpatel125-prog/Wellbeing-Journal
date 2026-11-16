const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const entries = require('./routes/entries');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/entries', entries);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
