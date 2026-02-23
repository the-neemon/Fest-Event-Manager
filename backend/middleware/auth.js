const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // verifies signature and expiry, decoded contains { user: { id, role } }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // now available as req.user.id and req.user.role in all routes
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};