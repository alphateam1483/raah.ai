import puppeteer from 'puppeteer-core';
import http from 'http';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\ANSHU KUMAR YADAV\\.gemini\\antigravity\\brain\\57d91da6-3a3a-431d-8f10-dd46b4aabfcd\\screenshots';
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function startStaticServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(DIST_DIR, reqPath);

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          const fallback = path.join(DIST_DIR, 'index.html');
          fs.readFile(fallback, (fErr, data) => {
            if (fErr) {
              res.writeHead(404);
              res.end('Not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
              res.end(data);
            }
          });
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.listen(port, () => {
      console.log(`Static server running on http://localhost:${port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('--- STARTING PHASE 2B BROWSER VERIFICATION ---');
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const PORT = 5555;
  const server = await startStaticServer(PORT);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2 });

  try {
    console.log(`Navigating to http://localhost:${PORT} ...`);
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded' });
    await wait(1500);

    // 1. Run default search (SSM to NDLS)
    console.log('Searching SSM to NDLS...');
    await page.click('.find-raah-btn');
    await wait(800);

    // Screenshot of Mobile results showing Route Panel at top and Reach Station on Nearby cards
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09_phase2b_mobile_route_panel_360px.png'),
    });
    console.log('Saved 09_phase2b_mobile_route_panel_360px.png');

    // Verify Route Panel exists
    const panelTitle = await page.$eval('.route-panel-title', (el) => el.textContent);
    console.log('Route Panel Title:', panelTitle);

    // Verify Reach Station section exists on Nearby Card
    const reachTitle = await page.$eval('.reach-title', (el) => el.textContent).catch(() => null);
    console.log('Reach Station Row Title:', reachTitle);

    // Check reach options count on first card
    const reachOptions = await page.$$eval('.reach-option-row', (rows) =>
      rows.map((r) => r.textContent.trim())
    );
    console.log('Reach options count on first card:', reachOptions.length);
    reachOptions.forEach((t, i) => console.log(`  Option ${i + 1}:`, t.replace(/\s+/g, ' ')));

    // 2. Select a different reach option (e.g. train option if available) and observe Route Panel update
    const optionButtons = await page.$$('.reach-option-row');
    if (optionButtons.length > 1) {
      console.log('Tapping second reach option...');
      await optionButtons[1].click();
      await wait(500);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '10_phase2b_reach_option_selected.png'),
      });
      console.log('Saved 10_phase2b_reach_option_selected.png');
    }

    // 3. Select a Two-train card and verify Route Panel updates to show 2-train journey
    console.log('Switching to Two trains tab...');
    await page.click('#tab-two-train');
    await wait(600);

    const twoTrainPanelTitle = await page.$eval('.route-panel-title', (el) => el.textContent);
    console.log('Two-train Route Panel Title:', twoTrainPanelTitle);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11_phase2b_two_trains_route_panel.png'),
    });
    console.log('Saved 11_phase2b_two_trains_route_panel.png');

    // 4. Select a Direct train row and verify Route Panel updates
    console.log('Clicking first direct train row...');
    const directRows = await page.$$('.direct-train-row');
    if (directRows.length > 0) {
      await directRows[0].click();
      await wait(500);

      const directPanelTitle = await page.$eval('.route-panel-title', (el) => el.textContent);
      console.log('Direct Train Route Panel Title:', directPanelTitle);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '12_phase2b_direct_train_route_panel.png'),
      });
      console.log('Saved 12_phase2b_direct_train_route_panel.png');
    }

    // 5. Desktop screenshot showing full Route Panel and reach options
    console.log('Testing Desktop 800px view...');
    await page.setViewport({ width: 800, height: 950 });
    await page.click('#tab-nearby');
    await wait(600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '13_phase2b_desktop_full_results.png'),
      fullPage: true,
    });
    console.log('Saved 13_phase2b_desktop_full_results.png');

    console.log('Phase 2b browser verification complete!');
  } catch (err) {
    console.error('Browser testing error:', err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
}

run();

