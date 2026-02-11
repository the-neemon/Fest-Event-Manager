const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

// GET forum messages - supports incremental loading via lastFetch query param
router.get('/:eventId/messages', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { lastFetch } = req.query;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (req.user.role === 'participant') {
            const registration = await Registration.findOne({
                participantId: req.user.id,
                eventId,
                status: { $in: ['Registered', 'Approved', 'Completed'] }
            });
            if (!registration) {
                return res.status(403).json({ msg: "You must be registered for this event to view the forum" });
            }
        } else if (req.user.role === 'organizer') {
            if (event.organizerId.toString() !== req.user.id) {
                return res.status(403).json({ msg: "Not authorized" });
            }
        }

        const query = { 
            eventId, 
            isDeleted: false,
            parentMessageId: null // Only get top-level messages
        };

        if (lastFetch) {
            query.createdAt = { $gt: new Date(lastFetch) };
        }

        const messages = await Message.find(query)
            .sort({ isPinned: -1, createdAt: -1 })
            .populate({
                path: 'authorId',
                select: 'firstName lastName organizerName'
            })
            .lean();

        const messagesWithReplies = await Promise.all(messages.map(async (msg) => {
            const replies = await Message.find({
                eventId,
                parentMessageId: msg._id,
                isDeleted: false
            })
            .sort({ createdAt: 1 })
            .populate({
                path: 'authorId',
                select: 'firstName lastName organizerName'
            })
            .lean();

            return {
                ...msg,
                replies,
                replyCount: replies.length
            };
        }));

        res.json(messagesWithReplies);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.post('/:eventId/messages', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content, isAnnouncement, parentMessageId } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ msg: "Message content is required" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (req.user.role === 'participant') {
            const registration = await Registration.findOne({
                participantId: req.user.id,
                eventId,
                status: { $in: ['Registered', 'Approved', 'Completed'] }
            });
            if (!registration) {
                return res.status(403).json({ msg: "You must be registered for this event to post" });
            }
            // Participants can't post announcements
            if (isAnnouncement) {
                return res.status(403).json({ msg: "Only organizers can post announcements" });
            }
        } else if (req.user.role === 'organizer') {
            if (event.organizerId.toString() !== req.user.id) {
                return res.status(403).json({ msg: "Not authorized" });
            }
        }

        const message = new Message({
            eventId,
            authorId: req.user.id,
            authorModel: req.user.role === 'participant' ? 'Participant' : 'Organizer',
            content: content.trim(),
            isAnnouncement: isAnnouncement && req.user.role === 'organizer',
            parentMessageId: parentMessageId || null
        });

        await message.save();
        
        const populatedMessage = await Message.findById(message._id)
            .populate({
                path: 'authorId',
                select: 'firstName lastName organizerName'
            })
            .lean();

        res.json(populatedMessage);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/messages/:messageId/react', auth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ msg: "Emoji is required" });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ msg: "Message not found" });
        }

        const existingReactionIndex = message.reactions.findIndex(
            r => r.userId.toString() === req.user.id && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add reaction
            message.reactions.push({
                userId: req.user.id,
                userModel: req.user.role === 'participant' ? 'Participant' : 'Organizer',
                emoji
            });
        }

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate({
                path: 'authorId',
                select: 'firstName lastName organizerName'
            })
            .lean();

        res.json(populatedMessage);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.put('/messages/:messageId/pin', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Only organizers can pin messages" });
        }

        const message = await Message.findById(req.params.messageId).populate('eventId');
        if (!message) {
            return res.status(404).json({ msg: "Message not found" });
        }

        if (message.eventId.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        message.isPinned = !message.isPinned;
        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate({
                path: 'authorId',
                select: 'firstName lastName organizerName'
            })
            .lean();

        res.json(populatedMessage);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/messages/:messageId', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ msg: "Only organizers can delete messages" });
        }

        const message = await Message.findById(req.params.messageId).populate('eventId');
        if (!message) {
            return res.status(404).json({ msg: "Message not found" });
        }

        if (message.eventId.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        message.isDeleted = true;
        await message.save();

        // Also soft delete all replies
        await Message.updateMany(
            { parentMessageId: message._id },
            { isDeleted: true }
        );

        res.json({ msg: "Message deleted successfully" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/:eventId/stats', auth, async (req, res) => {
    try {
        const { eventId } = req.params;

        const totalMessages = await Message.countDocuments({ 
            eventId, 
            isDeleted: false 
        });
        
        const announcements = await Message.countDocuments({ 
            eventId, 
            isAnnouncement: true,
            isDeleted: false 
        });

        res.json({
            totalMessages,
            announcements
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
