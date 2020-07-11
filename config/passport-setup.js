const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const callbackURL = require('./config').callbackURL;
const Channel = require('../models/channel-model');

passport.serializeUser(function(channel, done) {
  done(null, channel.profileId);
});

passport.deserializeUser(function(profileId, done) {
  Channel.findOne({profileId:profileId},(err, channel) => {
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
    Channel.findOne({ profileId: profile.id }, function(err, res) {
      if (err)  return done(err);
      if (res) {
        //if channel found - exists
        try {
          Channel.findOneAndUpdate({
            profileId:res.profileId
          },{
            lastLogin:new Date().setHours( new Date().getHours() + 7),
            loginTimes:++res.loginTimes
          },(err,channel)=>{
            if(err) return done('find and update profile failed: '+err);
            console.log('welcome back: '+channel.title);
            return done(null, channel);
          });
        } catch (e) {
          return done('find and update profile failed in catch: '+e);
        }

      } else {
        console.log('profile id: ',profile.id);
        try {
          Channel.create({
            profileId: profile.id,
            access_token: accessToken,
            refresh_token: refreshToken,
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
  });
}
));
