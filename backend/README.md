# baryar-api

Express + MongoDB API for the baryar transportation platform.

## Run

    cp .env.example .env
    # start local mongod, then:
    npm install
    npm run dev

    curl http://localhost:4000/health

## Test

    npm test

If mongodb-memory-server hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod`

This package is the platform backend. The map UIs in `../webapp` and
`../mobile` are not wired to it yet.
