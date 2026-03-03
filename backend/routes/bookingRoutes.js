const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { auth } = require('../middleware/authMiddleware');

router.post('/book', auth, bookingController.bookRoom);
router.get('/my-bookings', auth, bookingController.getMyBookings);
router.put('/my-bookings/:id/cancel', auth, bookingController.cancelBooking);

module.exports = router;