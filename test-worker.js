// Test the worker's FAL.ai integration via Cloudflare
const https = require('https');

const testData = JSON.stringify({
  // Small valid PNG - 8x8 red square
  photo: "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8DAwMAAAA0QAgFfqvlsAAAAAElFTkSuQmCC",
  prompt: "A beautiful nostalgic Singapore kampung village with wooden houses on stilts, warm sepia tones",
  timePeriod: "past"
});

const options = {
  hostname: 'history-vs-future-worker.eugene-ff3.workers.dev',
  port: 443,
  path: '/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🚀 Testing worker at:', options.hostname);
console.log('📝 Sending prompt:', JSON.parse(testData).prompt.substring(0, 50) + '...');
console.log('⏳ Waiting for response (this may take 10-30 seconds)...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('📦 Response:', JSON.stringify(json, null, 2));

      if (json.imageUrl) {
        console.log('\n✅ SUCCESS! Image generated at:', json.imageUrl);
      } else if (json.error) {
        console.log('\n❌ ERROR:', json.error);
        if (json.details) {
          console.log('   Details:', json.details);
        }
      }
    } catch (e) {
      console.log('📦 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.setTimeout(60000, () => {
  console.log('⏰ Request timed out after 60 seconds');
  req.destroy();
});

req.write(testData);
req.end();
