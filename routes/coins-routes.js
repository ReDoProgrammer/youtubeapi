const router = require('express').Router(),
{google} = require('googleapis'),
OAuth2 = google.auth.OAuth2;
config = require('../config/config');


router.get('/view',function(req,res){
  res.render('coins/view.ejs');
});
router.get('/like',function(req,res){
  res.render('coins/like.ejs');
});

router.get('/subcribe',function(req,res){
  res.render('coins/subscribe.ejs');
});
router.get('/ads',function(req,res){
  res.render('coins/ads.ejs');
});


router.get('/cash',function(req,res){
  res.render('coins/cash.ejs');
});



module.exports = router;
