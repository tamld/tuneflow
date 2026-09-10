class FavoriteRepo {
  constructor(db) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT OR REPLACE INTO user_favorites (user_id, video_id, title, uploader, duration, duration_string, thumbnail, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.listByUserStmt = db.prepare(`
      SELECT id, user_id, video_id, title, uploader, duration, duration_string, thumbnail, created_at
      FROM user_favorites
      WHERE user_id = ?
      ORDER BY id DESC
    `);
    this.deleteStmt = db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND video_id = ?');
    this.isFavStmt = db.prepare('SELECT id FROM user_favorites WHERE user_id = ? AND video_id = ?');
    this.clearByUserStmt = db.prepare('DELETE FROM user_favorites WHERE user_id = ?');
  }

  getFavorites(userId) {
    if (!userId) return [];
    const rows = this.listByUserStmt.all(userId);
    return rows.map(r => ({
      id: r.video_id,
      title: r.title,
      uploader: r.uploader || 'Nghệ sĩ',
      duration: r.duration || 0,
      duration_string: r.duration_string || '00:00',
      thumbnail: r.thumbnail || 'assets/default-thumbnail.jpg',
      created_at: r.created_at
    }));
  }

  addFavorite(userId, track) {
    if (!userId) throw new Error('MISSING_USER_ID');
    const videoId = track.id || track.video_id;
    if (!videoId) throw new Error('MISSING_VIDEO_ID');

    const createdAt = new Date().toISOString();
    this.insertStmt.run(
      userId,
      videoId,
      track.title || 'Bài hát yêu thích',
      track.uploader || 'Nghệ sĩ',
      track.duration || 0,
      track.duration_string || '00:00',
      track.thumbnail || 'assets/default-thumbnail.jpg',
      createdAt
    );

    return {
      id: videoId,
      title: track.title,
      uploader: track.uploader,
      duration: track.duration,
      duration_string: track.duration_string,
      thumbnail: track.thumbnail
    };
  }

  removeFavorite(userId, videoId) {
    if (!userId || !videoId) return false;
    const result = this.deleteStmt.run(userId, videoId);
    return result.changes > 0;
  }

  isFavorite(userId, videoId) {
    if (!userId || !videoId) return false;
    const row = this.isFavStmt.get(userId, videoId);
    return Boolean(row);
  }

  syncFavorites(userId, clientFavorites = []) {
    if (!userId) return [];
    if (Array.isArray(clientFavorites)) {
      for (const track of clientFavorites) {
        if (track && (track.id || track.video_id)) {
          try {
            this.addFavorite(userId, track);
          } catch (_e) {}
        }
      }
    }
    return this.getFavorites(userId);
  }
}

module.exports = {
  FavoriteRepo
};
