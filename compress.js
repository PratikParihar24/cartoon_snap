const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputBaseDir = './raw_cards';
const outputBaseDir = './public/assets';

function processDirectory(currentInputPath, currentOutputPath) {
    // 1. Create the output folder if it doesn't exist
    if (!fs.existsSync(currentOutputPath)) {
        fs.mkdirSync(currentOutputPath, { recursive: true });
    }

    // 2. Read everything inside the current folder
    const items = fs.readdirSync(currentInputPath);

    items.forEach(item => {
        const inputFilePath = path.join(currentInputPath, item);
        const stat = fs.statSync(inputFilePath);

        if (stat.isDirectory()) {
            // If the item is a folder (e.g., 'pixar'), dive into it recursively
            const newOutputPath = path.join(currentOutputPath, item);
            processDirectory(inputFilePath, newOutputPath);
        } else if (item.match(/\.(png|jpg|jpeg)$/i)) {
            // If the item is an image, compress it and save it as WebP
            const outputFilePath = path.join(currentOutputPath, `${item.split('.')[0]}.webp`);

            sharp(inputFilePath)
                .resize({ width: 400 }) // Scales resolution
                .webp({ quality: 80 })  // Converts to WebP
                .toFile(outputFilePath)
                .then(info => {
                    console.log(`✅ Optimized [${path.basename(currentOutputPath)}]: ${item} -> ${(info.size / 1024).toFixed(2)} KB`);
                })
                .catch(err => {
                    console.error(`❌ Failed to compress ${item}:`, err);
                });
        }
    });
}

console.log("Starting deep compression pipeline...");
processDirectory(inputBaseDir, outputBaseDir);