import { readFileSync } from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';

const connectionOptions = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'ormconfig.json')).toString(),
);

export const dataSourceCon: DataSource = new DataSource({
  ...connectionOptions,
  migrations: [],
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/entity/*.js'
      : 'src/entity/*.ts',
  ],
});

const connToDS = async () => {
  try {
    await dataSourceCon.initialize();
    console.log('Data Source has been initialized!');
    return dataSourceCon;
  } catch (err) {
    console.error('Error during Data Source initialization', err);
  }
};

export const dataSource = connToDS();
