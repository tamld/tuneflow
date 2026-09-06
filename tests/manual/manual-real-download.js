const fs = require('fs');
const path = require('path');

async function testRealDownload() {
  console.log('🚀 Testing Real End-to-End Download & MP3 Transcode on http://localhost:3000...');

  // 1. Add item to queue
  const res = await fetch('http://localhost:3000/api/queue/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      uploader: 'Rick Astley',
      duration: 213,
      format: 'mp3'
    })
  });

  const data = await res.json();
  console.log('✅ Queue Add Response:', data);
  if (!data.success) throw new Error('Failed to add to queue');

  const itemId = data.item.id;

  // 2. Poll until completed (timeout 60s)
  console.log('⏳ Waiting for download and FFmpeg 320kbps transcoding to complete...');
  let completed = false;
  const startTime = Date.now();

  while (Date.now() - startTime < 60000) {
    await new Promise(r => setTimeout(r, 2000));
    const listRes = await fetch('http://localhost:3000/api/queue/list');
    const listData = await listRes.json();
    const list = listData.items || [];
    const item = list.find(i => i.id === itemId);

    if (item) {
      console.log(`📊 Progress: ${item.progress}% | Status: ${item.status} | Speed: ${item.speed || 'N/A'}`);
      if (item.status === 'completed') {
        completed = true;
        break;
      }
      if (item.status === 'failed') {
        throw new Error(`Download failed with error: ${item.error}`);
      }
    }
  }

  if (!completed) throw new Error('Download timed out after 60s');

  // 3. Verify physical MP3 file
  const downloadsDir = path.join(__dirname, '..', 'downloads');
  const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.mp3'));
  console.log('📂 Downloaded MP3 files on disk:', files);

  if (files.length === 0) throw new Error('No MP3 file was created in downloads folder!');

  const filePath = path.join(downloadsDir, files[0]);
  const stats = fs.statSync(filePath);
  console.log(`✅ Physical File: ${files[0]}`);
  console.log(`✅ File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (Real physical audio file)`);

  if (stats.size < 100000) throw new Error('File size too small to be a valid MP3');

  console.log('🎉 REAL PHYSICAL DOWNLOAD & MP3 TRANSCODING VALIDATION: 100% PASSED!');
}

testRealDownload().catch(err => {
  console.error('❌ Download validation error:', err);
  process.exit(1);
});
