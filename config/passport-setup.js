const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const callbackURL = require('./config').callbackURL;
const Channel = require('../models/channel-model');

passport.serializeUser(function(channel, done) {
  try {
    done(null, channel.googleId);
  } catch (e) {
    done('serialize user failed: '+e);
  }
});

passport.deserializeUser(function(googleId, done) {
  try {
    Channel.findOne({googleId:googleId},(err, channel) => {
      done(err, channel);
    });
  } catch (e) {
    done('desialize user failed: '+e);
  }
});

passport.use(new GoogleStrategy({
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  callbackURL: config.callbackURL
},
function(access_token, refresh_token, profile, done) {
  process.nextTick(function() {
    try {
      Channel.findOne({ googleId: profile.id }, function(err, res) {
        if (err)  return done(err);
        if (res) {
          //if channel found - exists
          try {
            Channel.findOneAndUpdate({
              googleId:res.googleId
            },{
              lastLogin:new Date().setHours( new Date().getHours() + 7),
              loginTimes:++res.loginTimes,
              access_token:access_token,
              refresh_token:refresh_token
            },(err,channel)=>{
              if(err) return done('find and update profile failed: '+err);
              console.log('welcome back: '+channel.title);
              return done(null, channel);
            });
          } catch (e) {
            return done('find and update profile failed in catch: '+e);
          }

        } else {
          try {
            Channel.create({
              googleId: profile.id,
              access_token: access_token,
              refresh_token: refresh_token,
              title: profile.displayName,
              thumbnail:profile._json.picture
            },(err,channel)=>{
              if (err)   return done('err in channel create: '+err);
              console.log("welcome to: "+channel.title);
              return done(null, channel);
            });
          } catch (e) {
            return done('err in channel create catch: '+e);
          }
        };
      });
    } catch (e) {
      return done('next ticket failed: '+e);
    }
  });
}
));
