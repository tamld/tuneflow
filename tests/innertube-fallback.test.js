const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { parsePlaylistInnertube } = require('../src/engine/ytdlp');

describe('Gate 1: YouTube Innertube Contract Fragility & Fallback Mocking', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('should return null when playlist URL lacks a valid list ID', async () => {
    const res = await parsePlaylistInnertube('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.strictEqual(res, null, 'URLs without list parameter must return null');
  });

  it('should gracefully return null when upstream responds with HTTP 429 Too Many Requests', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    });

    const res = await parsePlaylistInnertube('https://www.youtube.com/playlist?list=PL_TEST_429');
    assert.strictEqual(res, null, 'HTTP 429 must return null to allow Tier-2 fallback');
  });

  it('should gracefully return null when upstream responds with HTTP 403 Forbidden', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    });

    const res = await parsePlaylistInnertube('https://www.youtube.com/playlist?list=PL_TEST_403');
    assert.strictEqual(res, null, 'HTTP 403 must return null to allow Tier-2 fallback');
  });

  it('should gracefully return null when upstream returns HTML/non-JSON response without crashing', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      }
    });

    const res = await parsePlaylistInnertube('https://www.youtube.com/playlist?list=PL_TEST_HTML');
    assert.strictEqual(res, null, 'Non-JSON/HTML upstream response must return null without throwing');
  });

  it('should gracefully return null when upstream JSON has drifted schema (empty/missing tabs)', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        contents: {
          twoColumnBrowseResultsRenderer: {
            tabs: []
          }
        }
      })
    });

    const res = await parsePlaylistInnertube('https://www.youtube.com/playlist?list=PL_TEST_DRIFT');
    assert.strictEqual(res, null, 'Drifted schema with 0 entries must return null');
  });

  it('should successfully parse valid Innertube mock data into clean TuneFlow playlist format', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        header: {
          playlistHeaderRenderer: {
            title: { simpleText: 'Nhạc Vàng Chọn Lọc' },
            ownerText: { runs: [{ text: 'Giao Linh' }] }
          }
        },
        contents: {
          twoColumnBrowseResultsRenderer: {
            tabs: [
              {
                tabRenderer: {
                  content: {
                    sectionListRenderer: {
                      contents: [
                        {
                          itemSectionRenderer: {
                            contents: [
                              {
                                playlistVideoRenderer: {
                                  videoId: 'test_vid_123',
                                  title: { simpleText: 'Chuyến Tàu Hoàng Hôn' },
                                  shortBylineText: { runs: [{ text: 'Giao Linh' }] },
                                  lengthText: { simpleText: '04:30' },
                                  thumbnail: {
                                    thumbnails: [{ url: 'https://i.ytimg.com/vi/test_vid_123/hqdefault.jpg' }]
                                  }
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      })
    });

    const res = await parsePlaylistInnertube('https://www.youtube.com/playlist?list=PL_TEST_VALID');
    assert.ok(res, 'Valid mock response must return parsed playlist object');
    assert.strictEqual(res.title, 'Nhạc Vàng Chọn Lọc');
    assert.strictEqual(res.uploader, 'Giao Linh');
    assert.strictEqual(res.count, 1);
    assert.strictEqual(res.entries[0].id, 'test_vid_123');
    assert.strictEqual(res.entries[0].title, 'Chuyến Tàu Hoàng Hôn');
    assert.strictEqual(res.entries[0].duration_string, '04:30');
  });
});
