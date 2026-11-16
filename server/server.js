require('./loadEnv');
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGODB_URI;

if (!URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and set it.');
  process.exit(1);
}

mongoose
  .connect(URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check that MongoDB is running (local) or your Atlas string/IP allow-list/password (cloud).');
    process.exit(1);
  });
