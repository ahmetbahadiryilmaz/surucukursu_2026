# Car Sync Worker

NestJS-based worker that processes car synchronization jobs from RabbitMQ queue.

## Features

- Listens to RabbitMQ queue for `sync_cars` job messages
- Fetches vehicle and simulator data from MEBBIS service
- Updates job progress through 8 stages:
  1. WAITING
  2. AUTHENTICATING
  3. CONNECTING
  4. DOWNLOADING_VEHICLES
  5. DOWNLOADING_SIMULATORS
  6. PROCESSING
  7. SAVING
  8. COMPLETED
- Emits real-time progress updates via Socket.IO to frontend
- Saves synced cars to database

## Environment Variables

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=surucukursu
RABBITMQ_URL=amqp://guest:guest@localhost:5672
MEBBIS_SERVICE_URL=http://localhost:3003
API_SERVER_URL=http://localhost:3001
WORKER_PORT=3004
WORKER_TOKEN=worker-secret-token
```

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Build

```bash
pnpm run build
```

## Start

```bash
pnpm start
```
