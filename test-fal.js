const https = require('https');

const testData = JSON.stringify({
  prompt: "A nostalgic Singapore kampung village with wooden houses on stilts, warm sepia tones, vintage aesthetic"
});

const options = {
  hostname: 'history-vs-future-worker.eugene-ff3.workers.dev',
  port: 443,
  path: '/test-fal',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🧪 Testing FAL.ai via Cloudflare Worker...');
console.log('⏳ This may take 10-30 seconds...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));

      if (json.success && json.imageUrl) {
        console.log('\n✅ FAL.ai is working! Image URL:', json.imageUrl);
      } else {
        console.log('\n❌ FAL.ai error:', json.error);
      }
    } catch (e) {
      console.log('Raw:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.setTimeout(60000, () => { console.log('Timeout'); req.destroy(); });
req.write(testData);
req.end();
