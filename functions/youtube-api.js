
const {google} = require('googleapis');
OAuth2 = google.auth.OAuth2;
module.exports = class YTAPI{

	static overview(part,access_token,refresh_token){
		try{
			var oauth2Client = new OAuth2(
				config.clientID,
				config.clientSecret,
				config.callbackURL
			);

			oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
			return google.youtube({
				version: 'v3',
				auth: oauth2Client
			}).channels.list(part);
		}catch(err){
			console.log('channel overview list query failed: '+err);
			return null;
		}
	};

	static async subscriptions_list(part,access_token,refresh_token){
		return new Promise(async (resolve,reject)=>{
			try{
				var oauth2Client = new OAuth2(
					config.clientID,
					config.clientSecret,
					config.callbackURL
				);
				oauth2Client.credentials =await { access_token: access_token, refresh_token: refresh_token };
				return resolve(google.youtube({
					version: 'v3',
					auth: oauth2Client
				}).subscriptions.list(part));

			}catch(err){
				return reject(new Error('subsciption list failed: ',err));
			}
		});
	}

	static async subscription_insert(channelId,access_token,refresh_token){
		return new Promise(async (resolve,reject)=>{
			try {
				var oauth2Client = new OAuth2(
					config.clientID,
					config.clientSecret,
					config.callbackURL
				);
				oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
				var data = {
					part:['snippet'],
					resource:{
						snippet:{
							resourceId:{
								kind:'youtube#channel',
								channelId:channelId
							}
						}
					}
				};
				return resolve(await google.youtube({
					version: 'v3',
					auth: oauth2Client
				}).subscriptions.insert(data));

			} catch (e) {
				return reject(new Error('insert failed: '+e));
			}
		});

	}
	static async playlistitems(part,access_token,refresh_token){
		try{
			var oauth2Client = new OAuth2(
				config.clientID,
				config.clientSecret,
				config.callbackURL
			);
			oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
			return await google.youtube({
				version: 'v3',
				auth: oauth2Client
			}).playlistItems.list(part);
		}catch(err){
			console.log('playlistitems list query failed: '+err);
			return null;
		}
	}

	static async video(part,access_token,refresh_token){
		try{
			var oauth2Client = new OAuth2(
				config.clientID,
				config.clientSecret,
				config.callbackURL
			);
			oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
			return await google.youtube({
				version: 'v3',
				auth: oauth2Client
			}).videos.list(part);
		}catch(err){
			console.log('err when execute video function: '+err);
		}
	}

	static async comment(videoId,comment,access_token,refresh_token){
		return new Promise((resolve,reject)=>{
			try {
				var oauth2Client = new OAuth2(
					config.clientID,
					config.clientSecret,
					config.callbackURL
				);
				oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
				var data = {
					part:['snippet'],
					resource:{
						snippet:{
							videoId:videoId,
							topLevelComment:{
								snippet:{
									textOriginal:comment
								}
							}
						}
					}
				};
				return resolve(
					google.youtube({
						version: 'v3',
						auth: oauth2Client
					}).commentThreads.insert(data)
				);
			} catch (e) {
				return reject(new Error('insert comment failed: '+e));
			}
		});
	}

	static rate(videoId,rating,access_token,refresh_token){
		return new Promise((resolve,reject)=>{
			try {
				var oauth2Client = new OAuth2(
					config.clientID,
					config.clientSecret,
					config.callbackURL
				);
				oauth2Client.credentials = { access_token: access_token, refresh_token: refresh_token };
				var data = {
					id:videoId,
					rating:rating
				};
				return resolve(google.youtube({
					version: 'v3',
					auth: oauth2Client
				}).videos.rate(data));
			} catch (e) {
				return reject(new Error('rate video failed: '+e));
			}
		});
	}

}
