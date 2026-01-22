// Generate a PNG mask for inpainting at 2x scale (1080x1920)
// to match the card captured with pixelRatio: 2

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// 2x scale: 540*2 = 1080, 960*2 = 1920
const width = 1080;
const height = 1920;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Black background
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, width, height);

// White circle at bottom center of image area (scaled 2x)
// Original position: (270, 470) with radius 60
// At 2x: (540, 940) with radius 120
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(540, 940, 120, 0, Math.PI * 2);
ctx.fill();

// Save as PNG
const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, '..', 'public', 'mask-icon.png');
fs.writeFileSync(outputPath, buffer);

// Output as base64 for embedding
const base64 = buffer.toString('base64');
console.log('Mask saved to:', outputPath);
console.log('Dimensions:', width, 'x', height);
console.log('Base64 length:', base64.length);

// Save base64 to a file for easy copying
fs.writeFileSync(path.join(__dirname, 'mask-base64.txt'), base64);
console.log('Base64 saved to scripts/mask-base64.txt');
