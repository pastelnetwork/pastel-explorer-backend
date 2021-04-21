# Pastel explorer - backend

This is backend application that saves the blockchain data into SQLite and returns block, transaction and address data as REST GET endpoints for frontend visualization.

It's designed to integrate with Pastel ([pastel.network](https://pastel.network)) cryptocurrency  but it should work for all Bitcoin-like currencies like Bitcoin, Zcash.



## Table of Contents

- [Getting started](#-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Installation](#-installation)
  - [Prepare and fill secrets](#-prepare-and-fill-secrets)
  - [Running the app](#-running-the-app)
  - [Endpoints](#-endpoints)
- [Available scripts](#-available-scripts)
- [DB migrations](#-db-migrations)
- [Useful docs](#-useful-docs)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/en/) >= 12
- [Yarn](https://classic.yarnpkg.com/lang/en/) >=1.22

### Installation

```shell script
yarn
cp .env.example .env
yarn typeorm migration:run
```

### Prepare and fill secrets

Copy and paste .env.example into .env and fill all secrets.

| Secret                      | Description                  |
| --------------------------- | ---------------------------- |
| RPC_HOST                    | IP/Host name of RPC node     |
| RPC_PORT                    | PORT of RPC node             |
| RPC_USERNAME                | USERNAME of RPC node         |
| RPC_PASSWORD                | PASSWORD of RPC node         |
| PORT                        | PORT that API will listen on |
| NODE_ENV                    | development/production       |

### Running the app

Locally:
```shell script
yarn start
```

or in production mode:

```shell script
yarn build
yarn start:prod
```


### Endpoints

1. Get all events on particular wallet address

`GET /v1/addresses/PtdbJv9yBiK31MrxXrzdEjLkYZu7jeyfKiq?limit=100&offset=0`

2. List blocks (from latest to oldests)

`GET /v1/blocks?limit=10&offset=0`

3. Get block by blockHash

`GET /v1/blocks/0000000269c2f0a36f3599bb140162680d449750bb268bd6cea9b5ea347435ed`

4. Get transactions

`GET /v1/transactions?limit=10&offset=0`

5. Get transaction by txid (transaction hash)

`GET /v1/transactions/0c5118a7bc7a6bc1f8851217424796c4c6e00552ed05f0c35ce72f4a1f86463e`

6. Get top 100 addresses rank (by balance)

`GET /v1/addresses/rank/100`

7. Search by either block hash, block height, transaction hash, or address

`GET /v1/search?query=0c5118`

## Available scripts

To run script, in terminal type `yarn {script}`.

| Script                            | Description                                                      | Note                                         |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `build`                           | Builds app in prod mode                                          |                                              |
| `check`                           | Runs linter, prettier and ts check                               |                                              |
| `preinstall`                      | Checks is yarn was used package manager                          | It runs automatically before every install   |
| `lint`                            | Checks linter rules                                              |                                              |
| `lint:fix`                        | Fix linter errors                                                |                                              |
| `seedblockchain`                  | Runs a script to synchronize blockchain data with sqlite         |                                              |
| `start`                           | Starts app locally                                               |                                              |
| `start:prod`                      | Starts app locally in prod mode                                  |                                              |
| `type-check`                      | Checks TypeScript types                                          |                                              |
| `typeorm       `                  | Helper to run migration commands                                 |                                              |
## DB migrations

If you create new Entity or add some fields to existing entities you need to create a migration file. It will be craeted automatically if you run:

```shell script
yarn typeorm migration:generate -n NameOfMigration
```

Then you need to perform this migration on SQLite by running:

```shell script
yarn typeorm migration:run
```


## Useful docs

- [Pastel wiki](http://pastel.wiki/en/home/)
- [How to run pastel node](http://pastel.wiki/en/home/how-to-start-mn)


