const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const auth = require('../middleware/auth');

// checks email domain to enforce the isIIITStudent flag is not self-declared falsely
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, isIIITStudent, participantType, collegeName, contactNumber } = req.body;

        if (isIIITStudent) {
            const domain = email.split('@')[1];
            const validDomains = ['iiit.ac.in', 'research.iiit.ac.in', 'student.iiit.ac.in'];
            if (!domain || !validDomains.includes(domain)) {
                return res.status(400).json({ msg: "IIIT students must use a valid IIIT email address (@iiit.ac.in, @research.iiit.ac.in, or @student.iiit.ac.in)." });
            }
        }

        let existingUser = await Participant.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists" });
        }

        existingUser = await Organizer.findOne({ contactEmail: email });
        if (existingUser) {
            return res.status(400).json({ msg: "Email already in use" });
        }

        existingUser = await Admin.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "Email already in use" });
        }

        user = new Participant({
            firstName, lastName, email, password, isIIITStudent, participantType, collegeName, contactNumber
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { user: { id: user.id, role: 'participant' } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// single login endpoint for all three roles - role is embedded in the JWT payload
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        let user = null;
        let role = null;

        user = await Participant.findOne({ email });
        if (user) role = 'participant';

        if (!user) {
            user = await Organizer.findOne({ contactEmail: email });
            if (user) {
                if (user.disabled) {
                    return res.status(403).json({ msg: "Account has been disabled by admin" });
                }
                role = 'organizer';
            }
        }

        if (!user) {
            user = await Admin.findOne({ email });
            if (user) role = 'admin';
        }

        if (!user) {
            return res.status(400).json({ msg: "Invalid Credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid Credentials" });
        }

        const payload = { user: { id: user.id, role: role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
            if (err) throw err;
            
            // hasInterests drives whether frontend redirects new participants to the onboarding page
            const hasInterests = role === 'participant' && user.interests && user.interests.length > 0;
            
            res.json({ token, role, hasInterests });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/update-interests', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const { interests, followedOrganizers } = req.body; // Expecting ["Technical", "Sports"] and organizer IDs

        const updateData = { interests: interests || [] };
        if (followedOrganizers) {
            updateData.followedOrganizers = followedOrganizers;
        }

        await Participant.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        res.json({ msg: "Profile Updated Successfully" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/organizers', async (req, res) => {
    try {
        // We only return Name, Email, Description, and Category (not password!)
        const organizers = await Organizer.find()
            .select('organizerName contactEmail description category');
        res.json(organizers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/organizer/:organizerId', async (req, res) => {
    try {
        const Event = require('../models/Event');
        const organizer = await Organizer.findById(req.params.organizerId)
            .select('organizerName contactEmail description category email');
        
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        const now = new Date();
        
        const upcomingEvents = await Event.find({ 
            organizerId: req.params.organizerId,
            startDate: { $gte: now }
        }).sort({ startDate: 1 });

        const pastEvents = await Event.find({ 
            organizerId: req.params.organizerId,
            endDate: { $lt: now }
        }).sort({ startDate: -1 });

        res.json({
            organizer,
            upcomingEvents,
            pastEvents
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/follow/:organizerId', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const participant = await Participant.findById(userId);
        if (!participant) {
            return res.status(404).json({ msg: "Participant not found" });
        }

        if (participant.followedOrganizers.includes(req.params.organizerId)) {
            return res.status(400).json({ msg: "Already following this organizer" });
        }

        participant.followedOrganizers.push(req.params.organizerId);
        await participant.save();

        res.json({ msg: "Successfully followed organizer", followedOrganizers: participant.followedOrganizers });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/unfollow/:organizerId', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const participant = await Participant.findById(userId);
        if (!participant) {
            return res.status(404).json({ msg: "Participant not found" });
        }

        participant.followedOrganizers = participant.followedOrganizers.filter(
            id => id.toString() !== req.params.organizerId
        );
        await participant.save();

        res.json({ msg: "Successfully unfollowed organizer", followedOrganizers: participant.followedOrganizers });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/followed-organizers', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        const participant = await Participant.findById(userId).select('followedOrganizers');
        res.json(participant.followedOrganizers || []);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/profile', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;
        const userRole = decoded.user.role;

        let user = null;

        if (userRole === 'participant') {
            user = await Participant.findById(userId).select('-password').populate('followedOrganizers', 'organizerName');
        } else if (userRole === 'organizer') {
            user = await Organizer.findById(userId).select('-password');
        } else if (userRole === 'admin') {
            user = await Admin.findById(userId).select('-password');
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/profile', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;
        const userRole = decoded.user.role;

        const { firstName, lastName, contactNumber, participantType, collegeName, interests } = req.body;

        let user = null;

        if (userRole === 'participant') {
            user = await Participant.findByIdAndUpdate(
                userId,
                { 
                    firstName, 
                    lastName, 
                    contactNumber, 
                    participantType, 
                    collegeName,
                    interests 
                },
                { new: true }
            ).select('-password');
        } else if (userRole === 'organizer') {
            // organizer profile update maps firstName -> organizerName (frontend reuses the same form)
            user = await Organizer.findByIdAndUpdate(
                userId,
                { 
                    organizerName: firstName,
                    contactNumber,
                    description: collegeName
                },
                { new: true }
            ).select('-password');
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found or update failed" });
        }

        res.json({ msg: "Profile updated successfully", user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/request-password-reset', async (req, res) => {
    try {
        const { email, reason } = req.body;

        const organizer = await Organizer.findOne({ contactEmail: email });
        if (!organizer) {
            return res.status(404).json({ msg: "No organizer account found with this email" });
        }

        const existingRequest = await PasswordResetRequest.findOne({
            organizer: organizer._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ msg: "You already have a pending password reset request" });
        }

        const request = new PasswordResetRequest({
            organizer: organizer._id,
            reason: reason || 'Forgot password'
        });

        await request.save();

        res.json({ msg: "Password reset request submitted successfully. Admin will review your request." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/change-password', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;
        const userRole = decoded.user.role;

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: "Please provide current and new password" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ msg: "New password must be at least 6 characters long" });
        }

        let user = null;

        if (userRole === 'participant') {
            user = await Participant.findById(userId);
        } else if (userRole === 'organizer') {
            user = await Organizer.findById(userId);
        } else if (userRole === 'admin') {
            user = await Admin.findById(userId);
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ msg: "Password changed successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: "Token is not valid" });
        }
        res.status(500).send("Server Error");
    }
});

module.exports = router;