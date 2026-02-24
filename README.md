# Fest Event Manager

**Name:** Naman Singhal · **Roll No:** 2024114013 · **Course:** DASS Assignment 1

A full-stack festival/club event management platform. Admins manage organizers, organizers create and run events, participants register and attend.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js v22, Express v5, MongoDB + Mongoose, Socket.io |
| Frontend | React v19, Vite, React Router v7, Axios |
| Auth | JWT (`x-auth-token` header), roles: `admin / organizer / participant` |
| Realtime | Socket.io — forum messages, reactions, pins, deletes pushed live |
| Email | Nodemailer — registration confirmation, password reset |
| QR | `qrcode` (generation) + `jsqr` (camera/file scan for attendance) |

---

## Features

- **Admin** — approve/reject organizer applications, manage organizer accounts
- **Organizer** — create Normal or Merchandise events (with custom registration questions), publish/manage events, approve payment proofs, track attendance via QR scan, moderate the discussion forum (pin/delete messages, post announcements)
- **Participant** — browse and register for events (free or paid), upload payment proof, view tickets with QR codes, react to and reply in the event forum

---

## Setup

### Prerequisites
- Node.js ≥ v22, MongoDB running (local or Atlas)

### Backend
```bash
cd backend
npm install
```
Create `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/fest-event-manager
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```
```bash
node server.js          # runs on :5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # runs on :5173
```

---

## Key API Routes

```
Auth         POST /api/auth/register  POST /api/auth/login
Events       GET|POST /api/events     GET /api/events/detail/:id
Forum        GET|POST /api/forum/:eventId/messages
             PUT  /api/forum/messages/:id/react|pin
             DELETE /api/forum/messages/:id
Attendance   POST /api/attendance/scan
Payments     GET  /api/organizer/pending-payments/:eventId
             PUT  /api/organizer/approve-payment/:registrationId
Admin        GET|PUT /api/admin/organizers
```

---

## Live Deployment

- **Backend:** https://fest-event-manager.onrender.com
- **Frontend:** Vercel