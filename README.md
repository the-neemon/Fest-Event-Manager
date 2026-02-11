# Event Management System - DASS Assignment 1

## Details
- **Name**: Naman Singhal
- **Roll Number**: 2024114013

## Technology Stack
### Backend
- **Node.js** (v22.14.0)
- **Express.js** (v5.2.1)
- **MongoDB** with Mongoose (v9.1.5)
- **JWT Authentication**
- **QRCode Generation**
- **Nodemailer** for email services

### Frontend
- **React** (v19.2.0)
- **Vite** (rolldown-vite 7.2.5)
- **React Router DOM** (v7.13.0)
- **Axios** for HTTP requests
- **jsqr** (v1.4.0) for QR code scanning

## API Endpoints Summary

### Forum Routes
- `GET /api/forum/:eventId/messages` - Get forum messages with replies
- `POST /api/forum/:eventId/messages` - Post new message/reply
- `PUT /api/forum/messages/:messageId/react` - Add/remove reaction
- `PUT /api/forum/messages/:messageId/pin` - Pin/unpin message
- `DELETE /api/forum/messages/:messageId` - Soft delete message
- `GET /api/forum/:eventId/stats` - Get forum statistics

### Payment Routes
- `GET /api/organizer/pending-payments/:eventId` - Get pending payments
- `PUT /api/organizer/approve-payment/:registrationId` - Approve payment
- `PUT /api/organizer/reject-payment/:registrationId` - Reject payment

### Attendance Routes
- `POST /api/attendance/scan` - Scan QR code
- `GET /api/attendance/event/:eventId` - Get attendance data
- `POST /api/attendance/manual/:registrationId` - Manual attendance override
- `GET /api/attendance/logs/:eventId` - Get audit logs

## Setup Instructions

### Prerequisites
- Node.js v22.14.0 or higher
- MongoDB installed and running
- npm or yarn package manager

### Backend Setup
```bash
cd backend
npm install
# Create .env file with:
# MONGO_URI=mongodb://localhost:27017/event-management
# JWT_SECRET=your_jwt_secret
# EMAIL_USER=your_email
# EMAIL_PASS=your_email_password
node server.js
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```