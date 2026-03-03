const { Op } = require('sequelize');
const { sequelize, Booking, User, Room, Hotel } = require('../models');

exports.getAllBookings = async (req, res) => {
    const bookings = await Booking.findAll({ include: [User, { model: Room, include: [Hotel] }], order: [['booking_date', 'DESC']] });
    res.json(bookings);
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const booking = await Booking.findOne({ where: { booking_id: req.params.id } });
        if (!booking) return res.status(404).json({ error: 'ไม่พบข้อมูลการจอง' });

        if (booking.status === 'Cancelled') {
            return res.status(400).json({ error: 'ไม่สามารถเปลี่ยนสถานะของการจองที่ถูกยกเลิกไปแล้วได้' });
        }

        await Booking.update({ status: req.body.status }, { where: { booking_id: req.params.id } });
        res.json({ message: 'Updated' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

exports.getAllData = async (req, res) => {
    const hotels = await Hotel.findAll({ include: [Room] });
    res.json(hotels);
};

exports.createHotel = async (req, res) => { await Hotel.create(req.body); res.json({ message: 'Added' }); };
exports.updateHotel = async (req, res) => { await Hotel.update(req.body, { where: { hotel_id: req.params.id } }); res.json({ message: 'Updated' }); };
exports.deleteHotel = async (req, res) => {
    const rooms = await Room.findAll({ where: { hotel_id: req.params.id } });
    const active = await Booking.count({ where: { room_id: { [Op.in]: rooms.map(r => r.room_id) }, status: { [Op.in]: ['Pending', 'Confirmed'] } } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้ มีคนจองอยู่' });
    await Hotel.destroy({ where: { hotel_id: req.params.id } }); 
    res.json({ message: 'Deleted' });
};

exports.createRoom = async (req, res) => { await Room.create(req.body); res.json({ message: 'Added' }); };
exports.updateRoom = async (req, res) => { await Room.update(req.body, { where: { room_id: req.params.id } }); res.json({ message: 'Updated' }); };
exports.deleteRoom = async (req, res) => {
    const active = await Booking.count({ where: { room_id: req.params.id, status: { [Op.in]: ['Pending', 'Confirmed'] } } });
    if (active > 0) return res.status(400).json({ error: 'ลบไม่ได้ มีคนจองอยู่' });
    await Room.destroy({ where: { room_id: req.params.id } }); 
    res.json({ message: 'Deleted' });
};

exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await Booking.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']
            ],
            include: [{
                model: Room,
                attributes: ['hotel_id'],
                include: [{ model: Hotel, attributes: ['hotel_name'] }]
            }],
            group: ['Room.hotel_id', 'status', 'Room.Hotel.hotel_id']
        });
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};