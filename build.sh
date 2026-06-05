#!/bin/bash
set -e

echo "=== Installing server dependencies ==="
cd server
npm install
cd ..

echo "=== Installing client dependencies ==="
cd client
npm install

echo "=== Building client ==="
npm run build
cd ..

echo "=== Build complete ==="
