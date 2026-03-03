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

// ฟังก์ชันเช็ควันทับซ้อน (ดักทั้ง Pending และ Confirmed)
const getOverlappingRooms = async (check_in, check_out) => {
    const overlaps = await Booking.findAll({
        where: { 
            status: { [Op.in]: ['Pending', 'Confirmed'] }, // 🌟 ไม่ว่างถ้ารอจ่ายเงินหรือยืนยันแล้ว
            check_in_date: { [Op.lt]: check_out }, 
            check_out_date: { [Op.gt]: check_in } 
        }
    });
    return overlaps.map(b => b.room_id);
};

app.get('/api/hotels', async (req, res) => {
    const { location, room_type, max_price, check_in, check_out } = req.query;
    let hotelFilter = {}; let roomFilter = { availability: true };
    if (location) hotelFilter.location = { [Op.like]: `%${location}%` };
    if (room_type) roomFilter.room_type = { [Op.like]: `%${room_type}%` };
    if (max_price) roomFilter.price_per_night = { [Op.lte]: parseInt(max_price) };

    if (check_in && check_out) {
        const bookedIds = await getOverlappingRooms(check_in, check_out);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds };
    }
    const hotels = await Hotel.findAll({ where: hotelFilter, include: [{ model: Room, where: roomFilter, required: true }] });
    res.json(hotels);
});

app.get('/api/hotels/:id', async (req, res) => {
    const { check_in, check_out } = req.query;
    let roomFilter = { availability: true };
    if (check_in && check_out) {
        const bookedIds = await getOverlappingRooms(check_in, check_out);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds };
    }
    const hotel = await Hotel.findByPk(req.params.id, { include: [{ model: Room, where: roomFilter, required: false }] });
    res.json(hotel);
});

app.post('/api/book', auth, async (req, res) => {
    const { room_id, check_in_date, check_out_date, total_amount } = req.body;
    // จองเสร็จจะเข้าสถานะ Pending อัตโนมัติ (ตั้งใน Model ไว้แล้ว)
    await Booking.create({ user_id: req.user.user_id, room_id, check_in_date, check_out_date, total_amount });
    res.json({ message: 'Booked' });
});

app.get('/api/my-bookings', auth, async (req, res) => {
    const bookings = await Booking.findAll({ where: { user_id: req.user.user_id }, include: [{ model: Room, include: [Hotel] }] });
    res.json(bookings);
});

// --- ADMIN API ---
app.get('/api/admin/bookings', auth, isAdmin, async (req, res) => {
    const bookings = await Booking.findAll({ include: [User, { model: Room, include: [Hotel] }], order: [['booking_date', 'DESC']] });
    res.json(bookings);
});
app.put('/api/admin/bookings/:id', auth, isAdmin, async (req, res) => {
    await Booking.update({ status: req.body.status }, { where: { booking_id: req.params.id } });
    res.json({ message: 'Updated' });
});
app.get('/api/admin/all-data', auth, isAdmin, async (req, res) => {
    const hotels = await Hotel.findAll({ include: [Room] });
    res.json(hotels);
});

// จัดการโรงแรม (เพิ่ม, แก้ไข, ลบ)
app.post('/api/admin/hotels', auth, isAdmin, async (req, res) => { await Hotel.create(req.body); res.json({ message: 'Added' }); });
app.put('/api/admin/hotels/:id', auth, isAdmin, async (req, res) => { await Hotel.update(req.body, { where: { hotel_id: req.params.id } }); res.json({ message: 'Updated' }); });
app.delete('/api/admin/hotels/:id', auth, isAdmin, async (req, res) => {
    const rooms = await Room.findAll({ where: { hotel_id: req.params.id } });
    const active = await Booking.count({ where: { room_id: { [Op.in]: rooms.map(r => r.room_id) }, status: { [Op.in]: ['Pending', 'Confirmed'] } } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้ มีคนจองอยู่' });
    await Hotel.destroy({ where: { hotel_id: req.params.id } }); res.json({ message: 'Deleted' });
});

// จัดการห้อง (เพิ่ม, แก้ไข, ลบ)
app.post('/api/admin/rooms', auth, isAdmin, async (req, res) => { await Room.create(req.body); res.json({ message: 'Added' }); });
app.put('/api/admin/rooms/:id', auth, isAdmin, async (req, res) => { await Room.update(req.body, { where: { room_id: req.params.id } }); res.json({ message: 'Updated' }); });
app.delete('/api/admin/rooms/:id', auth, isAdmin, async (req, res) => {
    const active = await Booking.count({ where: { room_id: req.params.id, status: { [Op.in]: ['Pending', 'Confirmed'] } } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้ มีคนจองอยู่' });
    await Room.destroy({ where: { room_id: req.params.id } }); res.json({ message: 'Deleted' });
});

// Sync Database
sequelize.sync({ force: true }).then(async () => {
    const adminPass = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'Admin System', email: 'admin@hotel.com', password_hash: adminPass, role: 'พนักงาน' });
    const h1 = await Hotel.create({ hotel_name: 'Bangkok City Hotel', location: 'Bangkok', rating: 4.8, description: 'ใจกลางเมือง', image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' });
    await Room.create({ hotel_id: h1.hotel_id, room_name: '101', room_type: 'Standard', price_per_night: 1200, max_occupancy: 2 });
    await Room.create({ hotel_id: h1.hotel_id, room_name: '102', room_type: 'Deluxe', price_per_night: 2000, max_occupancy: 2 });
    app.listen(3000, () => console.log('✅ Backend API -> http://localhost:3000'));
});