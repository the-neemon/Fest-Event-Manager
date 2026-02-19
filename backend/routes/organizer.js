const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Organizer = require('../models/Organizer');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/emailService');

router.get('/profile', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const organizer = await Organizer.findById(req.user.id).select('-password');
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        res.json(organizer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/profile', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const { organizerName, category, description, contactEmail, discordWebhook } = req.body;

        const organizer = await Organizer.findById(req.user.id);
        if (!organizer) {
            return res.status(404).json({ msg: "Organizer not found" });
        }

        if (organizerName) organizer.organizerName = organizerName;
        if (category) organizer.category = category;
        if (description) organizer.description = description;
        if (contactEmail) organizer.contactEmail = contactEmail;
        if (discordWebhook !== undefined) organizer.discordWebhook = discordWebhook;

        await organizer.save();

        res.json({ msg: "Profile updated successfully", organizer });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/pending-payments/:eventId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized to view this event's payments" });
        }

        const pendingPayments = await Registration.find({
            eventId: req.params.eventId,
            'paymentProof.data': { $exists: true }
        })
        .populate('participantId', 'firstName lastName email')
        .sort({ 'paymentProof.uploadedAt': -1 });

        console.log('Pending payments found:', pendingPayments.length);
        res.json(pendingPayments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/approve-payment/:registrationId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const registration = await Registration.findById(req.params.registrationId)
            .populate('eventId')
            .populate('participantId');

        if (!registration) {
            return res.status(404).json({ msg: "Registration not found" });
        }

        const event = registration.eventId;

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized to approve this payment" });
        }

        if (registration.paymentProof.status === 'approved') {
            return res.status(400).json({ msg: "Payment already approved" });
        }

        const ticketId = crypto.randomBytes(8).toString('hex').toUpperCase();

        const qrData = JSON.stringify({
            ticketId: ticketId,
            eventId: event._id,
            participantId: registration.participantId._id,
            eventName: event.name,
            participantName: `${registration.participantId.firstName} ${registration.participantId.lastName}`
        });
        const qrCode = await QRCode.toDataURL(qrData);

        registration.ticketId = ticketId;
        registration.status = 'Approved';
        registration.paymentProof.status = 'approved';
        registration.paymentProof.reviewedBy = req.user.id;
        registration.paymentProof.reviewedAt = new Date();

        await registration.save();

        if (event.eventType === 'Merchandise') {
            event.stock = Math.max(0, event.stock - 1);
            await event.save();
        }

        // Send ticket email (non-blocking - don't fail if email fails)
        try {
            await sendTicketEmail(registration.participantId, event, ticketId);
        } catch (emailError) {
            console.error('Failed to send ticket email:', emailError.message);
            // Don't fail the request if email fails
        }

        res.json({ msg: "Payment approved and ticket generated", registration });
    } catch (err) {
        console.error('Error approving payment:', err.message);
        console.error(err.stack);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

router.put('/reject-payment/:registrationId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const { rejectionReason } = req.body;

        const registration = await Registration.findById(req.params.registrationId)
            .populate('eventId')
            .populate('participantId');

        if (!registration) {
            return res.status(404).json({ msg: "Registration not found" });
        }

        const event = registration.eventId;

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized to reject this payment" });
        }

        registration.status = 'Rejected';
        registration.paymentProof.status = 'rejected';
        registration.paymentProof.reviewedBy = req.user.id;
        registration.paymentProof.reviewedAt = new Date();
        registration.paymentProof.rejectionReason = rejectionReason || 'Payment proof invalid';

        await registration.save();

        // Note: Email notification for rejection can be added later if needed
        console.log(`Payment rejected for registration ${registration._id}`);

        res.json({ msg: "Payment rejected", registration });
    } catch (err) {
        console.error('Error rejecting payment:', err.message);
        console.error(err.stack);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

module.exports = router;
