const jwt = require('jsonwebtoken');
const SECRET = 'hotelease_secret_key';

// ตรวจสอบ JWT Token
exports.auth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });
        req.user = user; 
        next();
    });
};

// ตรวจสอบว่าเป็นพนักงาน (Admin) หรือไม่
exports.isAdmin = (req, res, next) => {
    if (req.user.role === 'พนักงาน') {
        next();
    } else {
        res.status(403).send('Denied');
    }
};