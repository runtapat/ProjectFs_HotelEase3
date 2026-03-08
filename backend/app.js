require('dotenv').config(); // 🌟 เรียกใช้ค่าคอนฟิกจากไฟล์ .env
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // 🌟 นำเข้าเพื่อแก้ปัญหา ReferenceError
const { sequelize, User, Hotel, Room, Booking } = require('./models'); // 🌟 ตรวจสอบว่ามี Booking ใน models

// --- [นำเข้า Routes ต่างๆ] ---
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// --- [ผูก Routes เข้ากับ API Paths หลัก] ---
app.use('/api', authRoutes);               // สมัคร, ล็อกอิน
app.use('/api/hotels', hotelRoutes);       // ค้นหาโรงแรม
app.use('/api', bookingRoutes);            // จัดการการจองของลูกค้า
app.use('/api/admin', adminRoutes);        // จัดการหลังบ้าน (แอดมิน)

// --- [การเริ่มต้นฐานข้อมูลและเซิร์ฟเวอร์] ---
// หมายเหตุ: { force: true } จะล้างข้อมูลเก่าทั้งหมดและสร้างใหม่
sequelize.sync({ force: true }).then(async () => {
    
    // 1. สร้างบัญชี Admin เริ่มต้น
    const adminPass = await bcrypt.hash('admin123', 10);
    await User.create({ 
        username: 'Admin System', email: 'admin@hotel.com', 
        password_hash: adminPass, role: 'พนักงาน' 
    });

    // 2. สร้างข้อมูลผู้ใช้งานใหม่ 2 คน (Nantapat & Puripat)
    const passRun = await bcrypt.hash('run', 10);
    const userRun = await User.create({ 
        username: 'nantapat', email: 'run@gmail.com', password_hash: passRun, 
        role: 'ลูกค้า', contact_number: '081-999-8888', address: 'Chonburi' 
    });

    const passFew = await bcrypt.hash('few', 10);
    const userFew = await User.create({ 
        username: 'puripat', email: 'few@gmail.com', password_hash: passFew, 
        role: 'ลูกค้า', contact_number: '085-777-6666', address: 'Chonburi' 
    });

    // 3. ชุดข้อมูลโรงแรม Dummy ทั้งหมด 10 แห่ง
    const hotels = [
        { name: 'Bangkok City Hotel', loc: 'Bangkok', rate: 9.5, addr: '123 ถนนสุขุมวิท กรุงเทพฯ', tel: '02-123-4567', desc: 'หรูหราใจกลางกรุง', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' },
        { name: 'Phuket Sea Breeze', loc: 'Phuket', rate: 9.8, addr: '45 หาดป่าตอง ภูเก็ต', tel: '076-999-888', desc: 'วิวทะเลหลักล้าน', img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600' },
        { name: 'Chiang Mai Retreat', loc: 'Chiang Mai', rate: 9.2, addr: '78 ถนนนิมมานฯ เชียงใหม่', tel: '053-111-222', desc: 'พักผ่อนท่ามกลางขุนเขา', img: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600' },
        { name: 'Hua Hin Sands', loc: 'Prachuap Khiri Khan', rate: 10.0, addr: '99 ถนนเพชรเกษม หัวหิน', tel: '032-555-444', desc: 'บ้านพักตากอากาศสุดส่วนตัว', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600' },
        { name: 'Khao Yai Nature', loc: 'Nakhon Ratchasima', rate: 9.0, addr: '10 หมู่ 1 ปากช่อง', tel: '044-777-666', desc: 'อากาศบริสุทธิ์ใกล้กรุง', img: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600' },
        { name: 'Krabi Emerald Bay', loc: 'Krabi', rate: 9.4, addr: '15 อ่าวนาง กระบี่', tel: '075-222-333', desc: 'สัมผัสทะเลอันดามัน', img: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600' },
        { name: 'Pattaya Ocean View', loc: 'Chonburi', rate: 8.9, addr: '55 ถนนเลียบหาด พัทยา', tel: '038-444-555', desc: 'สีสันแห่งเมืองพัทยา', img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600' },
        { name: 'Khao Lak Sunset', loc: 'Phang Nga', rate: 9.7, addr: '22 เขาหลัก พังงา', tel: '076-111-000', desc: 'ชมพระอาทิตย์ตกดินสุดโรแมนติก', img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600' },
        { name: 'Rayong Star Marina', loc: 'Rayong', rate: 8.5, addr: '101 ถนนสุขุมวิท ระยอง', tel: '033-666-777', desc: 'พักผ่อนริมชายหาดระยอง', img: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600' },
        { name: 'Ayutthaya Ancient Riverside', loc: 'Ayutthaya', rate: 9.1, addr: '5 ถนนอู่ทอง อยุธยา', tel: '035-888-999', desc: 'สัมผัสวิถีชีวิตริมน้ำเมืองเก่า', img: 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg' }
    ];

    const standardRooms = []; // เก็บห้อง Standard ไว้ใช้จอง

    for (const h of hotels) {
        const createdHotel = await Hotel.create({ 
            hotel_name: h.name, location: h.loc, address: h.addr, 
            contact_number: h.tel, rating: h.rate, description: h.desc, image_url: h.img 
        });

        // สร้างห้องพัก Standard
        const r1 = await Room.create({ hotel_id: createdHotel.hotel_id, room_name: '101', room_type: 'Standard', price_per_night: 1200, max_occupancy: 2 });
        standardRooms.push(r1);

        // สร้างห้องพัก Deluxe
        await Room.create({ hotel_id: createdHotel.hotel_id, room_name: '201', room_type: 'Deluxe', price_per_night: 2500, max_occupancy: 2 });
    }

    // 4. สร้างข้อมูลการจอง (Booking) คนละ 3 โรงแรม
    const dates = [
        { in: '2026-04-01', out: '2026-04-03' },
        { in: '2026-05-10', out: '2026-05-12' },
        { in: '2026-06-15', out: '2026-06-17' }
    ];

    // การจองสำหรับคุณ Nantapat (จองโรงแรม 1, 2, 3)
    for (let i = 0; i < 3; i++) {
        await Booking.create({
            user_id: userRun.user_id, room_id: standardRooms[i].room_id,
            check_in_date: dates[i].in, check_out_date: dates[i].out,
            total_amount: standardRooms[i].price_per_night * 2, status: 'Confirmed'
        });
    }

    // การจองสำหรับคุณ Puripat (จองโรงแรม 4, 5, 6)
    for (let i = 0; i < 3; i++) {
        await Booking.create({
            user_id: userFew.user_id, room_id: standardRooms[i+3].room_id,
            check_in_date: dates[i].in, check_out_date: dates[i].out,
            total_amount: standardRooms[i+3].price_per_night * 2, status: 'Confirmed'
        });
    }

    console.log('✅ เติม Dummy Data สำเร็จ (10 โรงแรม, 2 สมาชิก, 6 รายการจอง)');

    // เริ่มรัน Server
    const PORT = process.env.PORT || 3000; 
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
});