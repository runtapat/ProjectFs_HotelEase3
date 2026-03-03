const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/authMiddleware');

// ใช้ middleware ป้องกันทุกเส้นทางในไฟล์นี้
router.use(auth, isAdmin);

router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id', adminController.updateBookingStatus);
router.get('/all-data', adminController.getAllData);
router.post('/hotels', adminController.createHotel);
router.put('/hotels/:id', adminController.updateHotel);
router.delete('/hotels/:id', adminController.deleteHotel);
router.post('/rooms', adminController.createRoom);
router.put('/rooms/:id', adminController.updateRoom);
router.delete('/rooms/:id', adminController.deleteRoom);
router.get('/dashboard-stats', adminController.getDashboardStats);

module.exports = router;