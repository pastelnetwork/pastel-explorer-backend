import { readFileSync } from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';

const connectionOptions = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'ormconfig.json')).toString(),
);

export const dataSourceCon: DataSource = new DataSource({
  ...connectionOptions,
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/entity/*.js'
      : 'src/entity/*.ts',
  ],
});
