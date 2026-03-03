const { Op } = require('sequelize');
const { Hotel, Room, Booking } = require('../models');

// ฟังก์ชันช่วยเหลือ (Helper) เช็คห้องที่ว่างเฉพาะ ในช่วงเวลา กับ เว้น Pending Confirmed
const getOverlappingRooms = async (check_in, check_out) => {
    const overlaps = await Booking.findAll({
        where: { 
            status: { [Op.in]: ['Pending', 'Confirmed'] }, 
            check_in_date: { [Op.lt]: check_out }, 
            check_out_date: { [Op.gt]: check_in } 
        }
    });
    return overlaps.map(b => b.room_id);
};

exports.getAllHotels = async (req, res) => {
    const { location, room_type, max_price, check_in, check_out } = req.query;
    let hotelFilter = {}; 
    let roomFilter = { availability: true };

    if (location) hotelFilter.location = { [Op.like]: `%${location}%` };
    if (room_type) roomFilter.room_type = { [Op.like]: `%${room_type}%` }; 
    if (max_price) roomFilter.price_per_night = { [Op.lte]: parseInt(max_price) };

    if (check_in && check_out) {
        const bookedIds = await getOverlappingRooms(check_in, check_out);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds }; 
    }
    const hotels = await Hotel.findAll({ where: hotelFilter, include: [{ model: Room, where: roomFilter, required: true }] });
    res.json(hotels);
};

exports.getHotelById = async (req, res) => {
    const { check_in, check_out } = req.query;
    let roomFilter = { availability: true };
    
    if (check_in && check_out) {
        const bookedIds = await getOverlappingRooms(check_in, check_out);
        if (bookedIds.length > 0) roomFilter.room_id = { [Op.notIn]: bookedIds };
    }
    const hotel = await Hotel.findByPk(req.params.id, { include: [{ model: Room, where: roomFilter, required: false }] });
    res.json(hotel);
};