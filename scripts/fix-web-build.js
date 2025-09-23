#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('🔧 Fixing web build for ES modules...');

try {
  // Check if dist/index.html exists
  if (!fs.existsSync(indexPath)) {
    console.error('❌ dist/index.html not found. Run "npm run build:web" first.');
    process.exit(1);
  }

  // Read the HTML file
  let html = fs.readFileSync(indexPath, 'utf8');

  // Fix the script tag to load as module
  html = html.replace(
    /<script src="([^"]+)" defer><\/script>/g,
    '<script type="module" src="$1"></script>'
  );

  // Add mobile-centered layout styles
  const mobileStyles = `
    <style id="mobile-web-layout">
      /* Mobile-centered layout for web */
      @media (min-width: 768px) {
        body {
          background-color: #e5e5e5;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }

        #root {
          width: 430px;
          max-width: 430px;
          min-height: 100vh;
          background-color: white;
          overflow: hidden;
          position: relative;
        }
      }

      /* Keep mobile styles unchanged */
      @media (max-width: 767px) {
        body {
          overflow: hidden;
        }

        #root {
          display: flex;
          height: 100%;
          flex: 1;
        }
      }
    </style>`;

  // Insert mobile styles after the expo-reset styles
  html = html.replace(
    '</style>',
    '</style>' + mobileStyles
  );

  // Write the fixed HTML back
  fs.writeFileSync(indexPath, html);

  console.log('✅ Web build fixed! The app should now load without import.meta errors.');
  console.log('📍 Test it at: http://localhost:8080');
  console.log('🚀 Ready for deployment!');

} catch (error) {
  console.error('❌ Error fixing web build:', error.message);
  process.exit(1);
}