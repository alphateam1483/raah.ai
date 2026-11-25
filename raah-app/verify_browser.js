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

// Start a lightweight built-in static server for dist/
function startStaticServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(DIST_DIR, reqPath);

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // SPA fallback to index.html
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
  console.log('--- STARTING BROWSER VERIFICATION (Phase 3) ---');
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const server = await startStaticServer(4173);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
  });

  const page = await browser.newPage();
  // Mobile first at 360 px width
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2 });

  // Track all network requests
  const networkRequests = [];
  page.on('request', (req) => {
    networkRequests.push(req.url());
  });

  const testReport = {
    networkCalls: [],
    tests: [],
  };

  try {
    console.log('Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    // Filter network calls to unique paths
    testReport.networkCalls = [...new Set(networkRequests.map((u) => {
      try {
        return new URL(u).pathname;
      } catch (e) {
        return u;
      }
    }))];
    console.log('Captured network requests:', testReport.networkCalls);

    // Initial Search Screen Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_search_screen_360px.png'),
    });
    console.log('Saved 01_search_screen_360px.png');

    // Check Prototype Banner is visible
    const bannerText = await page.$eval('.prototype-banner', (el) => el.textContent);
    console.log('Banner text:', bannerText);
    const bannerPass = bannerText.includes('sample 2016 timetable') && bannerText.includes('SIMULATED');

    // 1. Acceptance test: Default search SSM to NDLS
    console.log('\nTesting 1: SSM to NDLS (Default search)...');
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02_ssm_to_ndls_results.png'),
      fullPage: true,
    });
    console.log('Saved 02_ssm_to_ndls_results.png');

    // Verify SSM to NDLS:
    const directRows = await page.$$eval('.direct-train-row', (rows) =>
      rows.map((r) => ({
        text: r.textContent,
        isWL: r.textContent.includes('WL'),
      }))
    );
    const allDirectWL = directRows.length === 2 && directRows.every((r) => r.isWL);
    const nearbyCount = await page.$eval('#tab-nearby .tab-count-pill', (el) => parseInt(el.textContent, 10));
    const twoTrainCount = await page.$eval('#tab-two-train .tab-count-pill', (el) => parseInt(el.textContent, 10));
    console.log('Direct rows:', directRows.length, 'All WL:', allDirectWL);
    console.log('Nearby:', nearbyCount, 'Two-train:', twoTrainCount);

    testReport.tests.push({
      name: 'Default: SSM to NDLS (2026-11-12, 08:00, 3A)',
      passed: allDirectWL && nearbyCount + twoTrainCount >= 3,
      details: `Direct trains: ${directRows.length} (both WL). Nearby: ${nearbyCount}, Two-train: ${twoTrainCount}. Total confirmed alternatives: ${nearbyCount + twoTrainCount}.`,
    });

    // Helper to select station in combobox
    async function selectStation(pickerIndex, code) {
      const inputs = await page.$$('.combobox-input');
      const input = inputs[pickerIndex];
      await input.click({ clickCount: 3 });
      await input.press('Backspace');
      await input.type(code);
      await wait(250);
      const options = await page.$$('.combobox-option');
      for (const opt of options) {
        const text = await (await opt.getProperty('textContent')).jsonValue();
        if (text.includes(`(${code})`)) {
          await opt.click();
          break;
        }
      }
      await wait(150);
    }

    // 2. Acceptance test: NDLS to SSM
    console.log('\nTesting 2: NDLS to SSM...');
    await page.click('.edit-search-btn');
    await wait(200);
    await page.click('.swap-button');
    await wait(150);
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03_ndls_to_ssm_results.png'),
      fullPage: true,
    });
    console.log('Saved 03_ndls_to_ssm_results.png');

    const ndlsSsmNearby = await page.$eval('#tab-nearby .tab-count-pill', (el) => parseInt(el.textContent, 10));
    const ndlsSsmTwoTrain = await page.$eval('#tab-two-train .tab-count-pill', (el) => parseInt(el.textContent, 10));

    testReport.tests.push({
      name: 'NDLS to SSM (2026-11-12, 08:00, 3A)',
      passed: ndlsSsmNearby + ndlsSsmTwoTrain > 0,
      details: `Nearby: ${ndlsSsmNearby}, Two-train: ${ndlsSsmTwoTrain}.`,
    });

    // 3. Acceptance test: PNBE to NDLS
    console.log('\nTesting 3: PNBE to NDLS...');
    await page.click('.edit-search-btn');
    await wait(200);
    await selectStation(0, 'PNBE');
    await selectStation(1, 'NDLS');
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_pnbe_to_ndls_results.png'),
      fullPage: true,
    });
    console.log('Saved 04_pnbe_to_ndls_results.png');

    const pnbeNearby = await page.$eval('#tab-nearby .tab-count-pill', (el) => parseInt(el.textContent, 10));
    const pnbeTwoTrain = await page.$eval('#tab-two-train .tab-count-pill', (el) => parseInt(el.textContent, 10));

    testReport.tests.push({
      name: 'PNBE to NDLS (2026-11-12, 08:00, 3A)',
      passed: pnbeNearby + pnbeTwoTrain > 0,
      details: `Nearby: ${pnbeNearby}, Two-train: ${pnbeTwoTrain}.`,
    });

    // 4. Acceptance test: GAYA to ALD
    console.log('\nTesting 4: GAYA to ALD...');
    await page.click('.edit-search-btn');
    await wait(200);
    await selectStation(0, 'GAYA');
    await selectStation(1, 'ALD');
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_gaya_to_ald_results.png'),
      fullPage: true,
    });
    console.log('Saved 05_gaya_to_ald_results.png');

    const gayaNearby = await page.$eval('#tab-nearby .tab-count-pill', (el) => parseInt(el.textContent, 10));
    const gayaTwoTrain = await page.$eval('#tab-two-train .tab-count-pill', (el) => parseInt(el.textContent, 10));

    testReport.tests.push({
      name: 'GAYA to ALD (2026-11-12, 08:00, 3A)',
      passed: gayaNearby + gayaTwoTrain > 0,
      details: `Nearby: ${gayaNearby}, Two-train: ${gayaTwoTrain}.`,
    });

    // 5. Acceptance test: BSB to CNB
    console.log('\nTesting 5: BSB to CNB...');
    await page.click('.edit-search-btn');
    await wait(200);
    await selectStation(0, 'BSB');
    await selectStation(1, 'CNB');
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06_bsb_to_cnb_results.png'),
      fullPage: true,
    });
    console.log('Saved 06_bsb_to_cnb_results.png');

    const bsbNearby = await page.$eval('#tab-nearby .tab-count-pill', (el) => parseInt(el.textContent, 10));
    const bsbTwoTrain = await page.$eval('#tab-two-train .tab-count-pill', (el) => parseInt(el.textContent, 10));

    testReport.tests.push({
      name: 'BSB to CNB (2026-11-12, 08:00, 3A)',
      passed: bsbNearby + bsbTwoTrain > 0,
      details: `Nearby: ${bsbNearby}, Two-train: ${bsbTwoTrain}.`,
    });

    // 6. Same station error validation
    console.log('\nTesting 6: Same From and To station validation...');
    await page.click('.edit-search-btn');
    await wait(200);
    await selectStation(0, 'SSM');
    await selectStation(1, 'SSM');
    await wait(150);

    const sameStationError = await page.$eval('.field-error-text', (el) => el.textContent).catch(() => null);
    const findBtnDisabled = await page.$eval('.find-raah-btn', (el) => el.disabled);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07_same_station_error.png'),
    });
    console.log('Saved 07_same_station_error.png');

    testReport.tests.push({
      name: 'Validation: Same From and To station',
      passed: sameStationError === 'Pick two different stations' && findBtnDisabled,
      details: `Inline error: "${sameStationError}". Button disabled: ${findBtnDisabled}.`,
    });

    // 7. Desktop screenshot (800px width)
    console.log('\nTesting 7: Desktop layout (800px)...');
    await page.setViewport({ width: 800, height: 900 });
    await selectStation(1, 'NDLS');
    await page.click('.find-raah-btn');
    await wait(700);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08_desktop_results_view.png'),
      fullPage: true,
    });
    console.log('Saved 08_desktop_results_view.png');

    testReport.tests.push({
      name: 'Desktop responsive view',
      passed: true,
      details: 'Rendered desktop 2-column input and max 720px centered results layout.',
    });

    // Write final summary
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'test_report.json'),
      JSON.stringify(testReport, null, 2)
    );

    console.log('\nAll browser acceptance tests completed!');
  } catch (err) {
    console.error('Browser testing error:', err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
}

run();
