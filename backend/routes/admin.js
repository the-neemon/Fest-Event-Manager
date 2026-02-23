const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Organizer = require('../models/Organizer');
const Participant = require('../models/Participant');
const Admin = require('../models/Admin');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const auth = require('../middleware/auth');

// Helper function to generate random password
const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

router.post('/add-organizer', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        let { organizerName, category, contactEmail, password, description, autoGenerate } = req.body;

        if (autoGenerate) {
            if (!contactEmail) {
                contactEmail = organizerName.toLowerCase().replace(/\s+/g, '') + '@clubs.iiit.ac.in';
            }
            password = generatePassword();
        }

        let organizer = await Organizer.findOne({ organizerName });
        if (organizer) {
            return res.status(400).json({ msg: "Organizer Name already exists" });
        }

        const existingParticipant = await Participant.findOne({ email: contactEmail });
        const existingOrganizer = await Organizer.findOne({ contactEmail });
        const existingAdmin = await Admin.findOne({ email: contactEmail });

        if (existingParticipant || existingOrganizer || existingAdmin) {
            return res.status(400).json({ msg: "Email already in use" });
        }

        organizer = new Organizer({
            organizerName,
            contactEmail,
            password,
            category,
            description,
            role: 'organizer'
        });

        const salt = await bcrypt.genSalt(10);
        organizer.password = await bcrypt.hash(password, salt);

        await organizer.save();

        res.json({ 
            msg: "Organizer Created Successfully", 
            organizer: {
                id: organizer._id,
                organizerName: organizer.organizerName,
                contactEmail: organizer.contactEmail,
                category: organizer.category,
                description: organizer.description
            },
            credentials: {
                email: contactEmail,
                password: password // plain password returned only once so admin can share it with the organizer
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/organizers', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const organizers = await Organizer.find().select('-password').sort({ createdAt: -1 });
        res.json(organizers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/organizer/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const organizer = await Organizer.findById(req.params.id);
        
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        await Organizer.findByIdAndDelete(req.params.id);
        
        res.json({ msg: "Organizer removed successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/organizer/:id/disable', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const organizer = await Organizer.findById(req.params.id);
        
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        organizer.disabled = !organizer.disabled; // Toggle disabled status
        await organizer.save();
        
        res.json({ 
            msg: organizer.disabled ? "Organizer disabled successfully" : "Organizer enabled successfully",
            organizer: {
                id: organizer._id,
                organizerName: organizer.organizerName,
                disabled: organizer.disabled
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/password-reset-requests', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const requests = await PasswordResetRequest.find({ status: 'pending' })
            .populate('organizer', 'organizerName contactEmail category')
            .sort({ createdAt: -1 });
        
        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/approve-password-reset/:requestId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const request = await PasswordResetRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ msg: "Request not found" });
        }

        const organizer = await Organizer.findById(request.organizer);
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        const newPassword = generatePassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        await Organizer.findByIdAndUpdate(
            request.organizer,
            { password: hashedPassword },
            { runValidators: false }
        );

        request.status = 'approved';
        await request.save();

        res.json({ 
            msg: "Password reset approved",
            newPassword: newPassword
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/reject-password-reset/:requestId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: "Access Denied. Admins only." });
        }

        const request = await PasswordResetRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ msg: "Request not found" });
        }

        request.status = 'rejected';
        await request.save();

        res.json({ msg: "Password reset request rejected" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;