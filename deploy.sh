#!/bin/bash
set -e

APP_DIR="/home/ubuntu/khalildeals"

echo "==> Pulling latest code..."
cd $APP_DIR
git pull origin main

echo "==> Building and starting containers..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "==> Running migrations..."
docker compose exec -T server npx prisma migrate deploy

echo "==> Seeding database (if needed)..."
docker compose exec -T server node dist/seed.js 2>/dev/null || true

echo "==> Done! App is live at https://khalildeals.abbtn.com"
