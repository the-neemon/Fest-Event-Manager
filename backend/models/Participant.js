const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        default: ""
    },
    isIIITStudent: {
        type: Boolean,
        default: false // used to gate 'IIIT Students Only' events at registration
    },
    participantType: { 
        type: String, 
        required: true, 
        default: 'Student' // e.g. "Student", "Professional"
    },
    collegeName: { 
        type: String, 
        required: true,
        default: "IIIT Hyderabad" 
    },
    interests: {
        type: [String],
        default: []
    },
    followedOrganizers: [{ // drives the 'followed clubs only' feed filter on the home page
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer'
    }]
},
{
    timestamps: true
});

module.exports = mongoose.model('Participant', participantSchema);