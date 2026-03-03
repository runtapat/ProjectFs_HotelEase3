const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const SECRET = 'hotelease_secret_key';

exports.register = async (req, res) => {
    try {
        const { username, email, password, contact_number, address } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        await User.create({ username, email, password_hash, contact_number, address, role: 'ลูกค้า' });
        res.json({ message: 'Success' });
    } catch (e) { 
        res.status(400).json({ error: 'Email exists' }); 
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.password_hash)) {
        const token = jwt.sign({ user_id: user.user_id, role: user.role, username: user.username }, SECRET);
        res.json({ token, role: user.role, username: user.username });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};