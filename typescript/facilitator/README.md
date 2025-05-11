# h402 Facilitator

This is an implementation of an h402 facilitator service that handles payment verification and settlement for the h402 payment protocol.

## Endpoints

- `/verify`: Verifies payment payloads
- `/settle`: Settles payments by broadcasting transactions
- `/health`: Service health check
- `/admin/backup`: Triggers DB backup (protected)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file with the following variables:

```env
# General configuration
PRIVATE_KEY=0xYourPrivateKey      # Required: Signer key
PORT=3000                         # Required: Server port
ADMIN_TOKEN=secure_token          # Required: Admin access
REDIS_HOST=redis                  # Required: Redis host
REDIS_PORT=6397                   # Required: Redis port

# RPC configuration
ETHEREUM_RPC_URL=https://rpc.com  # Ethereum RPC url
BASE_RPC_URL=https://rpc.com      # Base RPC url
BSC_RPC_URL=https://rpc.com       # BSC RPC url

# Backup configuration
BACKUP_SCHEDULE=0 0 * * *         # Backup cron schedule
KEEP_BACKUPS=7                    # Backup retention count

# S3 backup configuration (Required)
S3_ENDPOINT=play.min.io           # S3 compatible endpoint
S3_ACCESS_KEY=access_key          # S3 access key
S3_SECRET_KEY=secret_key          # S3 secret key
S3_BUCKET=h402-backups            # S3 bucket name
```

Note:

- `PORT`, `BACKUP_SCHEDULE`, and `KEEP_BACKUPS` have defaults in code if not specified
- S3 configuration is required for backups

3. Run:

```bash
pnpm dev
```

## Production

With Docker:

```
docker build -t h402-facilitator .
docker run -p 3004:3004 \
  -e PRIVATE_KEY=... \
  -e ADMIN_TOKEN=... \
  -e S3_ENDPOINT=... \
  -e S3_ACCESS_KEY=... \
  -e S3_SECRET_KEY=... \
  -e S3_BUCKET=... \
  h402-facilitator
```

With docker-compose:

```
# Set required vars in .env file
docker-compose up -d
```

## Data Volume

- Database: `/data/facilitator.db`

## Security

Admin endpoint authentication:

```bash
curl -X POST http://localhost:3000/admin/backup -H "Authorization: Bearer your_admin_token"
```

## API Reference

### POST /verify

```json
{
  "payload": {
    /* Payment payload */
  },
  "paymentDetails": {
    /* Payment details */
  }
}
```

### POST /settle

```json
{
  "payload": {
    /* Payment payload */
  },
  "paymentDetails": {
    /* Payment details */
  }
}
```

### GET /health

```json
{}
```

### POST /admin/backup

```
Authorization: Bearer your_admin_token
```
