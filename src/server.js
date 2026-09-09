const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, ROOT_DIR } = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security Headers (Clickjacking, MIME-sniffing, XSS protection & CSP for YouTube assets)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.ytimg.com https://*.youtube.com data:; media-src 'self' blob: https://*.googlevideo.com http://localhost:* http://127.0.0.1:*; connect-src 'self' https://*.googlevideo.com;"
  );
  next();
});

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
  // Global Crash Shield (Issue #25)
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception caught by TuneFlow server shield:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection caught by TuneFlow server shield:', reason);
  });

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎶 TuneFlow Server is running on http://localhost:${PORT}`);
    console.log(`📂 Ready for parents to search, preview, and download music!`);
  });

  // Graceful shutdown (Issue #22)
  const gracefulShutdown = () => {
    console.log('\n🛑 TuneFlow shutting down safely...');
    try {
      const { downloadQueue } = require('./engine/queue');
      downloadQueue.shutdown();
    } catch (_e) {}

    // Fallback safety timeout to prevent hanging on orphaned processes
    const forceExitTimer = setTimeout(() => {
      console.warn('⚠️ Forcing process exit after 3000ms shutdown timeout');
      process.exit(0);
    }, 3000);
    forceExitTimer.unref();

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
