# VaultX

> **The Airbnb for Storage** — connecting small businesses and farmers to affordable, verified storage spaces near them, matched to exactly what they need to store.

---

## What Is VaultX?

VaultX is a two-sided storage marketplace where:

- **Space owners** (homeowners, shopkeepers, godown owners, institutions) list idle rooms, garages, sheds, and warehouses to earn passive income.
- **Customers** (small businesses, seasonal sellers, D2C brands, contractors, event companies) find verified storage near them, filtered by distance, capacity, price, and environment requirements.
- **Farmers** get a dedicated **FarmVault** section with grain-specific storage filters, AI produce grading, BIS IS 4333 quality receipts, and micro-loan eligibility.

---

## Project Structure

```
vaultx/
├── client/                        # React (Vite) frontend
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx               # Landing + smart search bar
│       │   ├── Auth.jsx               # Login / Register (role-based)
│       │   ├── Search.jsx             # Map + list view with filters
│       │   ├── ListingDetail.jsx      # Individual space detail + booking
│       │   ├── ListYourSpace.jsx      # Owner onboarding + listing form
│       │   ├── FarmVault.jsx          # Farmer-specific landing page
│       │   ├── GradeUpload.jsx        # AI produce grading (FarmVault)
│       │   ├── Receipt.jsx            # Quality receipt + loan eligibility
│       │   ├── BusinessDashboard.jsx  # Business customer bookings + inventory
│       │   ├── FarmerDashboard.jsx    # Farmer bookings + receipts + loans
│       │   └── OwnerDashboard.jsx     # Space owner listings + earnings
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── MapView.jsx            # react-leaflet (OpenStreetMap, no API key)
│       │   ├── StorageCard.jsx        # Listing preview card
│       │   ├── SmartMatchBadge.jsx    # Match % based on product requirements
│       │   ├── GradeResult.jsx        # AI grade display with annotated image
│       │   └── ProductPicker.jsx      # Product type selector → auto-maps requirements
│       ├── utils/
│       │   └── storageRequirements.js # Product → environment matching rules
│       └── firebase.js
│
├── server/                        # Node.js / Express backend
│   ├── routes/
│   │   ├── auth.js                # Register / login + role assignment
│   │   ├── spaces.js              # CRUD for storage space listings
│   │   ├── bookings.js            # Booking create / manage / status
│   │   ├── grading.js             # Forwards image to ML service, saves result
│   │   └── receipt.js             # Fetches grading session → streams PDF
│   ├── middleware/
│   │   └── verifyToken.js         # Firebase JWT verification
│   ├── firebase-admin.js
│   └── index.js
│
└── ml_service/                    # Python Flask ML microservice (teammate)
    ├── app.py                     # Flask server — POST /grade, POST /receipt
    ├── grading_engine.py          # YOLOv8 + OpenCV BIS IS 4333 pipeline
    ├── receipt_generator.py       # ReportLab PDF with HMAC-SHA256 signature
    ├── agrivault_yolo8.pt         # Trained YOLO model weights
    └── requirements.txt
```

---

## User Roles

| Role | What They Do |
|---|---|
| `business` | Search storage, book spaces, manage inventory |
| `farmer` | Use FarmVault — book grain storage, grade produce, get receipts |
| `owner` | List spaces, manage bookings, track earnings |

Role is set at registration and stored in Firestore under `users/{uid}.role`.

---

## Run Locally

You need **3 terminals** running simultaneously.

### 1. ML Service (teammate's Python Flask API)
```bash
cd ml_service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5001
```

### 2. Node.js Backend
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3000
```

### 3. React Frontend
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### `client/.env`
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:3000
```

### `server/.env`
```env
PORT=3000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
ML_SERVICE_URL=http://localhost:5001
CORS_ORIGIN=http://localhost:5173
RAZORPAY_KEY_ID=               # optional for MVP
RAZORPAY_KEY_SECRET=           # optional for MVP
TWILIO_ACCOUNT_SID=            # optional — WhatsApp notifications
TWILIO_AUTH_TOKEN=             # optional
TWILIO_WHATSAPP_FROM=          # optional
```

### `ml_service/.env`
```env
ML_SERVICE_PORT=5001
FLASK_ENV=development
```

---

## Firestore Collections

### `users/{uid}`
```json
{
  "full_name": "Priya Sharma",
  "role": "business",
  "phone": "9876543210",
  "email": "priya@example.com",
  "pincode": "411001",
  "city": "Pune",
  "state": "Maharashtra",
  "aadhaar_last4": "4521",
  "created_at": "timestamp"
}
```
> For farmers, also include: `village`, `district`, `land_hectares`

---

### `spaces/{space_id}`
```json
{
  "owner_uid": "firebase_uid",
  "owner_name": "Ramesh Gupta",
  "name": "Ramesh's Dry Godown",
  "type": "godown",
  "address": "Plot 12, MIDC Area, Pune",
  "city": "Pune",
  "pincode": "411001",
  "lat": 18.5204,
  "lng": 73.8567,
  "sqft_total": 1200,
  "sqft_available": 800,
  "price_per_sqft_monthly": 8,
  "environment": "dry",
  "temp_range": "15-30",
  "humidity_controlled": false,
  "access_hours": "6am-10pm",
  "suitable_for": ["clothes", "electronics", "grains", "fmcg"],
  "photos": ["url1", "url2"],
  "aadhaar_verified": true,
  "security_deposit_paid": true,
  "verified": true,
  "rating": 4.3,
  "review_count": 7,
  "created_at": "timestamp"
}
```

