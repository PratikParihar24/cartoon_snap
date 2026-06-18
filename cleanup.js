const fs = require('fs');
const path = require('path');

// The folder we want to clean out
const targetDir = './public/assets';

function cleanDirectory(currentPath) {
    if (!fs.existsSync(currentPath)) {
        console.log(`Directory ${currentPath} does not exist.`);
        return;
    }

    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            // If it's a folder (like 'pixar'), dive into it recursively
            cleanDirectory(itemPath);
        } else if (item.match(/\.(png|jpg|jpeg)$/i)) {
            // If it's an old image format, delete it
            fs.unlinkSync(itemPath);
            console.log(`🗑️ Deleted: ${itemPath}`);
        }
    });
}

console.log("Starting asset cleanup...");
cleanDirectory(targetDir);
console.log("✅ Cleanup complete! Only optimized files remain.");