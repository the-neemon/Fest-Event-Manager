const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    ticketId: {
        type: String,
        unique: true
    },
    status: {
        type: String,
        enum: ['Registered', 'Completed', 'Cancelled', 'Rejected', 'Pending', 'Approved'],
        default: 'Registered'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    attendance: {
        marked: {
            type: Boolean,
            default: false
        },
        timestamp: Date
    },
    formResponses: {
        type: Map,
        of: String
    },
    paymentProof: {
        data: String, // base64 encoded image
        uploadedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organizer'
        },
        reviewedAt: Date,
        rejectionReason: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);
