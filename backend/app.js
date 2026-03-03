const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sequelize, User, Hotel, Room } = require('./models');

// นำเข้า Routes ต่างๆ
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// ผูก Routes เข้ากับ API Paths หลัก
app.use('/api', authRoutes);               // สมัคร, ล็อกอิน
app.use('/api/hotels', hotelRoutes);       // ค้นหาโรงแรม
app.use('/api', bookingRoutes);            // จัดการการจองของลูกค้า
app.use('/api/admin', adminRoutes);        // จัดการหลังบ้าน (แอดมิน)

// ==========================================
// การเริ่มต้นฐานข้อมูลและเซิร์ฟเวอร์
// ==========================================
sequelize.sync({ force: true }).then(async () => {
    const adminPass = await bcrypt.hash('admin123', 10);
    // สร้างบัญชี Admin เริ่มต้น
    await User.create({ username: 'Admin System', email: 'admin@hotel.com', password_hash: adminPass, role: 'พนักงาน' });
    
    // ชุดข้อมูลโรงแรม Dummy
    const hotels = [
        { name: 'Bangkok City Hotel', loc: 'Bangkok', rate: 9.5, desc: 'หรูหราใจกลางกรุง', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' },
        { name: 'Phuket Sea Breeze', loc: 'Phuket', rate: 9.8, desc: 'วิวทะเลหลักล้าน', img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600' },
        { name: 'Chiang Mai Retreat', loc: 'Chiang Mai', rate: 9.2, desc: 'พักผ่อนท่ามกลางขุนเขา', img: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600' },
        { name: 'Hua Hin Sands', loc: 'Prachuap Khiri Khan', rate: 10.0, desc: 'บ้านพักตากอากาศสุดส่วนตัว', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600' },
        { name: 'Khao Yai Nature', loc: 'Nakhon Ratchasima', rate: 9.0, desc: 'อากาศบริสุทธิ์ใกล้กรุง', img: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600' }
    ];

    for (const h of hotels) {
        const createdHotel = await Hotel.create({ 
            hotel_name: h.name, 
            location: h.loc, 
            rating: h.rate, 
            description: h.desc, 
            image_url: h.img 
        });
        // เพิ่มห้องพักเริ่มต้นให้โรงแรมละ 2 ประเภท
        await Room.create({ hotel_id: createdHotel.hotel_id, room_name: '101', room_type: 'Standard', price_per_night: 1200, max_occupancy: 2 });
        await Room.create({ hotel_id: createdHotel.hotel_id, room_name: '201', room_type: 'Deluxe', price_per_night: 2500, max_occupancy: 2 });
    }

    app.listen(3000, () => console.log('✅ Backend API (MVC Structure) -> http://localhost:3000'));
});