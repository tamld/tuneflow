const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, HOST, ROOT_DIR } = require('./config');
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
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.ytimg.com https://*.youtube.com https://*.ggpht.com https://*.googleusercontent.com https: http: data: blob:; media-src 'self' blob: data: https://*.googlevideo.com https: http: http://localhost:* http://127.0.0.1:*; connect-src 'self' https://*.googlevideo.com https: http: http://localhost:* http://127.0.0.1:*;"
  );
  next();
});

// Serve static assets: aggressive revalidation for scripts/html, cached images/fonts
app.use(express.static(path.join(ROOT_DIR, 'public'), {
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
  etag: true
}));

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

  server = app.listen(PORT, HOST, () => {
    console.log(`🎶 TuneFlow Server is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`📂 Ready for parents to search, preview, and download music!`);

    // Start background maintenance engine (Issue #103)
    try {
      const maintenance = require('./engine/maintenance');
      maintenance.startMaintenance();
    } catch (err) {
      console.error('⚠️ Could not start background maintenance engine:', err.message);
    }
  });

  // Graceful shutdown (Issue #22, #56, #103)
  const gracefulShutdown = () => {
    console.log('\n🛑 TuneFlow shutting down safely...');
    try {
      const maintenance = require('./engine/maintenance');
      if (maintenance && typeof maintenance.stopMaintenance === 'function') {
        maintenance.stopMaintenance();
      }
    } catch (_e) {}

    try {
      const queue = require('./engine/queue');
      if (queue && typeof queue.shutdown === 'function') {
        queue.shutdown();
      }
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
