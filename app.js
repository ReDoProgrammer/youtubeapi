const express = require('express'),
app = express(),
passport = require('passport'),
GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
mongoose = require('mongoose'),
{google} = require('googleapis'),
OAuth2 = google.auth.OAuth2;
expressLayout = require('express-ejs-layouts');
config = require('./config/config');
passportSetup = require('./config/passport-setup');
authRoutes = require('./routes/auth-routes');
profileRoutes = require('./routes/profile-routes');
cookieSession = require('cookie-session');
bodyParser = require('body-parser');
subscriptionRoutes = require('./routes/subscription-routes');
crosssubRoutes = require('./routes/crosssub-routes');
coinsRoutes = require('./routes/coins-routes');




mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(config.dbURL,()=>{
  console.log('connect database successfully');
});

app.set('view engine','ejs');
app.set('views',"./views");
app.use(express.static("./public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//config layout
app.use(expressLayout);
app.set('layout', 'layouts/layout');

app.use(cookieSession({
  maxAge:24*60*60*1000,
  keys:[config.session.cookieKey]
}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/',function(req,res){
  if (req.isAuthenticated())
  return res.redirect('/profile');
  else{
    return res.render('login',{ layout: 'login' });
  }
});

app.use('/auth',authRoutes);
app.use('/profile',profileRoutes);
app.use('/subscription',subscriptionRoutes);
app.use('/crosssub',crosssubRoutes);
app.use('/coins',coinsRoutes);



app.listen(5000);
