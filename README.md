# Event Management System - DASS Assignment 1

## Details
- **Name**: Naman Singhal
- **Roll Number**: 2024114013

## Project Overview
A full-stack event management system built with MERN stack (MongoDB, Express.js, React, Node.js) featuring role-based access control for Admins, Organizers, and Participants.

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

## Implemented Features

### Section 13.1: Tier A Features (8 marks each)

#### Task 2: Merchandise Payment Approval Workflow ✅
**Implementation Details:**
- **Payment Proof Upload**: Participants can upload payment proof as base64-encoded images
- **Organizer Interface**: Dedicated payment approval page at `/payment-approval/:eventId`
- **Approval Workflow**:
  - View pending payments with image preview
  - Approve: Generates QR ticket, decrements stock, sends confirmation email
  - Reject: Provides rejection reason, sends notification email
- **Status Tracking**: Three states - Pending, Approved, Rejected
- **Participant View**: Payment status visible in "My Events" with rejection reasons
- **Stock Management**: Merchandise stock only decremented upon approval

**Backend Routes:**
- `GET /api/organizer/pending-payments/:eventId` - Fetch pending payments
- `PUT /api/organizer/approve-payment/:registrationId` - Approve payment
- `PUT /api/organizer/reject-payment/:registrationId` - Reject with reason

**Frontend Components:**
- `PaymentApproval.jsx` - Organizer approval interface
- `HomePage.jsx` - Payment proof upload modal
- `MyEvents.jsx` - Payment status display

#### Task 3: QR Scanner & Attendance Tracking ✅
**Implementation Details:**
- **QR Scanning Methods**:
  1. Camera-based scanning with live preview
  2. File upload for QR code images
- **Live Dashboard**: Real-time attendance statistics
  - Total registrations
  - Scanned count
  - Not scanned count
  - Scan rate percentage
- **Manual Override**: Organizers can manually mark attendance with required reason
- **Audit Logging**: Complete audit trail in `AttendanceLog` model
- **CSV Export**: Export participant data with attendance status
- **Duplicate Prevention**: Prevents multiple scans of same ticket
- **Attendance Display**: Shows Present/Absent badges in event participants tab

**Backend Routes:**
- `POST /api/attendance/scan` - Process QR code scan
- `GET /api/attendance/event/:eventId` - Get attendance stats and list
- `POST /api/attendance/manual/:registrationId` - Manual override
- `GET /api/attendance/logs/:eventId` - Fetch audit logs

**Frontend Components:**
- `AttendanceTracking.jsx` - Complete scanning and management interface
- `EventDetailPage.jsx` - Attendance column in participants table

### Section 13.2: Tier B Features (6 marks each)

#### Task 1: Real-Time Discussion Forum ✅
**Implementation Details:**
- **Message Features**:
  - Post messages and ask questions
  - Threading support via `parentMessageId`
  - Reply to messages with visual thread indication
  - Emoji reactions (👍, ❤️, 😂, 🎉)
  - Character content with markdown support
- **Organizer Moderation**:
  - Pin/Unpin messages (pinned appear at top)
  - Delete messages (soft delete with cascade to replies)
  - Post announcements (highlighted in yellow)
- **Real-Time Updates**:
  - Polling mechanism every 5 seconds
  - Notification banner for new messages
  - Incremental message loading
- **Access Control**:
  - Only registered participants can access forum
  - Organizers have full moderation rights
  - Author identification (Participant/Organizer badge)
- **User Experience**:
  - Reply context indicator
  - Reaction counts with user highlighting
  - Timestamp display
  - Clean, intuitive UI

**Backend Routes:**
- `GET /api/forum/:eventId/messages` - Fetch messages with replies
- `POST /api/forum/:eventId/messages` - Post message/reply
- `PUT /api/forum/messages/:messageId/react` - Toggle reaction
- `PUT /api/forum/messages/:messageId/pin` - Pin/unpin (organizer only)
- `DELETE /api/forum/messages/:messageId` - Soft delete
- `GET /api/forum/:eventId/stats` - Forum statistics

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

### Access Points
- **Frontend**: http://localhost:5175
- **Backend**: http://localhost:5000

## User Roles and Access

### Admin
- Manage organizers
- Approve/reject organizer applications
- View password reset requests
- System-wide oversight

### Organizer
- Create and manage events
- Approve payment proofs for merchandise
- Track attendance with QR scanning
- Moderate discussion forums
- Export participant data
- View analytics and statistics

### Participant
- Browse and register for events
- Upload payment proofs
- View tickets and QR codes
- Mark attendance via QR
- Participate in event forums
- React to messages and reply
- View event details

## Key Features Highlights

### Security
- JWT-based authentication
- Role-based access control
- Secure password hashing
- Token expiration handling
- Protected API routes

### User Experience
- Real-time updates via polling
- Responsive design
- Image preview for payments
- QR code generation and scanning
- CSV data export
- Notification system
- Status badges and visual feedback

### Data Integrity
- Audit logging for attendance
- Soft delete for forum messages
- Status tracking for payments
- Duplicate prevention
- Validation at frontend and backend

## Testing Recommendations

### Payment Approval Workflow
1. Participant registers for merchandise event
2. Upload payment proof (any image file)
3. Organizer views pending payments
4. Approve/reject with reason
5. Verify email notifications
6. Check stock decrement on approval

### QR Attendance Tracking
1. Participant gets ticket QR code
2. Organizer opens attendance tracking
3. Test camera scanning
4. Test file upload scanning
5. Verify duplicate prevention
6. Test manual override with reason
7. Export CSV and verify data

### Discussion Forum
1. Participant accesses event details
2. Post a message in forum
3. React to messages with emojis
4. Reply to create thread
5. Organizer posts announcement
6. Organizer pins important message
7. Test real-time updates (open in two tabs)
8. Verify soft delete functionality

## Future Enhancements
- WebSocket implementation for true real-time updates
- Rich text editor for forum messages
- Image/file attachments in forum
- Push notifications
- Mobile app integration
- Advanced analytics dashboard

## License
This project is submitted as part of DASS (Design and Analysis of Software Systems) coursework.