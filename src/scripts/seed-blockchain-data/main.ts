import 'dotenv/config';

import { createConnection } from 'typeorm';

import { updateDatabaseWithBlockchainData } from './update-database';

createConnection().then(updateDatabaseWithBlockchainData);
