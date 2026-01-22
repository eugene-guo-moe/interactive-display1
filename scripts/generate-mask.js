// Generate a PNG mask for inpainting
// 540x960 black background with white circle at (270, 470) radius 60

const fs = require('fs');
const path = require('path');

// We'll use a simple approach - create a PPM image and convert to PNG
// Or use raw PNG creation

// For simplicity, let's create the mask using canvas in Node
// First check if we have canvas available

try {
  const { createCanvas } = require('canvas');

  const width = 540;
  const height = 960;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // White circle at bottom center of image area
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(270, 470, 60, 0, Math.PI * 2);
  ctx.fill();

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', 'mask-icon.png');
  fs.writeFileSync(outputPath, buffer);

  // Also output as base64 for embedding
  const base64 = buffer.toString('base64');
  console.log('Mask saved to:', outputPath);
  console.log('\nBase64 (first 100 chars):', base64.substring(0, 100) + '...');
  console.log('\nFull Base64 length:', base64.length);

  // Save base64 to a file for easy copying
  fs.writeFileSync(path.join(__dirname, 'mask-base64.txt'), base64);
  console.log('Base64 saved to scripts/mask-base64.txt');

} catch (err) {
  console.log('canvas not available, trying sharp...');

  try {
    const sharp = require('sharp');

    const width = 540;
    const height = 960;

    // Create SVG and convert to PNG
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="black"/>
        <circle cx="270" cy="470" r="60" fill="white"/>
      </svg>
    `;

    sharp(Buffer.from(svg))
      .png()
      .toBuffer()
      .then(buffer => {
        const outputPath = path.join(__dirname, '..', 'public', 'mask-icon.png');
        fs.writeFileSync(outputPath, buffer);

        const base64 = buffer.toString('base64');
        console.log('Mask saved to:', outputPath);
        console.log('Base64 length:', base64.length);
        fs.writeFileSync(path.join(__dirname, 'mask-base64.txt'), base64);
        console.log('Base64 saved to scripts/mask-base64.txt');
      });

  } catch (err2) {
    console.log('sharp not available either');
    console.log('Please install: npm install canvas or npm install sharp');

    // Fallback: create a minimal valid PNG manually
    // This is a 1x1 black PNG as a placeholder
    console.log('\nFallback: Creating placeholder...');
  }
}
