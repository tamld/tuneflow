const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('../src/routes/api');

describe('TuneFlow Connect, USB Exporter & Engine Health API Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  });

  it('POST /api/connect/register should register a new receiver with 4-digit PIN', async () => {
    const res = await fetch(`${baseUrl}/connect/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TV Phòng Khách Test' })
    });
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.receiver);
    assert.ok(data.receiver.receiverId);
    assert.match(data.receiver.pin, /^\d{4}$/);
    assert.strictEqual(data.receiver.name, 'TV Phòng Khách Test');
  });

  it('GET /api/connect/receivers should list active receivers without leaking PIN', async () => {
    const res = await fetch(`${baseUrl}/connect/receivers`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.receivers));
    const target = data.receivers.find(r => r.name === 'TV Phòng Khách Test');
    assert.ok(target, 'Registered receiver must appear in active list');
    assert.strictEqual(target.pin, undefined, 'PIN must not be exposed in public listing');
  });

  it('POST /api/connect/pair and /api/connect/cast should pair and dispatch command', async () => {
    // 1. Register
    const regRes = await fetch(`${baseUrl}/connect/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smart TV Test' })
    });
    const { receiver } = await regRes.json();

    // 2. Pair
    const pairRes = await fetch(`${baseUrl}/connect/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: receiver.pin, receiverId: receiver.receiverId })
    });
    const pairData = await pairRes.json();
    assert.strictEqual(pairData.success, true);
    assert.ok(pairData.token);

    // 3. Cast playTrack command
    const castRes = await fetch(`${baseUrl}/connect/cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: receiver.receiverId,
        command: {
          type: 'playTrack',
          payload: {
            videoId: 'xyz987',
            title: 'Chuyến Đò Vĩ Tuyến',
            artist: 'Giao Linh'
          }
        }
      })
    });
    const castData = await castRes.json();
    assert.strictEqual(castData.success, true);

    // 4. Verify state updated on receiver
    const stateRes = await fetch(`${baseUrl}/connect/state?receiverId=${receiver.receiverId}`);
    const stateData = await stateRes.json();
    assert.strictEqual(stateData.success, true);
    assert.strictEqual(stateData.state.isPlaying, true);
    assert.strictEqual(stateData.state.currentTrack.title, 'Chuyến Đò Vĩ Tuyến');
  });

  it('GET /api/usb/drives should return array of detected drives', async () => {
    const res = await fetch(`${baseUrl}/usb/drives`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.drives));
  });

  it('GET /api/usb/batch-zip should handle batch ZIP request cleanly', async () => {
    const res = await fetch(`${baseUrl}/usb/batch-zip`);
    // Depending on whether downloads folder has files or is empty
    if (res.status === 200) {
      assert.strictEqual(res.headers.get('content-type'), 'application/zip');
      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 0);
    } else {
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    }
  });

  it('GET /api/engine/health should return engine status and diagnostics', async () => {
    const res = await fetch(`${baseUrl}/engine/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.status);
    assert.strictEqual(data.status.healthy, true);
  });
});
