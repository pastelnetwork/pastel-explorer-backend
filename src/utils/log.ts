import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

export const getFileName = async (name = ''): Promise<string | null> => {
  const dir = './logs';
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir);
  }

  const fileName = path.join(
    dir,
    name || `error-${dayjs().format('DDMMYYYY')}.log`,
  );
  if (!fs.existsSync(fileName)) {
    fs.createWriteStream(fileName);
  }

  return fileName;
};

export const readLog = async (name = ''): Promise<string> => {
  const fileName = await getFileName(name);

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

export const writeLog = async (
  content: string,
  name = '',
  isMerge = true,
): Promise<void> => {
  if (content) {
    const fileName = await getFileName(name);

    if (fileName) {
      const oldContent = await readLog(name);
      const now = new Date();
      if (isMerge) {
        await fs.promises.writeFile(
          fileName,
          `${now.toString()}: ${content}\n${oldContent}`,
        );
      } else {
        await fs.promises.writeFile(fileName, content);
      }
    }
  }
};
