const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const callbackURL = require('./config').callbackURL;
const Channel = require('../models/channel-model');

passport.serializeUser(function(channel, done) {
  done(null, channel._id);
});

passport.deserializeUser(function(_id, done) {
  Channel.findById(_id, function(err, channel) {
    done(err, channel);
  });
});

passport.use(new GoogleStrategy({
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  callbackURL: config.callbackURL
},
function(accessToken, refreshToken, profile, done) {
  process.nextTick(function() {
    Channel.findOne({ _id: profile.id }, function(err, res) {
      if (err)
      return done(err);
      if (res) {
        Channel.updateOne({_id:res._id}, {
          lastLogin:new Date().setHours( new Date().getHours() + 7),
          loginTimes:++res.loginTimes
        }, function(err, res) {
          if (err)
          console.log('update last login time failed with err: '+err);
        });
        console.log('welcome back: '+res.title);
        return done(null, res);
      } else {
        var channel = new Channel({
          _id: profile.id,
          access_token: accessToken,
          refresh_token: refreshToken,
          title: profile.displayName,
          thumbnail:profile._json.picture
        });
        channel.save(function(err) {
          if (err)
          return done(err);
          console.log("welcome to: "+channel.title);
          return done(null, channel);
        });
      };
    });
  });
}
));
