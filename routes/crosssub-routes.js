const router = require('express').Router(),
{google} = require('googleapis'),
_ = require('underscore');
OAuth2 = google.auth.OAuth2;
config = require('../config/config');
Channel = require('../models/channel-model');
RV = require('../models/recentvideos-model');
PR = require('../functions/yt-promises');
SUBSCRIPTION = require('../models/subscription-model');
YA = require('../functions/youtube-api');
POINT = require('../models/point-model');
CPR = require('../functions/cross-promises');

YA = require('../functions/youtube-api');

function authCheck(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.redirect('/');
  }
}


router.get('/setting',authCheck,async function(req,res){
  const user =req.user;
  if(!user.recentVideos.length){

    return res.render('crosssub/unablecross',{user:user});
  }
  return res.render('crosssub/setting',{user:user});
});
router.post('/setting',authCheck,function(req,res){
  var user = req.user;

  try{
    state = req.body.state?true:false;
    minduration = req.body.minDuration;
    Channel.findOneAndUpdate({channelId:user.channelId},{
      isActiveCrossSub:state,
      minDurationView:minduration
    },function(err,result){
      if(err){
        console.log('set cross sub config err: '+err);
      }
    });
    return res.render('crosssub/setting',{user:user});
  }catch(ex){
    console.log('err when submit cross sub: '+ex);
  }
});

router.get('/crossing',authCheck,async function(req,res){
  let user = req.user;
  var page = req.query.page||1;
  let cr = await SUBSCRIPTION.find({
    $or:[
      {_1stChannelId:user.channelId,_1stSub:true,_2ndSub:true,_1stCanSub:false,_2ndCanSub:false},
      {_2ndChannelId:user.channelId,_2ndSub:true,_1stSub:true,_1stCanSub:false,_2ndCanSub:false}
    ]
  });
  let data = [];
  if(cr.length){
    data = cr.map(c=>{
      var t = {};
      t['channelId']  = c._1stChannelId===user.channelId?c._2ndChannelId:c._1stChannelId;
      t['title']      = c._1stChannelId===user.channelId?c._2ndTitle:c._1stTitle;
      t['thumbnail']  = c._1stChannelId===user.channelId?c._2ndThumbnail:c._1stThumbnail
      return t;
    });
  }

  const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;

  return res.render('crosssub/crossing',{
    user:user,
    total:data.length,
    data:data.slice((page-1)*10,(page*10)),
    pages:pages
  });
})

router.get('/wait',authCheck,async function(req,res){
  let user = req.user;
  CPR.getAvailable(user.channelId)
  .then( data =>{
    return res.render('crosssub/wait',
    {
      user:user,
      data:data
    });
  })
  .catch(err=>console.log(err));
});

router.post('/wait',authCheck,async (req,res)=>{
  var user = req.user;

  var channelId = req.body.channelId;
  var waittime = req.body.await;

  // insert(_1stChannelId,_2stChannelId,_1stTitle,_2ndTitle,_1stThumbnail,_2ndThumbnail,_point,_waittime){

  YA.subscription_insert(channelId,user.access_token,user.refresh_token)
  .then(async sub=>{
    console.log('subscribe successfully');
    var channelId = sub.data.snippet.resourceId.channelId;
    var title = sub.data.snippet.title;
    var thumbnail = sub.data.snippet.thumbnails.default.url;
    SUBSCRIPTION.create({
      _1stChannelId:user.channelId,
      _2ndChannelId:channelId,
      _1stTitle:user.title,
      _2ndTitle:title,
      _1stThumbnail:user.thumbnail,
      _2ndThumbnail:thumbnail,
      _1stSub:true,
      _1stCross:true,
      _point:20,
      _waittime:waittime
    },(err,result)=>{
      if(err) return log('insert cross sub failed: '+err);
      CPR.getAvailable(user.channelId)
      .then( data =>{
        return res.render('crosssub/wait',
        {
          user:user,
          data:data
        });
      }).catch(err=>console.log(err));
    })
  })
  .catch(err => console.log(err));
});




module.exports = router;
