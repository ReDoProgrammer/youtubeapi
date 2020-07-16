const router = require('express').Router(),
SUBSCRIPTION = require('../models/subscription-model');


function authCheck(req, res, next) {
  if (req.isAuthenticated())
  return next();
  else{
    res.redirect('/');
  }
}
router.get('/besub/index',authCheck,async function(req,res){
  const user = req.user;
  var page = req.query.page||1;
  let bs =await SUBSCRIPTION.find({$or:[
    {_1stChannelId:user.channelId,_2ndSub:true},
    {_2ndChannelId:user.channelId,_1stSub:true}
  ]});
  let data =[];
  if(bs.length){
    data = await bs.map(s=>{
      var p = {};
      p['channelId']=s._1stChannelId===user.channelId?s._2ndChannelId:s._1stChannelId;
      p['title']=s._1stChannelId===user.channelId?s._2ndTitle:s._1stTitle;
      p['thumbnail']=s._1stChannelId===user.channelId?s._2ndThumbnail:s._1stThumbnail
      return p;
    });
  }
  const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
  return res.render('besub/index',
  {
    user:user,
    total:data.length,
    data:data.slice((page-1)*10,(page*10)),
    pages:pages
  });
});

router.get('/sub/index',authCheck,async function(req,res){
  const user = req.user;
  var page = req.query.page||1;
  let subs =await SUBSCRIPTION.find({
    $or:[
      {_1stChannelId:user.channelId,_1stSub:true,_1stCanSub:false},
      {_2ndChannelId:user.channelId,_2ndSub:true,_2ndCanSub:false}
    ]
  });
  let data =[];
  if(subs.length){
    data = subs.map(s=>{
      var i = {};
      i['channelId'] = s._1stChannelId === user.channelId?s._2ndChannelId:s._1stChannelId;
      i['title'] = s._1stChannelId === user.channelId?s._2ndTitle:s._1stTitle;
      i['thumbnail']=s._1stChannelId===user.channelId?s._2ndThumbnail:s._1stThumbnail;
      return i;
    });
  }
  const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;

  return res.render('sub/index',
  {
    user:user,
    data:data.slice((page-1)*10,(page*10)),
    total:data.length,
    pages:pages
  });
});

router.get('/recent',authCheck,function(req,res){
  const user = req.user;
  const part ={
    part:'subscriberSnippet',
    myRecentSubscribers:true,
    maxResults:10
  };
  YA.subscriptions_list(part,user.access_token,user.refresh_token).then(function(result){
    return res.render('besub/recent',{data:result.data.items,user:user});
  });
});

router.get('/sub/unsubscribe',authCheck,async function(req,res){
  const user = req.user;
  var page = req.query.page||1;
  var us =await SUBSCRIPTION.find({$or:[
    {_1stChannelId:user.channelId,_1stSub:false,_1stCanSub:true},
    {_2ndChannelId:user.channelId,_2ndSub:false,_2ndCanSub:true}
  ]});

  var data =[];
  if(us.length){
    data = await us.map(u =>{
      var t = {};
      t['channelId']  = u._1stChannelId === user.channelId?u._2ndChannelId:u._1stChannelId;
      t['title']      = u._1stChannelId === user.channelId?u._2ndTitle:u._1stTitle;
      t['thumbnail']  = u._1stChannelId === user.channelId?u._2ndThumbnail:u._1stThumbnail;
      return t;
    });
  }
  const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
  return res.render('sub/unsubscribe',
  {
    data:data.slice((page-1)*10,(page*10)),
    user:user,
    pages:pages,
    total:data.length
  });
});

router.get('/besub/unsubscribe',authCheck,async function(req,res){
  const user = req.user;
  var page = req.query.page||1;
  var us =await SUBSCRIPTION.find({$or:[
    {_1stChannelId:user.channelId,_2ndSub:false,_2ndCanSub:true},
    {_2ndChannelId:user.channelId,_1stSub:false,_1stCanSub:true}
  ]});
  var data =[];
  if(us.length){
    data = await us.map(u =>{
      var t = {};
      t['channelId']  = u._1stChannelId === user.channelId?u._2ndChannelId:u._1stChannelId;
      t['title']      = u._1stChannelId === user.channelId?u._2ndTitle:u._1stTitle;
      t['thumbnail']  = u._1stChannelId === user.channelId?u._2ndThumbnail:u._1stThumbnail;
      return t;
    });
  }
  const pages = data.length%10===0?data.length/10:Math.floor(data.length/10)+1;
  return res.render('besub/canceled',
  {
    data:data.slice((page-1)*10,(page*10)),
    user:user,
    pages:pages,
    total:data.length
  });
});



module.exports = router;
