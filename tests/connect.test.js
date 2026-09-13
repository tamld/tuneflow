const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { TuneFlowConnectHub } = require('../src/engine/connect');

describe('TuneFlow Connect: Remote Pairing & TV 10-Foot Casting Hub', () => {
  let hub;

  beforeEach(() => {
    hub = new TuneFlowConnectHub();
  });

  it('should successfully register a TV receiver with a 4-digit PIN code', () => {
    const receiver = hub.registerReceiver({ name: 'TV Phòng Khách' });

    assert.ok(receiver.receiverId, 'Must generate receiverId');
    assert.match(receiver.receiverId, /^rcv_/, 'receiverId should start with rcv_');
    assert.ok(receiver.pin, 'Must generate pairing PIN');
    assert.match(receiver.pin, /^\d{4}$/, 'PIN must be exactly 4 digits');
    assert.strictEqual(receiver.name, 'TV Phòng Khách');
  });

  it('should list only active receivers and hide PIN from public discovery', () => {
    hub.registerReceiver({ name: 'Android TV' });
    const receivers = hub.getActiveReceivers();

    assert.strictEqual(receivers.length, 1);
    assert.strictEqual(receivers[0].name, 'Android TV');
    assert.strictEqual(receivers[0].pin, undefined, 'Public receiver listing must not leak PIN');
  });

  it('should successfully pair using the 4-digit PIN code', () => {
    const receiver = hub.registerReceiver({ name: 'Sony Bravia' });
    const pairResult = hub.pair({ pin: receiver.pin });

    assert.strictEqual(pairResult.success, true);
    assert.strictEqual(pairResult.receiverId, receiver.receiverId);
    assert.strictEqual(pairResult.name, 'Sony Bravia');
    assert.ok(pairResult.token, 'Pairing must generate a connection token');
  });

  it('should reject pairing when invalid PIN is provided', () => {
    hub.registerReceiver({ name: 'Samsung TV' });
    const pairResult = hub.pair({ pin: '0000' });

    assert.strictEqual(pairResult.success, false);
    assert.ok(pairResult.error, 'Must provide human-readable error');
    assert.ok(pairResult.error.includes('PIN'), 'Error should mention PIN');
  });

  it('should dispatch playTrack command to receiver and update state', () => {
    const receiver = hub.registerReceiver({ name: 'Living Room TV' });
    const trackPayload = {
      videoId: 'test12345',
      title: 'Thành Phố Buồn',
      artist: 'Chế Linh',
      duration: '04:35',
      thumbnail: 'https://img.youtube.com/vi/test12345/hqdefault.jpg',
      streamUrl: '/api/preview/test12345'
    };

    let receivedEvent = null;
    const mockRes = {
      write: (data) => {
        receivedEvent = data;
      },
      on: () => {}
    };

    hub.subscribeEvents(receiver.receiverId, mockRes);
    const dispatchResult = hub.dispatchCommand(receiver.receiverId, {
      type: 'playTrack',
      payload: trackPayload
    });

    assert.strictEqual(dispatchResult.success, true);
    assert.ok(receivedEvent, 'Mock SSE response must receive dispatched command');
    assert.ok(receivedEvent.includes('playTrack'));
    assert.ok(receivedEvent.includes('Thành Phố Buồn'));

    const state = hub.getState(receiver.receiverId);
    assert.strictEqual(state.isPlaying, true);
    assert.strictEqual(state.currentTrack.title, 'Thành Phố Buồn');
  });

  it('should support play, pause, seek, and setVolume commands', () => {
    const receiver = hub.registerReceiver({ name: 'TCL TV' });

    hub.dispatchCommand(receiver.receiverId, { type: 'setVolume', payload: { volume: 75 } });
    let state = hub.getState(receiver.receiverId);
    assert.strictEqual(state.volume, 75);

    hub.dispatchCommand(receiver.receiverId, { type: 'pause' });
    state = hub.getState(receiver.receiverId);
    assert.strictEqual(state.isPlaying, false);

    hub.dispatchCommand(receiver.receiverId, { type: 'play' });
    state = hub.getState(receiver.receiverId);
    assert.strictEqual(state.isPlaying, true);

    hub.dispatchCommand(receiver.receiverId, { type: 'seek', payload: { position: 120 } });
    state = hub.getState(receiver.receiverId);
    assert.strictEqual(state.position, 120);
  });

  it('should automatically prune stale receivers beyond TTL', () => {
    const receiver = hub.registerReceiver({ name: 'Old TV' });
    // Artificially age the receiver
    const rcv = hub.receivers.get(receiver.receiverId);
    rcv.lastSeen = Date.now() - 15 * 60 * 1000; // 15 mins ago

    hub.cleanupInactive(10 * 60 * 1000);
    const active = hub.getActiveReceivers();
    assert.strictEqual(active.length, 0, 'Stale receiver must be pruned');
  });
});
