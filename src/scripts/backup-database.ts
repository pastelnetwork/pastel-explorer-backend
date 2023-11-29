import 'dotenv';

import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

import { getDateErrorFormat } from '../utils/helpers';

export async function backupDatabase(): Promise<void> {
  try {
    const backupFolder = process.env.BACKUP_DATABASE_FOLDER;
    const databaseFile = process.env.DATABASE_FILE;
    const fileName = `database.${dayjs().format('YYYYMMDDHHmmss')}`;

    const files = fs.readdirSync(backupFolder);
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const stats = fs.statSync(`${backupFolder}/${files[i]}`);
      results.push({
        file: `${backupFolder}/${files[i]}`,
        date: dayjs(stats?.birthtime).valueOf(),
      });
    }
    if (results.length >= 3) {
      const newFiles = results.sort((a, b) => a.date - b.date);
      for (let i = 0; i < newFiles.length - 2; i++) {
        if (newFiles[i].file) {
          fs.unlinkSync(newFiles[i].file);
        }
      }
    }
    fs.copyFileSync(databaseFile, `${backupFolder}/${fileName}.sqlite`);
    console.log(`Created ${fileName} successfully`);
  } catch (error) {
    console.error(
      `Backup database error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
