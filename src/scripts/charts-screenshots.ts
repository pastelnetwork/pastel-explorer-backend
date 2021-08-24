import 'dotenv';

import fs from 'fs';
import path from 'path';
import puppeteer, { Page } from 'puppeteer';

import chartUrls from './constants/chart-urls';

const FRONTEND_SITE_URL = (
  process.env.ALLOWED_ORIGINS || 'https://explorer.pastel.network'
).split(',')[0];

async function updateChartScreenshots(): Promise<void> {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 800 });

    const pageLength = chartUrls.length;
    try {
      for (let i = 0; i < pageLength; i++) {
        const timeStart = new Date().getTime();
        const fileNameSave = `${chartUrls[i].split('/').pop()}.png`;
        const client = await page.target().createCDPSession();
        await page.goto(`${FRONTEND_SITE_URL}${chartUrls[i]}`);
        // Waiting the page loaded
        await page.waitForTimeout(3000);
        const [button] = await page.$x(
          "//button[contains(text(), 'Download PNG')]",
        );
        const folder = path.join(
          __dirname,
          '../../public/charts',
          chartUrls[i].split('/').pop(),
        );
        await client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: folder,
        });
        // scroll to the bottom to download the chart
        await autoScroll(page);
        // waiting for the scroll to the bottom
        await page.waitForTimeout(3000);
        if (button) {
          await button.click();
          // await the file downloaded
          await page.waitForTimeout(3000);

          if (fs.existsSync(folder)) {
            fs.readdirSync(folder).forEach(file => {
              if (file !== fileNameSave) {
                fs.renameSync(`${folder}/${file}`, `${folder}/${fileNameSave}`);
              }
            });
          }
          console.error(
            `The file was saved! ${fileNameSave} | ${
              new Date().getTime() - timeStart
            }ms`,
          );
        }
      }
      await browser.close();
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Update the preview charts error >>>', error.message);
  }
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
export { updateChartScreenshots };
