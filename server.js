// load .env data into process.env
require('dotenv').config();

// Web server config
const sassMiddleware = require('./lib/sass-middleware');
const express = require('express');
const morgan = require('morgan');

const PORT = process.env.PORT || 8080;
const app = express();

app.set('view engine', 'ejs');

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(
  '/styles',
  sassMiddleware({
    source: __dirname + '/styles',
    destination: __dirname + '/public/styles',
    isSass: false, // false => scss, true => sass
  })
);
app.use(express.static('public'));

// Separated Routes for each Resource
// Note: Feel free to replace the example routes below with your own
const userApiRoutes = require('./routes/users-api');
const widgetApiRoutes = require('./routes/widgets-api');
const usersRoutes = require('./routes/users');
const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['testkey1'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Mount all resource routes
// Note: Feel free to replace the example routes below with your own
// Note: Endpoints that return data (eg. JSON) usually start with `/api`
app.use('/api/users', userApiRoutes);
app.use('/api/widgets', widgetApiRoutes);
app.use('/users', usersRoutes);
// Note: mount other resources here, using the same pattern above

// Home page
// Warning: avoid creating more routes in this file!
// Separate them into separate routes files (see above).

// when user adds to cart store the information in the cookie

// HOME PAGE
app.get('/', (req, res) => {
  res.render('index');
});

// ORDER HISTORY
app.get('/orders/:userID', (req, res) => {
  //  Check if the user is logged in
  //  Populate from SQL orders for userID
  res.render('orders');
});

// VIEW CART
app.get('/orders/:orderID', (req, res) => {
  // Check if the user is logged in
  // Populate currentOrder object from cookie data
  // 
  res.render('cart', currentOrder);
});

// USER LOGIN
app.get('/login/:id', (req, res) => {
  // using encrypted cookies
  req.session.user_id = req.params.id;

  // or using plain-text cookies
  res.cookie('user_id', req.params.id);

  // send the user somewhere
  res.redirect('/');
});

app.post('/order/:orderID', (req, res) => {
  // create sql statement to add order to orders table
  // make api request to send notification to restaurant
  res.redirect('orders/:userID');
});

app.post('/orders/:orderID/timeToComplete', (req, res) => {
  // create sql statement for owner to add/update time_to_complete to orders table.
  // send sms to client to notify their order is being prepared
  // start a timer that sends an sms to the client when completed
  res.redirect('orders/:userID');
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
