const express = require('express');

function createUserRouter({ favoriteRepo }) {
  const router = express.Router();

  // All endpoints in this router require an authenticated non-guest user
  router.use((req, res, next) => {
    if (!req.user || req.user.isGuest) {
      return res.status(401).json({
        ok: false,
        error: 'UNAUTHORIZED',
        message: 'Tính năng yêu cầu đăng nhập tài khoản Gia Đình hoặc Quản Trị'
      });
    }
    next();
  });

  // GET /api/user/favorites
  router.get('/favorites', (req, res) => {
    const favorites = favoriteRepo.getFavorites(req.user.id);
    return res.status(200).json({
      ok: true,
      count: favorites.length,
      favorites
    });
  });

  // POST /api/user/favorites
  router.post('/favorites', (req, res) => {
    const track = req.body || {};
    if (!track.id && !track.video_id) {
      return res.status(400).json({ ok: false, error: 'MISSING_TRACK_ID' });
    }
    try {
      const added = favoriteRepo.addFavorite(req.user.id, track);
      return res.status(200).json({
        ok: true,
        favorite: added
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /api/user/favorites/:id
  router.delete('/favorites/:id', (req, res) => {
    const videoId = req.params.id;
    if (!videoId) {
      return res.status(400).json({ ok: false, error: 'MISSING_ID' });
    }
    const success = favoriteRepo.removeFavorite(req.user.id, videoId);
    return res.status(200).json({
      ok: true,
      removed: success
    });
  });

  // POST /api/user/favorites/sync
  router.post('/favorites/sync', (req, res) => {
    const { favorites = [] } = req.body || {};
    const synced = favoriteRepo.syncFavorites(req.user.id, favorites);
    return res.status(200).json({
      ok: true,
      count: synced.length,
      favorites: synced
    });
  });

  return router;
}

module.exports = {
  createUserRouter
};
