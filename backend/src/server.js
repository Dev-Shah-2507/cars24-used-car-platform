require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Copy backend/.env.example to backend/.env first.');
    process.exit(1);
  }
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Could not start server:', err.message);
    process.exit(1);
  }
})();
