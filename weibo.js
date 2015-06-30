module.exports = (function() {
	var Weibo = require('nodeweibo');
	var express = require('express');
	var sleep = require('sleep');
	var schedule = require('node-schedule');
  	var _ = require('lodash');
  	var API = require('./api.js');
  	var FormData = require('form-data');
  	var fs = require('fs');
  	var request = require('request').defaults({ encoding: null });;
  	var api = null;	// API caller
    var self = null;	// point to WeChat itself
  	var default_conf = {
  		port: 80,
		lastMentionId : 0,
		lastMentionInCommentsId: 0, 
		statusesPerDay: 5,
		debug: true, 
		CONST: {
      		ERR: '啊啦，服务器傲娇啦~~~~(>_<)~~~~ 。请稍后重试~！',
      		NO_RESULT: '抱歉，暂未找到相关词条，不妨试试其他关键词~？',
      		PIC_PLACEHOLDER: 'http://home.huiji.wiki/uploads/8/81/Wechat_placeholder_logo.png'
    	}
  	};

  	var WeiboServer = function(config){
	  	/*
	     * *config* is required, 
	     *   config.name,
	     *   config.weibo,
	     *   config.weibo.token,
	     *   config.weibo.code,
	     *   config.weibo.settings,
	     * All of the above are required.
	     */

	    if (!config) return;
	    if (!config.name || !config.weibo) return;
	    var weibo_required = _.every(['access_token', 'code', 'settings'], function(n) {
	      return _.has(config.weibo, n);
	    });
	    if (!weibo_required) return;

	    self = this;

	    self.conf = default_conf;
    	_.assign(self.conf, config);

	    self.url = self._url();
	    api = new API(self.url);

	    self.app = express();
	    self.app.parent = self; // set parent to app

		self.app.get('/', function(request, response) {
			var echostr = request.query.echostr;
			response.send(echostr);
		});

		self.app.get('/auth', function(request, response) {
			self.conf.weibo.code = request.query.code;
  			response.redirect('/access_token');
		});

		self.app.get('/access_token', function(request, response) {
			var jsonParas = {
			    code:self.conf.weibo.code,
			    grant_type:"authorization_code"
			};
			Weibo.OAuth2.access_token(jsonParas,function(data){
			    self.conf.weibo.access_token = data.access_token;
			    response.send('Authenticated!');
			});
  	
		});
		Weibo.init(self.conf.weibo.settings);
						
	};
	WeiboServer.prototype = {
	    /*
	     * Start weibo server
	     *
	     * *port*, which port to listen to, optinal. If not set, will look up 
	     * conf.port and if still not set, 80 by default.
	     */
	    start: function(port) {
			var server = self.app.listen( port || self.conf.port, function() {
				// TODO: log
				console.log("weibo server for %s starts...", self.url);

				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": self.conf.weibo.access_token,
				    "since_id": self.conf.lastMentionId,
				    "count": 1
				}
				Weibo.Statuses.mentions(para, function(data){
					if (self.conf.debug){
						console.log(data);
					}
					if (data.statuses[0] != undefined){
						self.conf.lastMentionId = data.statuses[0].id;
					}
				});
				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": self.conf.weibo.access_token,
				    "since_id": self.conf.weibo.lastMentionInCommentsId,
				    "count": 1
				}
				Weibo.Comments.mentions(para, function(data){
					if (self.conf.debug){
						console.log(data);
					}
					if (data.comments[0] != undefined){
						self.conf.lastMentionInCommentsId = data.comments[0].id;
					}
				});
				if(self.conf.debug){
			 		//adapter.random(Weibo.appKey.appKey,this.conf.access_token);
			 	}
			});
			server.on('error', function(err) {
				console.log(err);
			});
			var rule = new schedule.RecurrenceRule();
			rule.second = 1;

			var replyToMentions = schedule.scheduleJob(rule, function(){
				/*if no last mention found in record, then it must have
				 been called before we finish initialization.
				 Thus, we will abort this job if no record found.
				*/
				if(self.conf.lastMentionId == 0 ){
					return;
				}
				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": self.conf.weibo.access_token,
				    "since_id": self.conf.lastMentionId
				}
				Weibo.Statuses.mentions(para, function(data){
					if (self.conf.debug){
						console.log(data);
					}
					if (data.statuses[0] == undefined) {
						self.conf.lastMentionId = 1;
						return;
					}
					self.conf.lastMentionId = data.statuses[0].id;

					for (mention in data.statuses){
						var username = data.statuses[mention].user.screen_name;
						var content = data.statuses[mention].text;
						if (data.statuses[mention].retweeted_status!=null){
							if (content.indexOf('@冰与火之歌中文维基') == -1 ){
								return;
								/* Hard code is bad... To be changed*/
							}
							if (content.indexOf('@冰与火之歌中文维基') > content.indexOf('//') && content.indexOf('//')!= -1 ){
								return;
								/* Hard code is bad... To be changed*/
							}
						}
						content = content.replace(/(|^)@\S+/g,'').replace(/ /g,'');;
						if (content.indexOf('//')!= -1){
							content = content.substring(0, content.indexOf('//'));					
						}

						var id = data.statuses[mention].id;

						if (data.statuses[mention].user.allow_all_comment){
							self.comment(content, id, null);
							sleep.sleep(5);
						}else{		
							self.status(content, username);
							sleep.sleep(5);

						}
					}
				});
			});
			rule = new schedule.RecurrenceRule();
			rule.second = 30;
			var replayToMentionsInComments = schedule.scheduleJob(rule, function(){
				/*if no last comment found in record, then it must have
				 been called before we finish initialization.
				 Thus, we will abort this job if no record found.
				*/
				if(self.conf.lastMentionInCommentsId == 0 ){
					self.conf.lastMentionInCommentsId = 1;
					return;
				}

				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": self.conf.weibo.access_token,
				    "since_id": self.conf.lastMentionInCommentsId
				}

				Weibo.Comments.mentions(para, function(data){
					if (self.conf.debug){
						console.log(data);
					}	
					if (data.comments[0] == null){
						return;	
					}
					self.conf.lastMentionInCommentsId = data.comments[0].id;

					for (mention in data.comments){
						var username = data.comments[mention].user.screen_name;
						var content = data.comments[mention].text.replace(/(|^)@\S+/,'');
						var id = data.comments[mention].status.id;
						var cid = data.comments[mention].id;
						if (data.comments[mention].status.user.allow_all_comment){
							self.comment(content, id, cid);
							sleep.sleep(5);
						}
					}
				});
			});
			rule = new schedule.RecurrenceRule();
			rule.hour = 8;
			rule.minute = 30;
			var postMostViewedCharacter = schedule.scheduleJob(rule, function(){
				self.specialStatus(Weibo.appKey.appKey,self.conf.access_token,"most viewed");


			});
			rule = new schedule.RecurrenceRule();
			switch (self.conf.statusesPerDay){
				case 0:
					return;
					break;
				case 1:
					rule.hour = [21];
					break;
				case 2:
					rule.hour = [15, 21];
					break;
				case 3:
					rule.hour = [11, 15, 21];
					break;
				case 4:
					rule.hour = [9, 11, 15, 21];
					break;
				case 5:
					rule.hour = [9, 11, 15, 19, 21];
					break;
				case 6:
					rule.hour = [9, 11, 15, 17, 19, 21];
					break;
				default:
					rule.hour = [9, 11, 13, 15, 17, 19, 21];
					break;
			}
			rule.minute = 0;
			var postRandomArticle = schedule.scheduleJob(rule, function(){
				self.postRandomArticle();
			});

	    },
	    comment: function( content, id, cid ){
	    	var param = {
	    		key: content,
	    		limit: 1,
	    	}
	    	api.search(param, function(err, data){
	    		if (err){
	    			console.log(err);
	    			return;
	    		}
	    		if (self.conf.debug){
	    			console.log(data);
	    		}
	    		if (data != undefined && data[0] != undefined){
	    			param = {
	    				titles: data,
	    				abstracts: 140,
	    			}
	    			api.details(param, function (err, data){
	    				if (err || data == undefined || data[0] == undefined ){
			    			console.log(err);
			    			return;
			    		}
			    		if (self.conf.debug){
			    			console.log(data);
			    		}
			    		if (cid == null){
							var para = {
							    "source": Weibo.appKey.appKey,
							    "access_token": self.conf.weibo.access_token,
							    "comment": data[0].extract.substring(0,120)+"..."+self._page_short_url(data[0].pageid),
							    "id" : id
							}
				
							Weibo.Comments.create(para, function(data){
								if (self.conf.debug){
									console.log(data);
								}
							});
			    		}
			    		else {
							var para = {
							    "source": Weibo.appKey.appKey,
							    "access_token": self.conf.weibo.access_token,
							    "comment": data[0].extract.substring(0,110)+"..."+self._page_short_url(data[0].pageid),
							    "id" : id,
							    "cid" : cid
							}
							Weibo.Comments.reply(para, function(data){
								if (self.conf.debug){
									console.log(data);
								}
							});
			    		}

	    			});
	    		}


	    		
	    	});

	    },

	    status: function( content, username ) {
	    	var param = {
	    		key: content,
	    		limit: 1,
	    	}
	    	api.search(param, function(err, data){
	    		if (err){
	    			console.log(err);
	    			return;
	    		}
	    		if (self.conf.debug){
	    			console.log(data);
	    		}
	    		if (data != undefined && data[0] != undefined){
	    			param = {
	    				titles: data
	    			}
	    			api.details(param, function (err, data){
	    				if (err || data == undefined || data[0] == undefined ){
			    			console.log(err);
			    			return;
			    		}
			    		if (self.conf.debug){
			    			console.log(data);
			    		}
			    		var msg = '';
			    		if (username){
			    			msg += '@'+ username+' ';
			    		}
			    		msg += data[0].extract.substring(0,110)+'...'+self._page_short_url(data[0].pageid);

			    		if (data[0].thumbnail && data[0].thumbnail.source){
			    			var form = new FormData();
			    			form.append('source', Weibo.appKey.appKey);
			    			form.append('access_token', self.conf.weibo.access_token);
			    			form.append('pic', request(data[0].thumbnail.source));
			    			form.append('status', msg);
			    			form.submit('https://upload.api.weibo.com/2/statuses/upload.json', function(err, res){
			    				res.resume();
			    			});

			    		} else {
							var para = {
								"source": Weibo.appKey.appKey,
								"access_token": self.conf.weibo.access_token,
							    "status": msg
							}
							Weibo.Statuses.update(para, function(data){
								if (self.conf.debug){
									console.log(data);
								}
							});     			
			    		}
			    	});
	    		}

	    	});

	    },

	    specialStatus: function ( type ){

	    },

	    postRandomArticle: function (){
	    	url="http://asoiaf.huiji.wiki/api.php?action=query&list=random&rnlimit=1&format=json&rnnamespace=0"
			var my_source = Weibo.appKey.appKey, my_token = self.conf.weibo.access_token;

			request.get(url, function(err, res, body){
				if (!err && res.statusCode == 200) {
					var query = JSON.parse(body).query;
					var winner = query.random[0].title;
					if(self.conf.debug)
						console.log(winner);
					self.status( winner, false);
				}
			});

	    },

	    authorize: function(){
	    	Weibo.authorize();
	    },
	    getToken: function(){
			var jsonParas = {
			    code: self.conf.weibo.code,
			    grant_type:"authorization_code"
			};

			Weibo.OAuth2.access_token(jsonParas,function(data){
			    console.log(data);
			});	    	
	    },
	    /*
	     * Get url of the wiki site
	     */
	    _url: function() {
	      return 'http://' + self.conf.name + '.huiji.wiki';
	    },
	    /*
	     * Get page url on the wiki site
	     */
	    _page_url: function(title) {
	      var base = self.url || self._url();
	      return base + '/wiki/' + title;
	    },
	    /*
	     * Get short url on the wiki site
	     */
	    _page_short_url: function(id) {
	      var base = self.url || self._url();
	      return base + '/index.php?curid=' + id;
	    },
	    /*
	     * Called when an error occurs. Respond plain text conf.CONST.ERR to 
	     * client by default. 
	     *
	     * *err*, message of the error, will be logged.
	     * *res*, will call res.reply() to respond to client.
	     */
	    _err: function(err, res) {
	      console.log(err);
	      res.reply(self.conf.CONST.ERR);
	      return;
	    }
	};
	return WeiboServer;

}());



