<div align=center>

  [<img height="100px" src="src/assets/pastel-logo.svg" />](https://pastel.network/)

</div>

<p align=center>
  <b>Pastel Explorer API (Backend)</b>
</p>

<div align=center>

  [![Website](https://img.shields.io/website?down_color=lightgrey&down_message=offline&up_color=blue&up_message=online&url=https%3A%2F%2Fshields.io)](https://explorer.pastel.network/)
  [![Language](https://img.shields.io/badge/language-Typescript-%232b7489)](https://github.com/pastelnetwork/pastel-electron-wallet/search?q=typescript)

</div>

---

This is a backend application that stores blockchain data into the sqlite database and serves block, transaction and address data via REST GET endpoints for visualization in the frontend.

It's designed to integrate with Pastel ([pastel.network](https://pastel.network)) cryptocurrency but it should work for all Bitcoin-like currencies like Bitcoin, Zcash.

## Available scripts

| Script           | Description                                              | Note                                       |
| ---------------- | -------------------------------------------------------- | ------------------------------------------ |
| `build`          | Builds app in prod mode                                  |                                            |
| `preinstall`     | Checks is yarn was used package manager                  | It runs automatically before every install |
| `seedblockchain` | Runs a script to synchronize blockchain data with sqlite |                                            |
| `start`          | Starts app locally                                       |                                            |
| `lint`           | Checks linter rules                                      |                                            |
| `type-check`     | Checks TypeScript types                                  |                                            |
| `typeorm `       | Helper to run migration commands                         |                                            |

## DB migrations

If you want to create a new Entity or add some fields to existing entities you need to create a migration file.

```bash
yarn typeorm migration:generate -n NameOfMigration
```

Run migrations:

```bash
yarn db:migrate
```

## Useful docs

- [Pastel docs](https://docs.pastel.network/)
- [How to run pastel node](https://docs.pastel.network/development-guide/quickstart-running-a-node)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/en/) >= 14
- [Yarn](https://classic.yarnpkg.com/lang/en/) >=1.22
- `pasteld` node running and operational

### Prepare dotenv

Create dotenv file from `.env.example` and fill the secrets.

```bash
cp .env.example .env
```

### Run the app

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
pm2 delete explorer-api explorer-worker
yarn run typeorm migration:run
pm2 start pm2.yaml
```

## Shell script

### Update all data of blocks

```bash
# use to update all
yarn update-all

# use to update from block n to the last block
yarn update-all startAt [block_number]

# use to update a single block
yarn update-all [block_number]
```

### Update blocks

```bash
# use to update all blocks
yarn update-blocks

# use to update from block n to the last block
yarn update-blocks startAt [block_number]

# use to update a single block
yarn update-blocks [block_number]
```

### Update tickets

```bash
# use to update all tickets
yarn update-tickets

# use to update from block n to the last block
yarn update-tickets startAt [block_number]

# use to update a single ticket by Block Height
yarn update-tickets [block_number]
```

### Update senses

```bash
# use to update all senses
yarn update-senses

# use to update a single sense by TXID
yarn update-senses [TXID]

# use to update a single sense by Block Height
yarn update-senses [block_number]
```

### Update cascade

```bash
# use to update all cascade
yarn update-cascades

# use to update a single cascade by TXID
yarn update-cascades [TXID]

# use to update a single cascade by Block Height
yarn update-cascades [block_number]
```

### Update nfts

```bash
# use to update all nfts
yarn update-nfts

# use to update a single nft by TXID
yarn update-nfts [TXID]

# use to update a single nft by Block Height
yarn update-nfts [block_number]
```

### Update address

```bash
# use to update all address
yarn update-addresses

# use to update a single address
yarn update-addresses [address]
