const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    action: {
        type: String,
        enum: ['marked', 'unmarked', 'manual_override'],
        required: true
    },
    method: {
        type: String,
        enum: ['qr_scan', 'file_upload', 'manual'],
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    reason: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);
