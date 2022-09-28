import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

export const getFileName = async (): Promise<string | null> => {
  const dir = './logs';
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir);
  }

  const fileName = path.join(dir, `error-${dayjs().format('DDMMYYYY')}.log`);
  if (!fs.existsSync(fileName)) {
    fs.createWriteStream(fileName);
  }

  return fileName;
};

export const readLog = async (): Promise<string> => {
  const fileName = await getFileName();

  try {
    if (fileName) {
      const data = await fs.promises.readFile(fileName);

      if (data.length) {
        return data.toString();
      }
    }

    return '';
  } catch (err) {
    return '';
  }
};

export const writeLog = async (content: string): Promise<void> => {
  if (content) {
    const fileName = await getFileName();

    if (fileName) {
      const oldContent = await readLog();
      const now = new Date();
      await fs.promises.writeFile(
        fileName,
        `${now.toString()}: ${content}\n${oldContent}`,
      );
    }
  }
};
