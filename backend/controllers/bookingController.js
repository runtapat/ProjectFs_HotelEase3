const { Booking, Room, Hotel } = require('../models');

exports.bookRoom = async (req, res) => {
    const { room_id, check_in_date, check_out_date, total_amount } = req.body;
    await Booking.create({ user_id: req.user.user_id, room_id, check_in_date, check_out_date, total_amount });
    res.json({ message: 'Booked' });
};

exports.getMyBookings = async (req, res) => {
    const bookings = await Booking.findAll({ where: { user_id: req.user.user_id }, include: [{ model: Room, include: [Hotel] }] });
    res.json(bookings);
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findOne({ 
            where: { booking_id: req.params.id, user_id: req.user.user_id } 
        });

        if (!booking) return res.status(404).json({ error: 'ไม่พบข้อมูลการจองนี้' });
        if (booking.status !== 'Pending') {
            return res.status(400).json({ error: 'สามารถยกเลิกได้เฉพาะรายการที่รอดำเนินการเท่านั้น' });
        }

        await Booking.update({ status: 'Cancelled' }, { where: { booking_id: req.params.id } });
        res.json({ message: 'ยกเลิกการจองสำเร็จ' });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};