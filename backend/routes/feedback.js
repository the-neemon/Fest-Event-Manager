const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

router.post('/:eventId', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ msg: "Rating must be between 1 and 5" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (event.status !== 'Completed') {
            return res.status(400).json({ msg: "Feedback can only be submitted for completed events" });
        }

        const registration = await Registration.findOne({
            eventId,
            participantId: req.user.id,
            'attendance.marked': true
        });

        if (!registration) {
            return res.status(403).json({ msg: "You can only submit feedback for events you attended" });
        }

        const existingFeedback = await Feedback.findOne({
            eventId,
            participantId: req.user.id
        });

        if (existingFeedback) {
            return res.status(400).json({ msg: "You have already submitted feedback for this event" });
        }

        // Create feedback
        const feedback = new Feedback({
            eventId,
            participantId: req.user.id,
            rating,
            comment: comment || '',
            isAnonymous: true
        });

        await feedback.save();

        res.json({ msg: "Feedback submitted successfully", feedback: { rating, comment } });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/event/:eventId', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { rating } = req.query; // Optional rating filter

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (req.user.role !== 'organizer' || event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const query = { eventId };
        if (rating) {
            query.rating = parseInt(rating);
        }

        const feedbacks = await Feedback.find(query)
            .select('rating comment submittedAt')
            .sort({ submittedAt: -1 });

        // Calculate statistics
        const allFeedbacks = await Feedback.find({ eventId });
        const totalFeedbacks = allFeedbacks.length;
        
        const ratingCounts = {
            1: allFeedbacks.filter(f => f.rating === 1).length,
            2: allFeedbacks.filter(f => f.rating === 2).length,
            3: allFeedbacks.filter(f => f.rating === 3).length,
            4: allFeedbacks.filter(f => f.rating === 4).length,
            5: allFeedbacks.filter(f => f.rating === 5).length
        };

        const averageRating = totalFeedbacks > 0
            ? (allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(2)
            : 0;

        res.json({
            feedbacks,
            statistics: {
                totalFeedbacks,
                averageRating: parseFloat(averageRating),
                ratingDistribution: ratingCounts
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/export/:eventId', auth, async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: "Event not found" });
        }

        if (req.user.role !== 'organizer' || event.organizerId.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const feedbacks = await Feedback.find({ eventId })
            .select('rating comment submittedAt')
            .sort({ submittedAt: -1 });

        // Create CSV content
        const csvHeader = 'Rating,Comment,Submitted At\n';
        const csvRows = feedbacks.map(f => 
            `${f.rating},"${(f.comment || '').replace(/"/g, '""')}","${new Date(f.submittedAt).toLocaleString()}"`
        ).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="feedback_${event.name.replace(/\s+/g, '_')}_${Date.now()}.csv"`);
        res.send(csv);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get('/check/:eventId', auth, async (req, res) => {
    try {
        const { eventId } = req.params;

        const feedback = await Feedback.findOne({
            eventId,
            participantId: req.user.id
        });

        res.json({ hasSubmitted: !!feedback });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
