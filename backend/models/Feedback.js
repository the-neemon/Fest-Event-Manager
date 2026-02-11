const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    isAnonymous: {
        type: Boolean,
        default: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

FeedbackSchema.index({ eventId: 1, participantId: 1 }, { unique: true });
FeedbackSchema.index({ eventId: 1, rating: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
