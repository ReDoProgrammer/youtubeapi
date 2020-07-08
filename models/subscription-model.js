const mongoose=require('mongoose');
const Schema = mongoose.Schema;

const SubscriptonSchema = new Schema({
  _1stChannelId:String,
  _2ndChannelId:String,
  _1stSub:{type:Boolean,default:false},
  _2ndSub:{type:Boolean,default:false},
  _1stCanSub:{type:Boolean,default:false},
  _2ndCanSub:{type:Boolean,default:false},
  _1stTitle:String,
  _2ndTitle:String,
  _1stThumbnail:String,
  _2ndThumbnail:String,
  _1stCross:{type:Boolean,default:false},//flag to set cross sub state. if it has value true, it means other channel was subcribed by corssing function
  _2ndCross:{type:Boolean,default:false},//flag to set cross sub state. if it is true, it means other sub _1st channel by the way crossing
  _point:{type:Number,default:0},
  _waittime:{type:Number,default:0}
});

module.exports = mongoose.model('subscription',SubscriptonSchema);
