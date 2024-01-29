As a user, I want to browse the menu, because I want to order food

As a user I want to save food items to a cart, because I want to order them

As a user I want to be able to edit quantities in my cart

As a user I want to be able to place my order, and receive a SMS notification about it

As an owner I want to organize the menu according to food type because I want users to be able to browse easily

As an owner I want to notify the users of the estiamated wait time


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

get '/orders/:userID'

post '/
