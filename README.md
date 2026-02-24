# Fest Event Manager

**Name:** Naman Singhal &nbsp;|&nbsp; **Roll No:** 2024114013 &nbsp;

**Live:**
- Frontend: https://fest-event-manager.vercel.app
- Backend API: https://fest-event-manager.onrender.com

---

## Table of Contents

1. [Tech Stack & Library Justifications](#tech-stack--library-justifications)
2. [Advanced Features](#advanced-features)
3. [Setup & Installation](#setup--installation)
4. [API Reference](#api-reference)

---

## Tech Stack & Library Justifications

### Backend

| Library / Module | Version | Why it was chosen |
|---|---|---|
| **Node.js** | v22 | Non-blocking I/O makes it well-suited for handling concurrent WebSocket connections (Socket.io) alongside REST API calls without spawning threads |
| **Express** | v5.2.1 | Minimal, un-opinionated HTTP framework. v5 adds native async error propagation so `try/catch` errors are automatically forwarded to error-handling middleware |
| **MongoDB + Mongoose** | v9.1.5 | Schema-flexible document store. Events carry dynamic `formFields` arrays and `itemDetails` (merch sizes/colors) that would require many nullable columns in a relational DB. Mongoose adds schema validation, virtuals, and index definition co-located with the model |
| **Socket.io** | v4.8.3 | Provides WebSocket communication with an automatic HTTP long-poll fallback. Used for the real-time discussion forum — every message, reply, reaction, pin, and delete is pushed live to all connected clients in the event's room without any polling |
| **jsonwebtoken** | v9.0.3 | Stateless authentication via signed JWTs. The payload carries `{ user: { id, role } }` so every request is self-contained and the server needs no session store |
| **bcrypt** | v6.0.0 | Industry-standard adaptive password hashing. The work factor automatically slows brute-force attacks; `bcrypt.compare` does constant-time comparison to prevent timing attacks |
| **nodemailer** | v6.10.1 | Sends transactional emails (registration confirmation, password reset OTP) directly over SMTP. Chosen over a paid SaaS to avoid external billing — Gmail App Passwords work out of the box |
| **qrcode** | v1.5.4 | Generates a deterministic QR code PNG from the registration's `ticketId` UUID. The PNG is returned as a Base64 data-URL so it can be embedded directly in an `<img>` tag with no file storage needed |
| **dotenv** | v17.2.3 | Loads `MONGO_URI`, `JWT_SECRET`, and SMTP credentials from `.env` at startup, keeping secrets out of source control |
| **cors** | v2.8.6 | Middleware that adds the necessary `Access-Control-Allow-Origin` headers so the Vercel frontend can call the Render backend from a different origin |
| **nodemon** *(dev)* | v3.1.11 | Restarts the server on file saves during development so there is no manual restart cycle |

### Frontend

| Library / Module | Version | Why it was chosen |
|---|---|---|
| **React** | v19.2.0 | Component model maps cleanly onto the role-based UI (each role has its own dashboard and page set). React 19's concurrent features improve perceived performance on large participant lists |
| **Vite (rolldown-vite)** | 7.2.5 | Sub-second HMR vs CRA's multi-second rebuilds. `rolldown-vite` is a Rust-based Rolldown bundler drop-in that gives faster production builds compared to standard Vite |
| **React Router DOM** | v7.13.0 | Client-side routing with `<BrowserRouter>` and `useParams` / `useNavigate`. v7 supports the new loader/action API but the project uses the classic hooks pattern which is simpler for a single-SPA without nested data loading |
| **Axios** | v1.13.3 | Wraps `fetch` with automatic JSON serialisation, consistent error objects via `err.response`, and the ability to set a default `x-auth-token` header. Used for every REST call to the backend |
| **socket.io-client** | v4.8.3 | Matches the server version exactly. Manages the WebSocket connection lifecycle, automatic reconnection, and the `transports: ['websocket', 'polling']` fallback so the forum works even behind proxies that block raw WebSocket upgrades |
| **jsqr** | v1.4.0 | Pure JavaScript QR decoder that works on raw pixel data from a `<canvas>`. Used to decode QR codes from both the live camera feed and uploaded image files for attendance marking — no native plugin or server round-trip required |
| **jwt-decode** | v4.0.0 | Decodes the JWT payload client-side (no verification — that happens on the server) to extract `id` and `role` for conditional rendering and storing in `AuthContext` |

> **No UI component library was used.** All styling is inline React styles or plain CSS. This choice was intentional: it avoids a large dependency, makes every style decision explicit and traceable, and means there are no version-mismatch issues between the component library and React 19.

---

## Advanced Features

### Tier A — Core Advanced Features (2 of 3 chosen, 8 marks each)

#### Task 2 · Merchandise Payment Approval Workflow

Merchandise events carry `itemDetails.sizes`, `itemDetails.colors`, `stock`, and `purchaseLimit` fields on the `Event` document. Participants select size, color, and quantity at registration time; the total cost (`quantity × registrationFee`) is calculated and displayed dynamically.

**Payment proof flow:**
1. After selecting options the participant uploads a payment screenshot. The image is sent as a Base64 data-URL, validated for the `data:image/` prefix and a ≤ 10 MB size limit, and stored in `Registration.paymentProof.data` inside MongoDB — no file system or cloud bucket is required.
2. The registration enters a `Pending` state; no QR code is issued yet.
3. Organizers open the **Payment Approvals** tab on the event page, which shows the proof image, order details (size, color, qty, total), and Approve / Reject controls.
4. **On approval:** a UUID `ticketId` is generated, `qrcode` renders it to a Base64 PNG, the registration moves to `Approved`, and a confirmation email (with the QR code embedded) is sent via Nodemailer.
5. **On rejection:** an optional rejection reason is stored and emailed to the participant; they may re-upload proof.
6. Stock is not decremented until approval to prevent ghost reservations.

This workflow is also applied to Normal paid events (`registrationFee > 0`), not only Merchandise.

**Design decision:** Base64 in MongoDB was chosen over `multer` + disk/S3 to keep infrastructure minimal for this project. The trade-off is larger document size; a production system would use GridFS or an object store.

---

#### Task 3 · QR Scanner & Attendance Tracking

On free-event registration or paid-event payment approval, a UUID `ticketId` is generated and a QR code PNG is produced. The participant's **My Events** page displays this as a scannable ticket.

**Scanner — two modes (both use `jsqr`):**
- **Camera:** `getUserMedia` streams the device camera into a hidden `<video>` element. Frames are captured to an offscreen `<canvas>` every 200 ms and passed to `jsqr` pixel-by-pixel. The `play()` call is `await`-ed and the `<video>` element is always kept in the DOM (toggled via `display: none`) to eliminate a null-ref race condition that occurred when the stream was attached to a not-yet-mounted element.
- **File upload:** the image is drawn onto a `<canvas>` and decoded once with `jsqr`.

Both modes POST the decoded string to `/api/attendance/scan`. The backend:
- Verifies the ticket belongs to this event
- Rejects duplicate scans (attendance already marked)
- Sets `registration.attendance.marked = true` with a timestamp
- Writes an immutable `AttendanceLog` entry recording `method` (`qr_scan` / `file_upload` / `manual`), `timestamp`, and `markedBy`

**Live dashboard** shows total registered vs. present counts and a per-participant table with attendance status, filterable by name.

**Manual override** lets organizers mark a participant present without a QR scan (for exceptional cases); this is also logged to the audit trail with `method: 'manual'`.

**CSV export** is available from the attendance page — generates a downloadable report of all participants with their attendance status and timestamp.

---

### Tier B — Real-time & Communication Features (2 of 3 chosen, 6 marks each)

#### Task 1 · Real-Time Discussion Forum

Each published event has a discussion forum accessible to registered participants and the event organizer. All updates propagate instantly via **Socket.io** — no polling.

**Architecture:** Socket.io rooms are scoped as `forum:<eventId>` so broadcasts never bleed between events. Every mutation route emits to the room _after_ saving to MongoDB, making the DB document the canonical state for all clients.

**Client connection design:**
```
io(API_URL)
  └─ socket.on('connect')
       └─ socket.emit('join_forum', eventId)
```
`join_forum` is emitted inside `socket.on('connect')` — not synchronously after `io()` — to avoid a race condition where the emit fired before the WebSocket handshake completed and the server never added the client to the room.

**Optimistic-update removal:** The frontend initially applied a local state update and also listened for the socket event, causing the sender to see duplicate messages because the socket event arrived before the HTTP response resolved. The fix was to drop the optimistic update entirely; the socket event is now the sole state-update path for all clients including the sender.

**Message model:**
- Self-referential `parentMessageId` for threaded replies (no separate collection)
- `refPath: 'authorModel'` for dynamic population from either `Participant` or `Organizer`
- Soft delete preserves audit trail and prevents orphaned replies
- Compound indexes on `(eventId, createdAt)` and `(eventId, isPinned, createdAt)`
- Reactions as embedded `[{ userId, userModel, emoji }]` — toggled by `(userId, emoji)` pair

**Features implemented:**
- Threaded replies (reply to any top-level message)
- Emoji reactions (👍 ❤️ 😂 🎉) with per-user toggle
- New-message notification banner (auto-dismisses after 3 s)
- **Organizer moderation:** Pin/Unpin on top-level messages; Delete on both top-level messages and replies. Deleting a reply emits `message_updated` on the parent so other clients' reply lists update live. Deleting a top-level message soft-deletes all its replies and emits `message_deleted`.
- **Announcements:** Organizers can check "Post as Announcement" — rendered with a yellow border and `ANNOUNCEMENT` badge to distinguish from participant posts.

---

#### Task 2 · Organizer Password Reset Workflow

Organizers cannot reset their own passwords. Instead, they submit a reset request through the platform, which enters an Admin-mediated approval flow.

**Flow:**
1. An organizer submits a password reset request (club name, reason) from their profile page. The request is stored in a `PasswordResetRequest` document with status `Pending`.
2. The Admin sees all pending requests in a dedicated **Password Reset Requests** page, showing club name, contact email, reason, and submission date.
3. **On approval:** the backend auto-generates a cryptographically random password, hashes it with bcrypt, saves it to the `Organizer` document, and returns the plaintext to the Admin _once_ (displayed in an alert, never stored or re-transmitted). The Admin shares this password with the organizer out-of-band. The request is marked `Approved`.
4. **On rejection:** the request is deleted; the organizer is notified to contact the admin directly.

**Design decision:** The generated password is returned in the HTTP response body rather than emailed automatically. This mirrors real-world IT help-desk workflows where a human verifies identity before handing over credentials, and avoids storing a plaintext password anywhere in the system beyond the single HTTP response.

---

### Tier C — Integration & Enhancement Features (1 of 3 chosen, 2 marks)

#### Task 1 · Anonymous Feedback System

Registered participants can submit feedback for events they have attended (event status `Completed`). Feedback consists of a 1–5 star rating and an optional text comment.

**Anonymity implementation:** the `Feedback` document stores the `eventId` and `registrationId` (to enforce one-submission-per-registration) but no `participantId` field — the author cannot be reverse-looked-up from the feedback document itself.

**Organizer view:** the event detail page surfaces aggregated statistics (average rating, total responses, per-star breakdown) and a list of all text comments, filterable by star rating.

The one-submission constraint is enforced server-side by checking for an existing `Feedback` document with the same `registrationId` before inserting.

---

## Setup & Installation

### Prerequisites

- Node.js ≥ v22
- MongoDB running locally **or** a MongoDB Atlas connection string
- A Gmail account with an App Password enabled (for email features)

### 1. Clone the repository

```bash
git clone https://github.com/the-neemon/Fest-Event-Manager.git
cd Fest-Event-Manager
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/fest-event-manager
JWT_SECRET=replace_with_a_long_random_string
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=your_gmail_app_password
```

```bash
npm run dev        # nodemon — auto-restarts on save, listens on :5000
# or
node server.js     # production
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (optional — defaults to localhost):

```env
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev        # Vite HMR dev server on :5173
npm run build      # production build → dist/
```

### 4. First-run: create an Admin account

The Admin model has no registration route (by design — admins are seeded). Run this once:

```bash
cd backend
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Admin = require('./models/Admin');
  await Admin.create({ email: 'admin@example.com', password: await bcrypt.hash('admin123', 10) });
  console.log('Admin created'); process.exit();
});
"
```

---

## API Reference

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register participant or organizer |
| POST | `/api/auth/login` | Public | Login (all roles) |
| POST | `/api/auth/forgot-password` | Public | Send OTP to email |
| POST | `/api/auth/reset-password` | Public | Verify OTP and set new password |

### Events
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Participant | List published/ongoing events |
| POST | `/api/events` | Organizer | Create event |
| GET | `/api/events/detail/:id` | Organizer | Full event detail + participants |
| PUT | `/api/events/:id` | Organizer | Edit event |
| PUT | `/api/events/:id/publish` | Organizer | Publish draft |
| POST | `/api/events/:id/register` | Participant | Register (free or upload payment) |
| GET | `/api/events/:id/participants` | Organizer | List registrations |

### Forum
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/forum/:eventId/messages` | Registered | Fetch all messages + replies |
| POST | `/api/forum/:eventId/messages` | Registered | Post message or reply |
| PUT | `/api/forum/messages/:id/react` | Registered | Toggle emoji reaction |
| PUT | `/api/forum/messages/:id/pin` | Organizer | Pin / unpin |
| DELETE | `/api/forum/messages/:id` | Organizer | Soft delete |

### Attendance
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/attendance/scan` | Organizer | Mark attendance via QR |
| GET | `/api/attendance/event/:eventId` | Organizer | Attendance list |
| POST | `/api/attendance/manual/:registrationId` | Organizer | Manual override |
| GET | `/api/attendance/logs/:eventId` | Organizer | Immutable audit log |

### Payments & Organizer
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/organizer/pending-payments/:eventId` | Organizer | List pending proofs |
| PUT | `/api/organizer/approve-payment/:registrationId` | Organizer | Approve → generate ticket |
| PUT | `/api/organizer/reject-payment/:registrationId` | Organizer | Reject with reason |

### Admin
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/admin/organizers` | Admin | List all organizer applications |
| PUT | `/api/admin/organizers/:id/approve` | Admin | Approve organizer |
| PUT | `/api/admin/organizers/:id/reject` | Admin | Reject organizer |
| DELETE | `/api/admin/organizers/:id` | Admin | Remove organizer |
