const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
    organizerName: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    contactEmail: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    discordWebhook: {
        type: String,
        default: ""
    },
    disabled: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

module.exports = mongoose.model('Organizer', organizerSchema);