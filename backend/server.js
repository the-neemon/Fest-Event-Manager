require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        startEventStatusUpdater();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Auto-updates event status (Published -> Ongoing -> Completed) based on dates
function startEventStatusUpdater() {
    const Event = require('./models/Event');
    
    setInterval(async () => {
        try {
            const now = new Date();
            
            await Event.updateMany(
                { status: 'Published', startDate: { $lte: now } },
                { $set: { status: 'Ongoing' } }
            );
            
            await Event.updateMany(
                { status: 'Ongoing', endDate: { $lt: now } },
                { $set: { status: 'Completed' } }
            );
        } catch (err) {
            console.error('Error updating event statuses:', err);
        }
    }, 60000);
    
    console.log('Event status auto-updater started');
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/organizer', require('./routes/organizer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/attendance', require('./routes/attendance'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