---

### `bookings/{booking_id}`
```json
{
  "customer_uid": "firebase_uid",
  "customer_role": "business",
  "space_id": "space_doc_id",
  "owner_uid": "firebase_uid",
  "storage_category": "clothes",
  "quantity_units": 200,
  "sqft_needed": 150,
  "duration_weeks": 8,
  "total_price": 2400,
  "status": "pending",
  "grading_session_id": null,
  "created_at": "timestamp",
  "confirmed_at": null,
  "completed_at": null
}
```
> For farmer bookings, also include: `produce_type`, `quantity_quintals`, `crop_season`, `deposit_date`

---

### `grading_sessions/{session_id}` *(FarmVault only)*
```json
{
  "session_id": "uuid",
  "booking_id": "booking_doc_id",
  "farmer_uid": "firebase_uid",
  "produce_type": "wheat",
  "grade": "Grade A",
  "grading_result": {},
  "receipt_issued": false,
  "created_at": "timestamp"
}
```

---

## Product → Storage Matching Rules

Defined in `client/src/utils/storageRequirements.js`.
When a customer enters what they want to store, the app filters spaces by environment compatibility:

| Product Category | Environment Needed | Notes |
|---|---|---|
| Clothes / Fabrics | Dry, 15–30°C | Stackable |
| Grains / Pulses | Dry, 10–25°C, humidity <65% | FarmVault only |
| Vegetables | Cool, 4–15°C | Requires ventilation |
| Electronics / FMCG | Dry, 18–25°C | Secure access required |
| Tiles / Steel | Covered, any temp | Heavy load bearing |
| Furniture / Decor | Covered, dry | Large space needed |
| Event Equipment | Covered, dry | Flexible duration |

---

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user with role |
| POST | `/api/auth/login` | Verify Firebase token + return role |

### Spaces
| Method | Route | Description |
|---|---|---|
| GET | `/api/spaces` | All verified spaces (with optional filters) |
| GET | `/api/spaces/:id` | Single space detail |
| POST | `/api/spaces` | Owner creates new listing |
| PATCH | `/api/spaces/:id` | Owner updates listing |
| GET | `/api/spaces/owner/:uid` | Owner's own listings |

### Bookings
| Method | Route | Description |
|---|---|---|
| POST | `/api/bookings` | Customer creates booking |
| GET | `/api/bookings/customer/:uid` | Customer's bookings |
| GET | `/api/bookings/owner/:uid` | Owner's incoming bookings |
| PATCH | `/api/bookings/:id/status` | Owner confirms or rejects |

### FarmVault — Grading & Receipt
| Method | Route | Description |
|---|---|---|
| POST | `/api/grading/analyze` | Upload produce image → get AI grade |
| POST | `/api/grading/receipt` | Generate signed PDF quality receipt |
| GET | `/api/grading/result/:session_id` | Fetch existing grading result |

---

## Manual Seed Before Demo

Create at least **5 space documents** in Firestore (`spaces` collection) covering different types and cities. Minimum fields per document:

```json
{
  "name": "Sharma Dry Storage",
  "type": "godown",
  "owner_name": "Vijay Sharma",
  "owner_uid": "seed_owner_1",
  "address": "Sector 14, Gurgaon",
  "city": "Gurgaon",
  "pincode": "122001",
  "lat": 28.4595,
  "lng": 77.0266,
  "sqft_total": 800,
  "sqft_available": 600,
  "price_per_sqft_monthly": 9,
  "environment": "dry",
  "suitable_for": ["clothes", "electronics", "fmcg"],
  "verified": true,
  "aadhaar_verified": true,
  "security_deposit_paid": true,
  "rating": 4.5,
  "review_count": 3,
  "access_hours": "8am-9pm"
}
```

Cover these types across your 5 seed docs:
- 1 dry godown (urban, for businesses)
- 1 cool/ventilated room (for perishables)
- 1 large warehouse bay (for heavy goods)
- 1 grain-safe rural storage (for FarmVault demo)
- 1 secure small room (for electronics/FMCG)

---

## Demo Script

### Journey 1 — Business Customer (Priya, D2C clothing brand)
1. Register as `business`
2. Enter: *"200 units of winter jackets, Pune, 2 months"*
3. See matched listings filtered for dry environment
4. Book a godown slot
5. Owner accepts booking
6. Priya gets booking confirmation

### Journey 2 — Farmer (Raju, wheat farmer in UP)
1. Register as `farmer`
2. Go to FarmVault section
3. Search grain-safe storage within 15km
4. Book confirmed slot
5. Upload wheat photo → AI grades it Grade A
6. Download signed PDF receipt with BIS IS 4333 reference
7. See loan eligibility amount

---

## Health Checks

```bash
curl http://localhost:5001/health   # ML service
curl http://localhost:3000/health   # Node backend
```

Both should return `{ "status": "ok" }` before starting the demo.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, react-leaflet |
| Backend | Node.js, Express, Firebase Admin SDK |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Payments | Razorpay (escrow) |
| ML Service | Python Flask, YOLOv8, OpenCV, ReportLab |
| Maps | OpenStreetMap via react-leaflet (free, no API key) |
| Notifications | Twilio WhatsApp API (optional) |
| Deployment | Vercel (frontend), Render (backend), localhost (ML) |