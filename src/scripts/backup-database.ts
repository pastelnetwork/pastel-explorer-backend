import 'dotenv';

import Database from 'better-sqlite3';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

import { getDateErrorFormat } from '../utils/helpers';

export async function backupDatabase(): Promise<void> {
  try {
    const backupFolder = process.env.BACKUP_DATABASE_FOLDER;
    const databaseFile = process.env.DATABASE_FILE;
    const totalFileBackup = Number(process.env.TOTAL_BACKUP_DATABASE_FILE);
    if (!databaseFile || !totalFileBackup) {
      return;
    }
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
    if (results.length > totalFileBackup) {
      const newFiles = results.sort((a, b) => a.date - b.date);
      for (let i = 0; i < newFiles.length - totalFileBackup; i++) {
        if (newFiles[i].file) {
          fs.unlinkSync(newFiles[i].file);
        }
      }
    }

    const db = new Database(databaseFile, { verbose: console.log });
    await db.backup(path.join(backupFolder, `${fileName}.sqlite`));
    console.log(`Backup database success >>> ${getDateErrorFormat()}`);
  } catch (error) {
    console.error(
      `Backup database error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
