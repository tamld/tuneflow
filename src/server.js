const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, ROOT_DIR } = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets for the Elderly-friendly Frontend
app.use(express.static(path.join(ROOT_DIR, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
});

let server = null;
if (require.main === module) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎶 TuneFlow Server is running on http://localhost:${PORT}`);
    console.log(`📂 Ready for parents to search, preview, and download music!`);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n🛑 TuneFlow shutting down safely...');
    if (server) {
      server.close(() => {
        console.log('✅ All active connections closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = { app, server };
