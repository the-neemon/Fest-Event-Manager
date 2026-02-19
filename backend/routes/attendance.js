const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const AttendanceLog = require('../models/AttendanceLog');

// POST scan QR code - supports both camera scan and file upload
router.post('/scan', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const { qrData, method } = req.body; // method: 'qr_scan' or 'file_upload'

        console.log('QR Scan attempt - Raw data:', qrData);

        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
            console.log('Parsed QR data:', parsedData);
        } catch (err) {
            console.error('QR parse error:', err);
            return res.status(400).json({ msg: "Invalid QR code format" });
        }

        const { ticketId, eventId, participantId } = parsedData;

        console.log('Extracted fields:', { ticketId, eventId, participantId });

        if (!ticketId || !eventId || !participantId) {
            console.error('Missing fields in QR data:', { ticketId, eventId, participantId });
            return res.status(400).json({ 
                msg: "Incomplete QR code data. Missing: " + 
                    [!ticketId && 'ticketId', !eventId && 'eventId', !participantId && 'participantId']
                    .filter(Boolean).join(', ')
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized to scan for this event" });
        }

        const registration = await Registration.findOne({
            ticketId,
            eventId,
            participantId
        }).populate('participantId', 'firstName lastName email');

        if (!registration) {
            return res.status(404).json({ msg: "Invalid ticket" });
        }

        if (registration.attendance.marked) {
            return res.status(400).json({ 
                msg: "Attendance already marked",
                markedAt: registration.attendance.timestamp,
                duplicate: true
            });
        }

        registration.attendance.marked = true;
        registration.attendance.timestamp = new Date();
        await registration.save();

        const log = new AttendanceLog({
            eventId,
            registrationId: registration._id,
            participantId,
            action: 'marked',
            method: method || 'qr_scan',
            performedBy: req.user.id
        });
        await log.save();

        res.json({ 
            msg: "Attendance marked successfully",
            participant: {
                name: `${registration.participantId.firstName} ${registration.participantId.lastName}`,
                email: registration.participantId.email,
                ticketId: registration.ticketId
            },
            markedAt: registration.attendance.timestamp
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/event/:eventId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const registrations = await Registration.find({ 
            eventId: req.params.eventId,
            status: { $in: ['Registered', 'Approved', 'Completed'] }
        })
        .populate('participantId', 'firstName lastName email contactNumber')
        .sort({ 'attendance.timestamp': -1 });

        const totalRegistrations = registrations.length;
        const scanned = registrations.filter(r => r.attendance.marked).length;
        const notScanned = totalRegistrations - scanned;

        res.json({
            stats: {
                total: totalRegistrations,
                scanned,
                notScanned,
                scanRate: totalRegistrations > 0 ? ((scanned / totalRegistrations) * 100).toFixed(2) : 0
            },
            registrations: registrations.map(r => ({
                _id: r._id,
                ticketId: r.ticketId,
                participant: {
                    id: r.participantId._id,
                    name: `${r.participantId.firstName} ${r.participantId.lastName}`,
                    email: r.participantId.email,
                    contact: r.participantId.contactNumber
                },
                attendance: {
                    marked: r.attendance.marked,
                    timestamp: r.attendance.timestamp
                },
                registrationDate: r.registrationDate
            }))
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/manual/:registrationId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const { action, reason } = req.body; // action: 'mark' or 'unmark'

        if (!reason || reason.trim().length < 3) {
            return res.status(400).json({ msg: "Please provide a reason for manual override" });
        }

        const registration = await Registration.findById(req.params.registrationId)
            .populate('eventId')
            .populate('participantId', 'firstName lastName email');

        if (!registration) {
            return res.status(404).json({ msg: "Registration not found" });
        }

        const event = registration.eventId;

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const previousState = registration.attendance.marked;

        if (action === 'mark') {
            if (registration.attendance.marked) {
                return res.status(400).json({ msg: "Attendance already marked" });
            }
            registration.attendance.marked = true;
            registration.attendance.timestamp = new Date();
        } else if (action === 'unmark') {
            if (!registration.attendance.marked) {
                return res.status(400).json({ msg: "Attendance not marked yet" });
            }
            registration.attendance.marked = false;
            registration.attendance.timestamp = null;
        } else {
            return res.status(400).json({ msg: "Invalid action" });
        }

        await registration.save();

        // Create audit log
        const log = new AttendanceLog({
            eventId: event._id,
            registrationId: registration._id,
            participantId: registration.participantId._id,
            action: action === 'mark' ? 'marked' : 'unmarked',
            method: 'manual',
            performedBy: req.user.id,
            reason
        });
        await log.save();

        res.json({ 
            msg: `Attendance ${action === 'mark' ? 'marked' : 'unmarked'} successfully`,
            registration: {
                ticketId: registration.ticketId,
                participant: `${registration.participantId.firstName} ${registration.participantId.lastName}`,
                attendance: registration.attendance
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/logs/:eventId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const logs = await AttendanceLog.find({ eventId: req.params.eventId })
            .populate('participantId', 'firstName lastName email')
            .populate('performedBy', 'organizerName')
            .sort({ timestamp: -1 });

        res.json(logs);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
