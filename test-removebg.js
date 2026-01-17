const https = require('https');

// Test remove.bg with a real image URL (their API accepts URLs too)
const testData = JSON.stringify({
  image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Brad_Pitt_2019_by_Glenn_Francis.jpg/440px-Brad_Pitt_2019_by_Glenn_Francis.jpg",
  size: "auto"
});

const options = {
  hostname: 'api.remove.bg',
  port: 443,
  path: '/v1.0/removebg',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.REMOVE_BG_KEY || 'YOUR_KEY_HERE'
  }
};

console.log('🧪 Testing remove.bg API...');
console.log('Note: This tests from local network, not Cloudflare\n');

const req = https.request(options, (res) => {
  let data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ remove.bg working! Received', Buffer.concat(data).length, 'bytes');
    } else {
      console.log('❌ Error:', Buffer.concat(data).toString());
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(testData);
req.end();
