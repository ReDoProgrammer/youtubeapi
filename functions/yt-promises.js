const Channel = require('../models/channel-model');
const RV = require('../models/recentvideos-model');
const subscription = require('../models/subscription-model');
const YT = require('./youtube-api');
module.exports = class Promises{



	//update channel info as: view count,like count, subscribe count,....
	//return related playlistId
	static updateProfile =(profileId,access_token,refresh_token)=>{
		return new Promise(async (resolve,reject)=>{
			try {
				var part = {
					part:'contentDetails,statistics',
					mine:true
				}
				var result =await YT.overview(part,access_token,refresh_token);
				Channel.findOneAndUpdate({profileId:profileId},{
					channelId:result.data.items[0].id,
					viewCount:result.data.items[0].statistics.viewCount,
					subscriberCount:result.data.items[0].statistics.subscriberCount,
					videoCount:result.data.items[0].statistics.videoCount,
					relatedUploadList:result.data.items[0].contentDetails.relatedPlaylists.uploads
				},(err,ch)=>{
					if(err) return reject('update channel profile failed: '+err);
					return resolve(ch);
				})
			} catch (e) {
				return reject(new Error('Your channel is not exist: '+e));
			}
		});
	}

	//fetch the 4th lated video that belong to own channel
	static getLatedVideos = (oldVideoIds,playlistId,access_token,refresh_token) =>{
		return new Promise(async (resolve,reject)=>{
			try {
				//delete old videos that belong to own channel
				await RV.deleteMany({_id:{"$in":oldVideoIds}},(err,result)=>{
					if(err) return reject(new Error('delete old videos failed: '+err));
				});
				var part = {
					part:'snippet',
					playlistId:playlistId,
					maxResults:4
				};

				await YT.playlistitems(part,access_token,refresh_token).then(async (result)=>{
					var data = await result.data.items;
					let videos = await data.map(rv=>{
						var v = {};
						v['videoId']			=	rv.snippet.resourceId.videoId;
						v['publishedAt']	=	rv.snippet.publishedAt;
						v['title']				=	rv.snippet.title;
						v['description']	=	rv.snippet.description;
						v['thumbnail']		=	rv.snippet.thumbnails.medium.url;
						return v;
					});
					await RV.insertMany(videos,(err,data)=>{
						if(err) return reject('insert recent videos failed: '+err);
						return resolve(data);
					});
				});
			} catch (e) {
				return reject(new Error('fetch 4lated videos failed: '+e));
			}
		});
	}

	//set owner of videos list with foreign key
	//statistic basic info of these video as: view,like,unlike,comment
	static setVideosSats = (videos,access_token,refresh_token)=>{
		return new Promise(async (resolve,reject)=>{
			try {
				await videos.forEach(async function(video){
					let part = {
						part:'statistics',
						id:video.videoId
					};
					await YT.video(part,access_token,refresh_token).then(async function(result){
						await RV.updateOne({videoId:video.videoId},{
							viewCount:result.data.items[0].statistics.viewCount,
							likeCount:result.data.items[0].statistics.likeCount,
							dislikeCount:result.data.items[0].statistics.dislikeCount,
							favoriteCount:result.data.items[0].statistics.favoriteCount,
							commentCount:result.data.items[0].statistics.commentCount
						},async function(err,result){
							if(err){
								return reject('stats video failed: '+err);
							}
						});
					});

				});
				return resolve(videos);
			} catch (e) {
				return reject(new Error('error found when update profile: '+e));
			}
		});
	}

	//set owner for videos
	static setOwner = (videos,channelId)=>{
		return new Promise((resolve,reject)=>{
			try {
				Channel.findOneAndUpdate({channelId:channelId},{
					recentVideos:videos
				},(err,ch)=>{
					if(err) return reject(new Error('updadate owner failed: '+err));
					return resolve(ch);
				});
			} catch (e) {
				return reject(new Error('set owner of videos failed: '+e));
			}
		});
	};


	//fetch all channels that own channel subscribe to
	static getSub = (channelId,access_token,refresh_token)=>{
		return new Promise(async (resolve,reject)=>{
			try{
				var token = '';
				var cache =[];
				while(token!==undefined){
					let part =await{
						channelId: channelId,
						part:'snippet',
						maxResults:50,
						pageToken:token
					};
					await YA.subscriptions_list(part,access_token,refresh_token).then(async function(result){
						token =await result.data.nextPageToken;
						cache = await cache.concat(result.data.items);
					});
				}
				var subs = cache.map(sub=>{
					var s= {};
					s['partnerId']= sub.snippet.resourceId.channelId;
					s['title']=sub.snippet.title;
					s['thumbnail']=sub.snippet.thumbnails.default.url;
					return s;
				});
				return resolve(subs);
			}catch(ex){
				return reject('get sublist failed: ',ex);
			}

		});
	}


	//fetch all channel which subscribe to own channel
	static getBeSub = (channelId,access_token,refresh_token)=>{
		return new Promise(async (resolve,reject)=>{
			try {
				var token = '';
				var cache =[];
				while(token!==undefined){
					let part = {
						part:'subscriberSnippet',
						forChannelId:channelId,
						mySubscribers:true,
						maxResults:50,
						pageToken: token
					};
					await YA.subscriptions_list(part,access_token,refresh_token)
					.then(result=>{
						token =result.data.nextPageToken;
						cache =cache.concat(result.data.items);
					})
					.catch(err => reject(new Error('subscription list failed: '+err)));
				}
				var flags = [], output = [], l = cache.length, i;
				for( i=0; i<l; i++) {
					if( flags[cache[i].subscriberSnippet.channelId]) continue;
					flags[cache[i].subscriberSnippet.channelId] = true;
					output.push({
						partnerId:cache[i].subscriberSnippet.channelId,
						title:cache[i].subscriberSnippet.title,
						thumbnail:cache[i].subscriberSnippet.thumbnails.default.url
					});
				}
				return resolve(output);
			} catch (e) {
				return reject(new Error('fetch besublist failed: '+e));
			}
		});
	}


	static setsubscription = (own,subs,isBeSub)=>{
		return new Promise(async (resolve,reject)=>{
			try {
				await subs.forEach(async sub=>{
					await subscription.findOne({
						$or:[
							{_1stChannelId:own.channelId,_2ndChannelId:sub.partnerId},
							{_1stChannelId:sub.partnerId,_2ndChannelId:own.channelId}
						]
					},async (err,ch)=>{
						if(err) return reject(new Error('can not find subscription: '+err));
						if(!ch){//if subscription not found
							if(isBeSub){//if other channel subscribes to own channel
								subscription.create({
									_1stChannelId:own.channelId,
									_2ndChannelId:sub.partnerId,
									_1stTitle:own.title,
									_2ndTitle:sub.title,
									_1stThumbnail:own.thumbnail,
									_2ndThumbnail:sub.thumbnail,
									_2ndSub:true
								},(err,result)=>{
									if(err) return reject(new Error('insert subscription failed: '+err));
								});
							}else{//if own channel subscribes to other
								subscription.create({
									_1stChannelId:own.channelId,
									_2ndChannelId:sub.partnerId,
									_1stTitle:own.title,
									_2ndTitle:sub.title,
									_1stThumbnail:own.thumbnail,
									_2ndThumbnail:sub.thumbnail,
									_1stSub:true
								},(err,result)=>{
									if(err) return reject(new Error('insert subscription failed: '+err));
								});
							}
						}else{//if subscription is already exist
							if(isBeSub){//case other channel subscribe to own channel
								if(ch._1stChannelId == own.channelId && !ch._2ndSub){
									await subscription.findOneAndUpdate({
										_1stChannelId:own.channelId,
										_2ndChannelId:ch._2ndChannelId
									},{
										_2ndSub:true
									},(err,result)=>{
										if(err) return reject(new Error('update subscription failed: '+err));
									});
								}else{
									if(ch._2ndChannelId == own.channelId && !ch._1stSub){
										subscription.findOneAndUpdate({
											_1stChannelId:ch._1stChannelId,
											_2ndChannelId:own.channelId
										},{
											_1stSub:true
										},(err,result)=>{
											if(err) return reject(new Error('update subscription failed: '+err));
										});
									}
								}
							}else{//case own channel subscribe to other
								if(ch._1stChannelId == own.channelId && !ch._1stSub){
									await subscription.findOneAndUpdate({
										_1stChannelId:own.channelId,
										_2ndChannelId:ch._2ndChannelId
									},{
										_1stSub:true
									},(err,result)=>{
										if(err) return reject(new Error('update subscription failed: '+err));
									});
								}else{
									if(ch._2ndChannelId == own.channelId && !ch._2ndSub){
										await subscription.findOneAndUpdate({
											_1stChannelId:ch._1stChannelId,
											_2ndChannelId:own.channelId
										},{
											_2ndSub:true
										},(err,result)=>{
											if(err) return reject(new Error('update subscription failed: '+err));
										});
									}
								}
							}
						}
					});
				});
				return resolve(subs);
			} catch (e) {
				return reject(new Error('set subscription fail: '+e));
			}
		});
	}

	static checkUnsubscribe=(own,subs,isBeSub)=>{
		return new Promise(async (resolve,reject)=>{
			try {
				if(isBeSub){//other channels subscribe to own channel
					//fetch all rows which own channel is subscribed by others
					//own channel can be at the first column named: _1stChannelId
					//or at the second column named: _2ndChannelId
					try {
						let dbSub =await subscription.find({
							$or:[
								{_1stChannelId:own.channelId,_2ndSub:true},//own channel at the first column, is subscribed by other at the second column
								{_2ndChannelId:own.channelId,_1stSub:true}//own channel at the first column and is subscribed by other at the first column
							]
						});
						await dbSub.forEach(async sub=>{
							if(sub._1stChannelId == own.channelId){//if own channelId at the first column which named: _1stChannelId
								let item = await subs.find(s=>s.partnerId ===sub._2ndChannelId);
								if(!item){//if not found
									subscription.findOneAndUpdate({
										_1stChannelId:sub._1stChannelId,
										_2ndChannelId:sub._2ndChannelId
									},{
										_2ndSub:false,
										_2ndCanSub:true
									},(err,result)=>{
										if(err) return reject(new Error('update unsubscribe failed: '+err));
									});
								}
							}else{//if sub._2ndChannelId == own.channelId
								let item = await subs.find(s=>s.partnerId ===sub._1stChannelId);
								if(!item){//if not found
									subscription.findOneAndUpdate({
										_1stChannelId:sub._1stChannelId,
										_2ndChannelId:sub._2ndChannelId
									},{
										_1stSub:false,
										_1stCanSub:true
									},(err,result)=>{
										if(err) return reject(new Error('update unsubscribe failed: '+err));
									});
								}
							}
						});
						return resolve(subs);
					} catch (e) {
						return reject(new Error('get unsubscribe in besub list failed: '+err));
					}
				}else{//own channel subscribes to others <=> isBeSub equals false
					try {
						let dbSub =await subscription.find({//fetch all of channels which own channel subscribes to
							$or:[
								{_1stChannelId:own.channelId,_1stSub:true},//if own channel id at the first column named: _1stChannelId
								{_2ndChannelId:own.channelId,_2ndSub:true}// if own channel id at the second column named: _2ndChannelId
							]
						});
						await dbSub.forEach(async sub=>{
							if(sub._1stChannelId == own.channelId){//if own channel is at the first column which named _1stChannelId
								let item = await subs.find(s=>s.partnerId ===sub._2ndChannelId);
								if(!item){//if not found
									subscription.findOneAndUpdate({
										_1stChannelId:sub._1stChannelId,
										_2ndChannelId:sub._2ndChannelId
									},{
										_1stSub:false,
										_1stCanSub:true,
									},(err,result)=>{
										if(err) return reject(new Error('update unsubscribe failed: '+err));
									});
								}
							}else{//if own channel is at the second column which named: _2ndChannelId
								let item = await subs.find(s=>s.partnerId ===sub._1stChannelId);
								if(!item){//if not found
									subscription.findOneAndUpdate({
										_1stChannelId:sub._1stChannelId,
										_2ndChannelId:sub._2ndChannelId
									},{
										_2ndSub:false,
										_2ndCanSub:true
									},(err,result)=>{
										if(err) return reject(new Error('update unsubscribe failed: '+err));
									});
								}
							}
						});
						return resolve(subs);
					} catch (e) {
						return reject(new Error('get unsubcirbe in subscribe list failed: '+err));
					}
				}
			} catch (e) {
				return reject(new Error('check unsubscribe failed: '+err));
			}
		});
	}



}
