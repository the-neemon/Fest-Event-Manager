require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
// http.Server wraps Express so Socket.io and REST share the same port
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Export io so forum route can emit events directly
module.exports.io = io;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // large limit needed for base64-encoded payment proof images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        startEventStatusUpdater(); // started here so it only runs after DB is ready
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
    }, 60000); // runs every 60 seconds - status transitions happen within a minute of the actual date
}

// Each connected socket joins the room for its event so broadcasts are scoped per event
io.on('connection', (socket) => {
    socket.on('join_forum', (eventId) => {
        socket.join(`forum:${eventId}`);
    });

    socket.on('leave_forum', (eventId) => {
        socket.leave(`forum:${eventId}`);
    });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/organizer', require('./routes/organizer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/attendance', require('./routes/attendance'));

const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
    res.send('API is Running Successfully');
});
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
