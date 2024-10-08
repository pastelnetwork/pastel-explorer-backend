import 'dotenv';

import fs from 'fs';
import path from 'path';
import puppeteer, { Page } from 'puppeteer';

import { delay, getDateErrorFormat } from '../utils/helpers';
import chartUrls from './constants/chart-urls';

const FRONTEND_SITE_URL = (
  process.env.ALLOWED_ORIGINS || 'https://explorer.pastel.network'
).split(',')[0];

// The suggestion: https://stackoverflow.com/questions/51529332/puppeteer-scroll-down-until-you-cant-anymore

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve('success');
        }
      }, 100);
    });
  });
}
let isUpdating = false;

async function updateChartScreenshots(): Promise<void> {
  if (isUpdating) {
    return;
  }
  isUpdating = true;
  let browser = null;
  let executablePath = {};
  if (process.env.CHROMIUM_BROWSER_PATH) {
    executablePath = {
      executablePath: '/usr/bin/chromium-browser',
    };
  }
  try {
    const pageLength = chartUrls.length;
    for (let i = 0; i < pageLength; i++) {
      try {
        browser = await puppeteer.launch({
          headless: true,
          userDataDir: '/dev/null',
          args: [
            '--incognito',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--enable-gpu',
          ],
          ignoreDefaultArgs: ['--disable-extensions'],
          ...executablePath,
        });
        const page = await browser.newPage();

        await page.setViewport({ width: 1194, height: 800 });
        const timeStart = new Date().getTime();
        const fileNameSave = `${chartUrls[i].split('/').pop()}.png`;
        const client = await page.target().createCDPSession();
        await page.goto(`${FRONTEND_SITE_URL}${chartUrls[i]}`);
        // Waiting the chart component loaded
        try {
          await page.waitForSelector('.echarts-for-react', {
            visible: true,
          });
        } catch (error) {
          console.log(
            'Waiting the chart component loaded error',
            error.message,
          );
        }

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
        await page.$$eval('button', buttons => {
          for (const button of buttons) {
            if (button.textContent === 'Download PNG') {
              button.click();
              break;
            }
          }
        });
        // await the file downloaded
        await delay(3000);
        fs.stat(folder, function (err) {
          if (!err) {
            fs.readdir(folder, (err, files) => {
              if (!err) {
                files.forEach(file => {
                  if (file !== fileNameSave) {
                    fs.renameSync(
                      `${folder}/${file}`,
                      `${folder}/${fileNameSave}`,
                    );
                  }
                });
              }
            });
          }
          console.log(
            `The file was saved! ${fileNameSave} | ${
              new Date().getTime() - timeStart
            }ms`,
          );
        });

        await browser.close();
        browser = null;
      } catch (error) {
        console.error(
          `Update the chart ${chartUrls[i]
            .split('/')
            .pop()} error >>> ${getDateErrorFormat()} >>>`,
          error,
        );
        if (browser) {
          await browser.close();
          browser = null;
        }
      }
    }
  } catch (error) {
    console.error(
      `Update the preview charts error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    if (browser) {
      await browser.close();
      browser = null;
    }
  }
  isUpdating = false;
}
export { updateChartScreenshots };
