const express = require('express');
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => res.render('index'));
app.get('/hotel', (req, res) => res.render('hotel')); // หน้าโชว์รายละเอียด รร.
app.get('/booking', (req, res) => res.render('booking'));
app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/my-bookings', (req, res) => res.render('my-bookings'));
app.get('/admin', (req, res) => res.render('admin'));

app.listen(4000, () => console.log('🌐 Frontend Server -> http://localhost:4000'));