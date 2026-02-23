const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'authorModel' // dynamic ref - Mongoose populates from Participant or Organizer based on authorModel value
    },
    authorModel: {
        type: String,
        required: true,
        enum: ['Participant', 'Organizer']
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null // null = top-level post; non-null = reply (self-referential)
    },
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        userModel: {
            type: String,
            required: true,
            enum: ['Participant', 'Organizer']
        },
        emoji: {
            type: String,
            required: true
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

messageSchema.index({ eventId: 1, createdAt: -1 });
messageSchema.index({ eventId: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
