const router = require('express').Router(),
{google} = require('googleapis'),
OAuth2 = google.auth.OAuth2;
config = require('../config/config');
Channel = require('../models/channel-model');
PR = require('../functions/yt-promises');

YT = require('../functions/youtube-api');
function authCheck(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.redirect('/');
  }
}

// IDEA: channel initial not content channelId
//step1: using api to insert channelid into database as it's not been update before. just execute only time
//setp2:using api to fetch statistics then update to channel profile


router.get('/', authCheck, async function(req, res) {
  const user = req.user;
  PR.updateProfile(user._id,user.access_token,user.refresh_token)
  .then(ch=>Promise.all(
    [
      //get 4 lated videos and statistic them
      PR.getLatedVideos(ch.recentVideos,ch.relatedUploadList,user.access_token,user.refresh_token)
      .then(videos=>PR.setVideosSats(videos,ch.access_token,ch.refresh_token))//statistic video infor as:like,dislike,view,...
      .then(videos=>PR.setOwner(videos,ch.channelId)),//set owner for the lated videos
      //get all channels that own channel subscribe to
      PR.getSub(ch.channelId,ch.access_token,ch.refresh_token)//return list of the channels that owner subcirbes to
      .then(subs=>PR.setsubscription(ch,subs,false))//insert the list above into database
       .then(subs=>PR.checkUnsubscribe(ch,subs,false)),

      ////get all channels which subscribe to own channel
      PR.getBeSub(ch.channelId,ch.access_token,ch.refresh_token)//return list of channels that subscribe to own channel
      .then(beSubs=>PR.setsubscription(ch,beSubs,true))//insert above list into data
      .then(beSubs=> PR.checkUnsubscribe(ch,beSubs,true))
    ]
  ))

  .then(async (result)=>{
    // console.log(result[1]) // { name: 'cherries', quantity: 5 }
    var data = await Channel.findOne({channelId:result[0].channelId}).populate('recentVideos');
    return res.render('profile/index',{user:data,videos:data.recentVideos});
  })
  .catch(err=>{
    console.log(err+'');
    return res.redirect('/auth/google/logout');
  });

});

module.exports = router;
