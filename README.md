# Agri-Vault

MVP scaffold for:

- Farmer web app
- Warehouse owner web app
- Node.js backend with PDF receipt generation
- AI grading via teammate Flask API

## Run locally

1. Add Firebase client keys to `client/.env`.
2. Add Firebase Admin credentials to `server/.env`.
3. Install dependencies:
   - `cd client && npm install`
   - `cd ../server && npm install`
4. Start apps:
   - `cd client && npm run dev`
   - `cd ../server && npm run dev`

## Firestore collections

- `users`
- `warehouses`
- `bookings`

## Manual seed before demo

Create at least 5 warehouse docs in Firestore with:

- `name`
- `address`
- `lat`
- `lng`
- `sqft`
- `pricePerSqft`
- `produces`
- `verified`