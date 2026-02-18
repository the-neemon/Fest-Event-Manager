const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        enum: ['Normal', 'Merchandise'], 
        required: true
    },
    eligibility: {
        type: String,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    registrationLimit: {
        type: Number,
        required: true
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant'
    }],
    registrationFee: {
        type: Number,
        default: 0 
    },
    location: {
        type: String
    },
    tags: [String],
    itemDetails: {
        sizes: [String],
        colors: [String]
    },
    stock: {
        type: Number,
        default: 0
    },
    purchaseLimit: {
        type: Number,
        default: 1
    },
    formFields: [{
        label: String,
        fieldType: String, // "text", "number", "dropdown", "checkbox", "file"
        required: Boolean,
        options: String // Comma-separated options for dropdown/checkbox
    }],
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'],
        default: 'Draft'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);