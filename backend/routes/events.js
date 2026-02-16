const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const axios = require('axios');
const { sendTicketEmail } = require('../utils/emailService');

router.post('/create', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const { 
            name, description, eventType, eligibility, 
            registrationDeadline, startDate, endDate, registrationLimit, 
            registrationFee, location, 
            tags, // New
            itemDetails, stock, purchaseLimit, // New (for Merch)
            formFields, // New (for Dynamic Forms)
            status // Status field (Draft or Published)
        } = req.body;

        const event = new Event({
            name, 
            description, 
            eventType, 
            eligibility, 
            registrationDeadline, 
            startDate, 
            endDate, 
            registrationLimit,
            registrationFee, 
            location, 
            tags, 
            itemDetails, stock, purchaseLimit, 
            formFields, 
            status: status || 'Draft', // Default to Draft if not provided
            organizerId: req.user.id
        });

        await event.save();

        if (status === 'Published') {
            const organizer = await Organizer.findById(req.user.id);
            console.log('Event published, checking webhook...');
            console.log('Organizer webhook URL:', organizer?.discordWebhook);
            
            if (organizer && organizer.discordWebhook) {
                try {
                    console.log('Sending to Discord...');
                    const response = await axios.post(organizer.discordWebhook, {
                        embeds: [{
                            title: `📅 ${event.name}`,
                            description: event.description,
                            color: event.eventType === 'Merchandise' ? 0x9B59B6 : 0x3498DB,
                            fields: [
                                { name: '🎯 Eligibility', value: event.eligibility, inline: true },
                                { name: '💰 Fee', value: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free', inline: true },
                                { name: '📍 Location', value: event.location || 'TBA', inline: true },
                                { name: '🗓️ Event Date', value: new Date(event.startDate).toLocaleDateString(), inline: true },
                                { name: '📊 Spots', value: event.registrationLimit.toString(), inline: true }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    });
                    console.log('Discord webhook success:', response.status);
                } catch (webhookError) {
                    console.error('Discord webhook failed:', webhookError.message);
                    console.error('Error details:', webhookError.response?.data);
                }
            } else {
                console.log('No webhook URL configured');
            }
        }

        res.json(event);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/my-events', auth, async (req, res) => {
    try {
        const events = await Event.find({ organizerId: req.user.id });
        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/analytics', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const allEvents = await Event.find({ 
            organizerId: req.user.id
        });

        let totalRegistrations = 0;
        let totalSales = 0;
        let totalRevenue = 0;
        let totalAttendance = 0;

        for (const event of allEvents) {
            const registrations = await Registration.find({ eventId: event._id });
            totalRegistrations += registrations.length;
            
            if (event.eventType === 'Merchandise') {
                totalSales += registrations.length;
            }
            
            totalRevenue += registrations.length * (event.registrationFee || 0);
            totalAttendance += registrations.filter(r => r.attended).length;
        }

        res.json({
            totalRegistrations,
            totalSales,
            totalRevenue,
            totalAttendance
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/all', async (req, res) => {
    try {
        const { search, eventType, eligibility, startDate, endDate, followedOnly } = req.query;
        
        let query = {};

        // Only show Published, Ongoing, and Closed events (NOT Draft)
        query.status = { $in: ['Published', 'Ongoing', 'Closed'] };

        // Filter by followed clubs only
        if (followedOnly === 'true') {
            const token = req.header('x-auth-token');
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const participant = await require('../models/Participant').findById(decoded.user.id);
                if (participant && participant.followedOrganizers.length > 0) {
                    query.organizerId = { $in: participant.followedOrganizers };
                } else {
                    // If user has no followed organizers, return empty array
                    return res.json([]);
                }
            }
        }

        // Search: Partial & Fuzzy matching on Event/Organizer names
        if (search) {
            const organizers = await require('../models/Organizer').find({
                organizerName: { $regex: search, $options: 'i' }
            }).select('_id');
            
            const organizerIds = organizers.map(org => org._id);
            
            const searchQuery = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { organizerId: { $in: organizerIds } }
                ]
            };

            // Combine with followedOnly filter if it exists
            if (query.organizerId) {
                query = {
                    $and: [
                        { organizerId: query.organizerId },
                        searchQuery
                    ]
                };
            } else {
                query = { ...query, ...searchQuery };
            }
        }

        if (eventType && eventType !== 'all') {
            query.eventType = eventType;
        }

        if (eligibility && eligibility !== 'all') {
            query.eligibility = eligibility;
        }

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        let events = await Event.find(query)
            .populate('organizerId', 'organizerName');
        
        const token = req.header('x-auth-token');
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user.role === 'participant') {
                    const participant = await Participant.findById(decoded.user.id);
                    if (participant && participant.interests && participant.interests.length > 0) {
                        const userInterests = participant.interests.map(i => i.toLowerCase());
                        events = events.sort((a, b) => {
                            const aMatches = (a.tags || []).some(tag => userInterests.includes(tag.toLowerCase()));
                            const bMatches = (b.tags || []).some(tag => userInterests.includes(tag.toLowerCase()));
                            if (aMatches && !bMatches) return -1;
                            if (!aMatches && bMatches) return 1;
                            return new Date(a.startDate) - new Date(b.startDate);
                        });
                    } else {
                        events = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                    }
                } else {
                    events = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                }
            } catch (err) {
                events = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            }
        } else {
            events = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        }
        
        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/trending', async (req, res) => {
    try {
        const { eventType, eligibility, startDate, endDate, followedOnly } = req.query;
        
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        let eventQuery = {};

        // Filter by followed clubs only
        if (followedOnly === 'true') {
            const token = req.header('x-auth-token');
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const participant = await require('../models/Participant').findById(decoded.user.id);
                if (participant && participant.followedOrganizers.length > 0) {
                    eventQuery.organizerId = { $in: participant.followedOrganizers };
                } else {
                    return res.json([]);
                }
            }
        }

        if (eventType && eventType !== 'all') {
            eventQuery.eventType = eventType;
        }
        if (eligibility && eligibility !== 'all') {
            eventQuery.eligibility = eligibility;
        }
        if (startDate || endDate) {
            eventQuery.startDate = {};
            if (startDate) eventQuery.startDate.$gte = new Date(startDate);
            if (endDate) eventQuery.startDate.$lte = new Date(endDate);
        }

        const recentRegistrations = await Registration.find({
            registrationDate: { $gte: oneDayAgo }
        });

        // Count registrations per event
        const eventCounts = {};
        recentRegistrations.forEach(reg => {
            const eventId = reg.eventId.toString();
            eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
        });

        const topEventIds = Object.entries(eventCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([eventId]) => eventId);

        eventQuery._id = { $in: topEventIds };
        let trendingEvents = await Event.find(eventQuery)
            .populate('organizerId', 'organizerName');

        const token = req.header('x-auth-token');
        let sortedEvents;
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user.role === 'participant') {
                    const participant = await Participant.findById(decoded.user.id);
                    if (participant && participant.interests && participant.interests.length > 0) {
                        const userInterests = participant.interests.map(i => i.toLowerCase());
                        sortedEvents = trendingEvents.sort((a, b) => {
                            const aMatches = (a.tags || []).some(tag => userInterests.includes(tag.toLowerCase()));
                            const bMatches = (b.tags || []).some(tag => userInterests.includes(tag.toLowerCase()));
                            if (aMatches && !bMatches) return -1;
                            if (!aMatches && bMatches) return 1;
                            return eventCounts[b._id.toString()] - eventCounts[a._id.toString()];
                        });
                    } else {
                        sortedEvents = trendingEvents.sort((a, b) => {
                            return eventCounts[b._id.toString()] - eventCounts[a._id.toString()];
                        });
                    }
                } else {
                    sortedEvents = trendingEvents.sort((a, b) => {
                        return eventCounts[b._id.toString()] - eventCounts[a._id.toString()];
                    });
                }
            } catch (err) {
                sortedEvents = trendingEvents.sort((a, b) => {
                    return eventCounts[b._id.toString()] - eventCounts[a._id.toString()];
                });
            }
        } else {
            sortedEvents = trendingEvents.sort((a, b) => {
                return eventCounts[b._id.toString()] - eventCounts[a._id.toString()];
            });
        }

        res.json(sortedEvents);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/register/:id', auth, async (req, res) => {
    try {
        console.log('Registration attempt for event:', req.params.id);
        console.log('User:', req.user);
        
        const event = await Event.findById(req.params.id);
        if (!event) {
            console.log('Event not found');
            return res.status(404).json({ msg: "Event not found" });
        }

        console.log('Event found:', event.name);

        const participant = await Participant.findById(req.user.id);
        if (!participant) {
            return res.status(404).json({ msg: "Participant not found" });
        }

        // Check eligibility
        if (event.eligibility === 'IIIT Students Only' && !participant.isIIITStudent) {
            return res.status(403).json({ msg: "This event is only open to IIIT students" });
        }

        const now = new Date();
        const deadline = new Date(event.registrationDeadline);
        if (now > deadline) {
            console.log('Registration deadline has passed');
            return res.status(400).json({ msg: "Registration deadline has passed" });
        }

        const existingRegistration = await Registration.findOne({
            participantId: req.user.id,
            eventId: req.params.id
        });

        if (existingRegistration) {
            console.log('User already registered');
            return res.status(400).json({ msg: "You are already registered for this event." });
        }

        if (event.eventType === 'Normal') {
            if (event.participants.length >= event.registrationLimit) {
                console.log('Event is full');
                return res.status(400).json({ msg: "Event is full!" });
            }
        }

        if (event.eventType === 'Merchandise') {
            if (event.stock <= 0) {
                console.log('Out of stock');
                return res.status(400).json({ msg: "Out of Stock!" });
            }
            // Don't decrement stock yet - will happen on payment approval
        }

        console.log('Creating registration record...');
        const registration = new Registration({
            participantId: req.user.id,
            eventId: req.params.id,
            formResponses: req.body.formResponses || {}
        });

        // For merchandise, require payment proof and set status to Pending
        if (event.eventType === 'Merchandise') {
            const { paymentProof } = req.body;
            if (!paymentProof) {
                return res.status(400).json({ msg: "Payment proof is required for merchandise purchases" });
            }
            
            registration.paymentProof = {
                data: paymentProof,
                uploadedAt: new Date(),
                status: 'pending'
            };
            registration.status = 'Pending';
        } else {
            // For normal events, generate ticket immediately
            const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
            registration.ticketId = ticketId;
            registration.status = 'Registered';
        }

        await registration.save();
        console.log('Registration saved');

        event.participants.push(req.user.id);
        await event.save();
        console.log('Event updated with participant');

        try {
            const participant = await Participant.findById(req.user.id);
            if (participant && participant.email) {
                await sendTicketEmail(participant, event, registration.ticketId);
                console.log('Confirmation email sent successfully');
            }
        } catch (emailError) {
            console.error('Error sending email, but registration successful:', emailError);
        }

        const message = event.eventType === 'Merchandise' 
            ? "Order placed! Check your email for confirmation. Payment is pending approval." 
            : "Registration Successful! Check your email for the ticket.";

        res.json({ 
            msg: message,
            ticketId: registration.ticketId,
            registration 
        });

    } catch (err) {
        console.error('Registration error:', err.message);
        console.error('Full error:', err);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

router.get('/my-registrations', auth, async (req, res) => {
    try {
        const registrations = await Registration.find({ 
            participantId: req.user.id 
        })
        .populate('eventId')
        .populate({
            path: 'eventId',
            populate: {
                path: 'organizerId',
                select: 'organizerName'
            }
        })
        .sort({ registrationDate: -1 });
        
        res.json(registrations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/my-registrations/upcoming', auth, async (req, res) => {
    try {
        const now = new Date();
        
        const registrations = await Registration.find({ 
            participantId: req.user.id,
            status: 'Registered'
        })
        .populate({
            path: 'eventId',
            match: { startDate: { $gte: now } },
            populate: {
                path: 'organizerId',
                select: 'organizerName'
            }
        })
        .sort({ 'eventId.startDate': 1 });
        
        const filteredRegistrations = registrations.filter(reg => reg.eventId !== null);
        
        res.json(filteredRegistrations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/cancel-registration/:registrationId', auth, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.registrationId);
        
        if (!registration) {
            return res.status(404).json({ msg: "Registration not found" });
        }

        if (registration.participantId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        if (registration.status === 'Cancelled' || registration.status === 'Rejected') {
            return res.status(400).json({ msg: "Registration already cancelled" });
        }

        registration.status = 'Cancelled';
        await registration.save();

        // Optionally: restore stock for merchandise
        const event = await Event.findById(registration.eventId);
        if (event && event.eventType === 'Merchandise') {
            event.stock = event.stock + 1;
            await event.save();
        }

        res.json({ msg: "Registration cancelled successfully", registration });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

router.get('/ongoing', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Access Denied" });
        }

        const now = new Date();
        const events = await Event.find({ 
            organizerId: req.user.id,
            status: 'Ongoing',
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/detail/:id', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        res.json(event);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/:id/participants', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        const participants = await Registration.find({ eventId: req.params.id })
            .populate('participantId', 'firstName lastName email');

        res.json(participants);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/:id/publish', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        if (event.status !== 'Draft') {
            return res.status(400).json({ msg: "Only draft events can be published" });
        }

        event.status = 'Published';
        await event.save();

        res.json({ msg: "Event published successfully", event });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/:id/update', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        // Draft: Allow all edits
        if (event.status === 'Draft') {
            const { name, description, startDate, endDate, registrationDeadline, location, eligibility, registrationFee, registrationLimit } = req.body;
            if (name) event.name = name;
            if (description) event.description = description;
            if (startDate) event.startDate = startDate;
            if (endDate) event.endDate = endDate;
            if (registrationDeadline) event.registrationDeadline = registrationDeadline;
            if (location) event.location = location;
            if (eligibility) event.eligibility = eligibility;
            if (registrationFee !== undefined) event.registrationFee = registrationFee;
            if (registrationLimit) event.registrationLimit = registrationLimit;
        }
        // Published: Limited edits only
        else if (event.status === 'Published') {
            const { description, registrationDeadline, registrationLimit } = req.body;
            if (description) event.description = description;
            if (registrationDeadline) event.registrationDeadline = registrationDeadline;
            if (registrationLimit) event.registrationLimit = registrationLimit;
        }
        else {
            return res.status(400).json({ msg: "Cannot edit events that are Ongoing, Completed, or Closed" });
        }

        await event.save();
        res.json({ msg: "Event updated successfully", event });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/:id/status', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Access denied" });
        }

        const { status } = req.body;
        
        // Only allow status changes for Published/Ongoing events
        if (!['Published', 'Ongoing', 'Completed', 'Closed'].includes(event.status)) {
            return res.status(400).json({ msg: "Status can only be changed for Published or Ongoing events" });
        }

        if (!['Published', 'Ongoing', 'Completed', 'Closed'].includes(status)) {
            return res.status(400).json({ msg: "Invalid status" });
        }

        const oldStatus = event.status;
        event.status = status;
        await event.save();

        // When status changes to Ongoing, do NOT automatically mark anyone as absent
        // Attendance should only be marked through QR scanning or manual marking

        res.json({ msg: "Status updated successfully", event });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;