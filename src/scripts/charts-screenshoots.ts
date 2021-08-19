import 'dotenv';

import fs from 'fs';
// import path from 'path';
import puppeteer, { Page } from 'puppeteer';

import chartUrls from './constants/chart-urls';

const iPad = puppeteer.devices['iPad landscape'];

function delay(time: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('success');
    }, time);
  });
}

const FRONTEND_SITE_URL = (
  process.env.ALLOWED_ORIGINS || 'https://explorer.pastel.network'
).split(',')[0];

async function updateChartScreenshots(): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.emulate(iPad);
  await page.setViewport({ width: 1200, height: 1000 });
  let i = 0;
  const pageLength = chartUrls.length;
  for (; i < pageLength; i++) {
    const fileNameSave = `${chartUrls[i].split('/').pop()}.png`;
    await page.goto(`${FRONTEND_SITE_URL}${chartUrls[i]}`);
    await delay(3000);
    const [button] = await page.$x(
      "//button[contains(text(), 'Download PNG')]",
    );
    // get fist file
    let saved = false;
    page.on('response', async response => {
      let url = response.request().url();
      const contentType = response.headers()['content-type'];
      if (
        !saved &&
        contentType.endsWith('image/png') &&
        url.startsWith('data:image/png;base64,')
      ) {
        saved = true;
        url = url.replace('data:image/png;base64,', '');
        fs.writeFile(
          `src/public/charts/${fileNameSave}`,
          url,
          'base64',
          function (err) {
            if (err) {
              console.error(err);
              return;
            }
            console.error('The file was saved!');
          },
        );
      }
    });
    await autoScroll(page);
    await delay(3000);
    await button.click();
  }

  await browser.close();
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, scrollHeight);
      resolve('success');
    });
  });
}

// captureScreenshoots();

export { updateChartScreenshots };
