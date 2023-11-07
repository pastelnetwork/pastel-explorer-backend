import 'dotenv';

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

import { getDateErrorFormat } from '../utils/helpers';

const FRONTEND_SITE_URL =
  process.env.DEFAULT_ALLOWED_ORIGIN || 'https://explorer.pastel.network';

async function updateSenseScreenshots(
  imageHash: string,
  transactionHash: string,
): Promise<void> {
  let browser = null;
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
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 1500 });

    const folder = path.join(__dirname, '../../public/senses');
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    const fileNameSave = `${imageHash}-${transactionHash}.png`;
    await page.goto(
      `${FRONTEND_SITE_URL}/sense?txid=${transactionHash}&hash=${imageHash}`,
    );
    await page.waitForSelector('.echarts-for-react');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${folder}/${fileNameSave}` });
    await browser.close();
  } catch (error) {
    console.error(
      `Save the sense image (${FRONTEND_SITE_URL}/sense?txid=${transactionHash}&hash=${imageHash}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    if (browser) {
      await browser.close();
    }
  }
}
export { updateSenseScreenshots };
