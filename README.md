# Pastel explorer - backend

This is backend application that saves the blockchain data into SQLite and returns block, transaction and address data as REST GET endpoints for frontend visualization.

It's designed to integrate with Pastel ([pastel.network](https://pastel.network)) cryptocurrency but it should work for all Bitcoin-like currencies like Bitcoin, Zcash.

## Available Endpoints

1. Get all events on particular wallet address

`GET /v1/addresses/PtdbJv9yBiK31MrxXrzdEjLkYZu7jeyfKiq?limit=100&offset=0`

2. List blocks (from latest to oldests)

`GET /v1/blocks?limit=10&offset=0&sortDirection=DESC&sortBy=difficulty`

3. Get block by blockHash

`GET /v1/blocks/0000000269c2f0a36f3599bb140162680d449750bb268bd6cea9b5ea347435ed`

4. Get transactions

`GET /v1/transactions?limit=10&offset=0&sortDirection=DESC&sortBy=totalAmount`

5. Get transaction by txid (transaction hash)

`GET /v1/transactions/0c5118a7bc7a6bc1f8851217424796c4c6e00552ed05f0c35ce72f4a1f86463e`

6. Get top 100 addresses rank (by balance)

`GET /v1/addresses/rank/100`

7. Search by either block hash, block height, transaction hash, or address

`GET /v1/search?query=0c5118`

8. Get peer nodes info (with IP, country, city etc.)

`GET /v1/network`

## Available scripts

To run script, in terminal type `yarn {script}`.

| Script                            | Description                                                      | Note                                         |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `build`                           | Builds app in prod mode                                          |                                              |
| `preinstall`                      | Checks is yarn was used package manager                          | It runs automatically before every install   |
| `seedblockchain`                  | Runs a script to synchronize blockchain data with sqlite         |                                              |
| `start`                           | Starts app locally                                               |                                              |
| `lint`                            | Checks linter rules                                              |                                              |
| `type-check`                      | Checks TypeScript types                                          |                                              |
| `typeorm       `                  | Helper to run migration commands                                 |                                              |

## DB migrations

If you want to create a new Entity or add some fields to existing entities you need to create a migration file.  

```bash
yarn typeorm migration:generate -n NameOfMigration
```

Run migrations:  

```bash
yarn typeorm migration:run
```

## Useful docs

- [Pastel wiki](https://pastel.wiki/en/home/)
- [How to run pastel node](https://pastel.wiki/en/home/how-to-start-mn)


## Development

### Prerequisites

- [Node.js](https://nodejs.org/en/) >= 12
- [Yarn](https://classic.yarnpkg.com/lang/en/) >=1.22
- `pasteld` node running and operational

### Prepare dotenv

Create dotenv file from `.env.example` and fill the secrets

| Secret                      | Description                  |
| --------------------------- | ---------------------------- |
| RPC_HOST                    | IP/Host name of RPC node     |
| RPC_PORT                    | PORT of RPC node             |
| RPC_USERNAME                | USERNAME of RPC node         |
| RPC_PASSWORD                | PASSWORD of RPC node         |
| PORT                        | PORT that API will listen on |
| NODE_ENV                    | development/production       |
| FRONTEND_URL                | Frontend website url         |

### Running the app

```bash
# Install deps
yarn
# Run migrations
yarn typeorm migration:run
# Start the app
yarn start
```

## Production Deployment

- Install node lts version via nvm, install yarn, pm2 globally.  
- Install and run pasteld node via pastel-utility.  
- Prepare deploy script:

```
# restart-app.sh
# use the proper node version and project path
#!/bin/bash
PATH="$PATH:/home/ubuntu/.nvm/versions/node/v14.17.4/bin/"
cd /home/ubuntu/pastel-explorer-backend
git pull
yarn install
NODE_ENV=production yarn build
pm2 delete api worker
yarn run typeorm migration:run
pm2 start pm2.yaml
```

