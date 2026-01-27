const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set Viewport to 1080x1920 (Typical Phone Screenshot Size)
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

    const baseUrl = 'http://localhost:3000';
    const outputDir = path.join(__dirname, '..', 'Release_Package_v1.1.0');

    // Create output dir if not exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const routes = [
        { name: '01_Home', path: '/' },
        { name: '02_Discovery', path: '/discovery' },
        { name: '03_Chat', path: '/chat' },
        { name: '04_Pattern', path: '/pattern' }
    ];

    console.log('📸 Starting screenshot capture...');

    for (const route of routes) {
        try {
            console.log(`Navigating to ${route.name}...`);
            await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle0', timeout: 60000 });

            // Wait a bit for animations
            await new Promise(r => setTimeout(r, 2000));

            const filePath = path.join(outputDir, `Screenshot_${route.name}.png`);
            await page.screenshot({ path: filePath });
            console.log(`✅ Saved: ${filePath}`);
        } catch (e) {
            console.error(`❌ Failed to capture ${route.name}:`, e.message);
        }
    }

    await browser.close();
    console.log('🎉 All screenshots captured!');
})();
