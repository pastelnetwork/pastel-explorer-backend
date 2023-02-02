import 'dotenv';

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

import { getDateErrorFormat } from '../utils/helpers';

const FRONTEND_SITE_URL =
  process.env.DEFAULT_ALLOWED_ORIGIN || 'https://explorer.pastel.network';

async function updateSenseScreenshots(imageHash: string): Promise<void> {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 1500 });

    const folder = path.join(__dirname, '../../public/senses');
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    const fileNameSave = `${imageHash}.png`;
    await page.goto(`${FRONTEND_SITE_URL}/sense/${imageHash}`);
    await page.waitForSelector('.echarts-for-react');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${folder}/${fileNameSave}` });
    await browser.close();
  } catch (error) {
    console.error(
      `Save the sense image error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    if (browser) {
      await browser.close();
    }
  }
}
export { updateSenseScreenshots };
