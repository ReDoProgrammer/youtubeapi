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
  return res.render('crosssub/setting',{user:user});
});


router.post('/setting',authCheck,function(req,res){
  var user = req.user;
  try{
    // console.log(req.body);
    YA.playlistitems(user.relatedUploadList,user.access_token,user.refresh_token)
    .then(result => {
      //if channel has no video
      if(result.data.pageInfo.totalResults == 0){
        return res.render('crosssub/unablecross',{user:user});
      }

      //update videosid to own channel
      videoId = result.data.items[0].snippet.resourceId.videoId;
      state = req.body.state?true:false;
      minDurationView = req.body.minDurationView;

      Channel.findOneAndUpdate({channelId:user.channelId},
        {
          videoId:videoId,
          isActiveCrossSub:state,
          minDurationView:minDurationView
        },(err,result)=>{
          if(err) return console.log('update own channel video id: '+err);
          var msg = {
            heading: 'Success',
            text:'Cài đặt sub chéo thành công!',
            icon:'success',
            url:'/crosssub/setting',
            delay:1000
          }
          return res.render('crosssub/setting',{user:user,msg:msg});
        });
      })
      .catch(err => console.log(err));
    }catch(ex){
      console.log('err when submit cross sub: '+ex);
    }
  });

  router.get('/subscribe',authCheck,async function(req,res){
    var user = req.user;
    var page = req.query.page||1;
    //get all channel that own channel subscribe in cross module
    //and they do not subscribe back yet
    var subs = SUBSCRIPTION.find({
      $or:[
        {_1stChannelId:user.channelId,_1stSub:true,_1stCross:true,_2ndSub:false,_2ndCanSub:false},
        {_2ndChannelId:user.channelId,_2ndChannelId:true,_2ndCross:true,_1stSub:false,_1stCanSub:false}
      ]
    });
    var data = [];
    if(subs.length){
      data = subs.map(s=>{
        var t =[];
        t['channelId']  = s._1stChannelId == user.channelId?s._2ndChannelId:s._1stChannelId;
        t['title']      = s._1stChannelId == user.channelId?s._2ndTitle:s._1stTitle;
        t['thumbnail']  = s._1stChannelId == user.channelId?s._2ndThumbnail:s._1stThumbnail
        return t;
      });
    }
    const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
    return res.render('crosssub/subscribe',
    {
      user:user,
      data:data.slice((page-1)*10,(page*10)),
      total:data.length,
      pages:pages
    });
  });


  router.get('/crossing',authCheck,async function(req,res){
    let user = req.user;
    if(!user.isActiveCrossSub){
      return res.redirect('/crosssub/setting');
    }
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

  router.get('/ready',authCheck,async function(req,res){
    let user = req.user;
    if(!user.isActiveCrossSub){
      return res.redirect('/crosssub/setting');
    }
    CPR.getReady(user.channelId)
    .then( data =>{
      return res.render('crosssub/ready',
      {
        user:user,
        data:data
      });
    })
    .catch(err=>console.log(err));
  });

  router.post('/ready',authCheck,async (req,res)=>{
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
        CPR.getReady(user.channelId)
        .then( data =>{
          return res.render('crosssub/ready',
          {
            user:user,
            data:data
          });
        }).catch(err=>console.log(err));
      })
    })
    .catch(err => console.log(err));
  });


  router.get('/waiting',authCheck,async (req,res)=>{
    var user = req.user;
    var page = req.query.page||1;
    var data = [];
    var w = await SUBSCRIPTION.find({
      $or:[
        {_1stChannelId:user.channelId,_1stSub:false,_1stCanSub:false,_2ndSub:true,_2ndCross:true},
        {_2ndChannelId:user.channelId,_2ndSub:false,_2ndCanSub:false,_1stSub:true,_1stCross:true}
      ]
    });
    if(w.length){
      data = w.map(s=>{
        var t = {};
        t['channelId']    = s._1stChannelId==user.channelId?s._2ndChannelId:s._1stChannelId;
        t['title']        = s._1stChannelId==user.channelId?s._2ndTitle:s._1stTitle;
        t['thumbnail']    = s._1stChannelId==user.channelId?s._2ndThumbnail:s._1stThumbnail
        return t;
      });
    }
    const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
    return res.render('crosssub/waiting',{
      user:user,
      total:data.length,
      data:data.slice((page-1)*10,(page*10)),
      pages:pages
    });
  });

  router.get('/canceled',authCheck,async (req,res)=>{
    //get all channels that own channel unsubscribe in crossing modul
    var user = req.user;
    if(!user.isActiveCrossSub){
      return res.redirect('/crosssub/setting');
    }
    var data =[];
    var us = await SUBSCRIPTION.find({
      $or:[
        {_1stChannelId:user.channelId,_1stSub:false,_1stCanSub:true,_1stCross:true,_2ndSub:true,_2ndCanSub:false,_2ndCross:true},
        {_2ndChannelId:user.channelId,_2ndSub:false,_2ndCanSub:true,_2ndCross:true,_1stSub:true,_1stCanSub:false,_1stCross:true}
      ]
    });
    if(us.length){
      data = us.map(s=>{
        var t = {};
        t['channelId']    = s._1stChannelId==user.channelId?s._2ndChannelId:s._1stChannelId;
        t['title']        = s._1stChannelId==user.channelId?s._2ndTitle:s._1stTitle;
        t['thumbnail']    = s._1stChannelId==user.channelId?s._2ndThumbnail:s._1stThumbnail;
        return t;
      });
    }
    var page = req.query.page||1;
    const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
    return res.render('crosssub/canceled',{
      user:user,
      total:data.length,
      data:data.slice((page-1)*10,(page*10)),
      pages:pages
    });
  });

  router.get('/be-canceled',authCheck,async (req,res)=>{
    //get all channels that own channel unsubscribe in crossing modul
    var user = req.user;
    if(!user.isActiveCrossSub){
      return res.redirect('/crosssub/setting');
    }
    var data =[];
    var us = await SUBSCRIPTION.find({
      $or:[
        {_1stChannelId:user.channelId,_1stSub:true,_1stCanSub:false,_1stCross:true,_2ndSub:false,_2ndCanSub:true,_2ndCross:true},
        {_2ndChannelId:user.channelId,_2ndSub:true,_2ndCanSub:false,_2ndCross:true,_1stSub:false,_1stCanSub:true,_1stCross:true}
      ]
    });
    if(us.length){
      data = us.map(s=>{
        var t = {};
        t['channelId']    = s._1stChannelId==user.channelId?s._2ndChannelId:s._1stChannelId;
        t['title']        = s._1stChannelId==user.channelId?s._2ndTitle:s._1stTitle;
        t['thumbnail']    = s._1stChannelId==user.channelId?s._2ndThumbnail:s._1stThumbnail;
        return t;
      });
    }
    var page = req.query.page||1;
    const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
    return res.render('crosssub/be-canceled',{
      user:user,
      total:data.length,
      data:data.slice((page-1)*10,(page*10)),
      pages:pages
    });
  });




  module.exports = router;
