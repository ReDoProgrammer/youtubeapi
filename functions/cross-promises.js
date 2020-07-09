const SUBSCRIPTION = require('../models/subscription-model');
Channel = require('../models/channel-model');
module.exports = class Cross{
  static getAvailable(channelId){
    return new Promise(async (resolve,reject)=>{
      try {
        let subs = await SUBSCRIPTION.find({
          $or:[
            {_1stChannelId:channelId,_1stSub:true},//if own channel at the first column and subscribe to other
            {_2ndChannelId:channelId,_2ndSub:true},//if own channel at the second column and subscribe to other
            {_1stChannelId:channelId,_2ndSub:true},//own channel at the first column and be subscribed
            {_2ndChannelId:channelId,_1stSub:true},//own channel at the second column and be subscribed
            {_1stChannelId:channelId,_1stCanSub:true},//own channel at the first column but unsubscribed
            {_2ndChannelId:channelId,_2ndCanSub:true},//own channel at the second column but unsubscribed
            {_1stChannelId:channelId,_2ndCanSub:true},//own channel at the first column but be unsubscribed
            {_2ndChannelId:channelId,_1stCanSub:true}//own channel at the second column but be unsubscribed
          ]
        });

        let maps = await subs.map(ch =>{
          var o = {};
          o['channelId'] = ch._1stChannelId == channelId?ch._2ndChannelId:ch._1stChannelId;
          o['title']      = ch._1stChannelId == channelId?ch._2ndTitle:ch._1stTitle;
          o['thumbnail']  = ch._1stChannelId == channelId?ch._2ndThumbnail:ch._1stThumbnail;
          return o;
        });

        let channels = await Channel.find({channelId: {$nin:[channelId]},isActiveCrossSub:true})
        .populate({
          path: 'recentVideos',
          options:{
            limit:1,
            sort:{id:-1}
          }
        });

        let notIn = [];
        await channels.forEach(async s=>{
          let isExist = false;
          await maps.forEach(m=>{
            if(m.channelId == s.channelId){
              isExist = true;
              return true;
            }
          });
          if(!isExist){
            notIn.push(s);
          }
        });
        return resolve(notIn);
      } catch (e) {
        return reject(new Error('get available list failed: '+e));
      }
    });
  }
}
