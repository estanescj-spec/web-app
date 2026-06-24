const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

exports.isAuthenticatedUser = (req, res, next) => {
    let token = null;

    if (req.header('Authorization')) {
        token = req.header('Authorization').split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Login first to access this resource' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = { id: decoded.id };
        req.body = req.body || {};
        req.body.user = { id: decoded.id };
        
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired authentication token' });
    }
};
