const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, Hotel, Room, Booking } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'hotelease_secret_key';

const auth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });
        req.user = user; next();
    });
};

const isAdmin = (req, res, next) => req.user.role === 'พนักงาน' ? next() : res.status(403).send('Denied');

// --- 1. Auth ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, contact_number, address } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        await User.create({ username, email, password_hash, contact_number, address, role: 'ลูกค้า' });
        res.json({ message: 'Success' });
    } catch (e) { res.status(400).json({ error: 'Email exists' }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (user && await bcrypt.compare(password, user.password_hash)) {
        const token = jwt.sign({ user_id: user.user_id, role: user.role, username: user.username }, SECRET);
        res.json({ token, role: user.role, username: user.username });
    } else res.status(401).json({ message: 'Invalid credentials' });
});

// --- 2. ลูกค้า: ค้นหา & ดูโรงแรม ---
app.get('/api/hotels', async (req, res) => {
    const { location, room_type, max_price, check_in, check_out } = req.query;
    let hotelFilter = {}; let roomFilter = { availability: true };
    if (location) hotelFilter.location = { [Op.like]: `%${location}%` };
    if (room_type) roomFilter.room_type = { [Op.like]: `%${room_type}%` };
    if (max_price) roomFilter.price_per_night = { [Op.lte]: parseInt(max_price) };

    if (check_in && check_out) {
        const overlaps = await Booking.findAll({ where: { status: 'Confirmed', check_in_date: { [Op.lt]: check_out }, check_out_date: { [Op.gt]: check_in } } });
        const bookedIds = overlaps.map(b => b.room_id);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds };
    }
    const hotels = await Hotel.findAll({ where: hotelFilter, include: [{ model: Room, where: roomFilter, required: true }] });
    res.json(hotels);
});

app.get('/api/hotels/:id', async (req, res) => {
    const { check_in, check_out } = req.query;
    let roomFilter = { availability: true };
    if (check_in && check_out) {
        const overlaps = await Booking.findAll({ where: { status: 'Confirmed', check_in_date: { [Op.lt]: check_out }, check_out_date: { [Op.gt]: check_in } } });
        const bookedIds = overlaps.map(b => b.room_id);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds };
    }
    const hotel = await Hotel.findByPk(req.params.id, { include: [{ model: Room, where: roomFilter, required: false }] });
    res.json(hotel);
});

// --- 3. การจอง ---
app.post('/api/book', auth, async (req, res) => {
    const { room_id, check_in_date, check_out_date, total_amount } = req.body;
    await Booking.create({ user_id: req.user.user_id, room_id, check_in_date, check_out_date, total_amount });
    res.json({ message: 'Booked' });
});
app.get('/api/my-bookings', auth, async (req, res) => {
    const bookings = await Booking.findAll({ where: { user_id: req.user.user_id }, include: [{ model: Room, include: [Hotel] }] });
    res.json(bookings);
});

// ==========================================
// 🛡️ 4. แอดมิน: จัดการฐานข้อมูล (ใหม่!)
// ==========================================
// จัดการการจอง
app.get('/api/admin/bookings', auth, isAdmin, async (req, res) => {
    const bookings = await Booking.findAll({ include: [User, { model: Room, include: [Hotel] }] });
    res.json(bookings);
});
app.put('/api/admin/bookings/:id', auth, isAdmin, async (req, res) => {
    await Booking.update({ status: req.body.status }, { where: { booking_id: req.params.id } });
    res.json({ message: 'Updated' });
});

// ดึงโรงแรมและห้องพักทั้งหมดมาโชว์แอดมิน
app.get('/api/admin/all-data', auth, isAdmin, async (req, res) => {
    const hotels = await Hotel.findAll({ include: [Room] });
    res.json(hotels);
});

// จัดการโรงแรม (เพิ่ม / ลบ)
app.post('/api/admin/hotels', auth, isAdmin, async (req, res) => {
    await Hotel.create(req.body); res.json({ message: 'Hotel Added' });
});
app.delete('/api/admin/hotels/:id', auth, isAdmin, async (req, res) => {
    // เช็คว่ามีห้องไหนในโรงแรมนี้ถูกจองแบบ Confirmed ไหม
    const rooms = await Room.findAll({ where: { hotel_id: req.params.id } });
    const roomIds = rooms.map(r => r.room_id);
    const active = await Booking.count({ where: { room_id: { [Op.in]: roomIds }, status: 'Confirmed' } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้! มีลูกค้าจองโรงแรมนี้อยู่' });
    
    await Hotel.destroy({ where: { hotel_id: req.params.id } });
    res.json({ message: 'Hotel Deleted' });
});

// จัดการห้องพัก (เพิ่ม / ลบ)
app.post('/api/admin/rooms', auth, isAdmin, async (req, res) => {
    await Room.create(req.body); res.json({ message: 'Room Added' });
});
app.delete('/api/admin/rooms/:id', auth, isAdmin, async (req, res) => {
    const active = await Booking.count({ where: { room_id: req.params.id, status: 'Confirmed' } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้! ห้องนี้มีลูกค้าจองอยู่' });
    
    await Room.destroy({ where: { room_id: req.params.id } });
    res.json({ message: 'Room Deleted' });
});

// --- Mock Data ---
sequelize.sync({ force: true }).then(async () => {
    const adminPass = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'Admin System', email: 'admin@hotel.com', password_hash: adminPass, role: 'พนักงาน' });
    
    const h1 = await Hotel.create({ 
        hotel_name: 'Bangkok City Hotel', location: 'Bangkok', rating: 4.8, 
        description: 'โรงแรมใจกลางเมือง เดินทางสะดวกสบาย ใกล้รถไฟฟ้า',
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
    });
    await Room.create({ hotel_id: h1.hotel_id, room_type: 'Standard', price_per_night: 1200, max_occupancy: 2 });
    
    app.listen(3000, () => console.log('✅ Backend API -> http://localhost:3000'));
});