const mongoose=require('mongoose');
const Schema = mongoose.Schema;

const recentVideos = new Schema({
  videoId:String,
  publishedAt:Date,
  title:String,
  description:{type:String,default:''},
  thumbnail:{type:String,default:''},
  //statistic
  viewCount:{type:Number,default:0},
  likeCount:{type:Number,default:0},
  dislikeCount:{type:Number,default:0},
  favoriteCount:{type:Number,default:0},
  commentCount:{type:Number,default:0}
});

const RecentVideos = new mongoose.model('recentvideos',recentVideos);
module.exports = RecentVideos;
