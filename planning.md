As a user, I want to browse the menu, because I want to order food

As a user I want to save food items to a cart, because I want to order them

As a user I want to be able to edit quantities in my cart

As a user I want to be able to place my order, and receive a SMS notification about it

As an owner I want to organize the menu according to food type because I want users to be able to browse easily

As an owner I want to notify the users of the estiamated wait time



** Routes:

get '/' view main page of website / menu

<!-- // do this instead
app.get('/login/:id', (req, res) => {
  // using encrypted cookies
  req.session.user_id = req.params.id;

  // or using plain-text cookies
  res.cookie('user_id', req.params.id);

  // send the user somewhere
  res.redirect('/');
}); -->

get '/orders/:userID' view all orders for a user

When user adds item to cart it is stored in their cookies:
    req.session.order = {}

get '/orders/:orderID' view cart as is (pull from cookies if they exist, otherwise display error for user)

post '/orders/:orderID' create sql statement to add order to orders table, make api request to send notification to restaurant

post '/orders/:orderID/timeToComplete'
create sql statement for owner to add/ update time_to_complete to orders table.
send sms to client to notify their order is being prepared
send sms to client to notify their order is ready
