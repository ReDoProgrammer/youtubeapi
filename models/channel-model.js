const mongoose=require('mongoose');
const Schema = mongoose.Schema;


const channelSchema = new Schema({
	profileId:{type: String, default:''},
	channelId:{type: String,default:''},
	title: String,
	thumbnail:String,
	access_token:String,
	refresh_token:String,
	firstLogin:{ type : Date, default: new Date().setHours( new Date().getHours() + 7)},
	loginTimes:{type:Number,default:1},
	lastLogin:{ type : Date, default: Date.now },
	trialCrossSub:{type:Boolean,default:true},
	trialBeSub:{type:Boolean,default:true},
	reputationPoint: {type:Number,default:100},
	viewCount:{type:Number,default:0},
	commentCounts:{type:Number,default:0},
	subscriberCount:{type:Number,default:0},
	hiddenSubscriberCount:{type:Boolean,default:false},
	videoCount:{type:Number,default:0},
	relatedUploadList:{type:String,default:''},
	isActiveCrossSub:{type:Boolean,default:false},//cross sub state.
	minDurationView:{type:Number,default:0},//minimize duration must view before show subcribe button,
	videoId:{type: String, default:''}
});


const Channel = mongoose.model('channel',channelSchema);

module.exports = Channel;
