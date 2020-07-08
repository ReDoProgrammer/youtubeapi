const mongoose=require('mongoose');
const Schema = mongoose.Schema;

const pointSchema = new Schema({
  channelId:String,
  partnerId:String,
  videoId:{type:String,default:''},
  type:String,
  point:{type:Number,default:0},
  remark:{type:String,default:''},
  pointDate:{type:Date,default: new Date().setHours( new Date().getHours() + 7)}
});

const Point = mongoose.model('points',pointSchema);
module.exports = Point;
