module.exports = (function() {
	var Weibo = require('nodeweibo');
	var express = require('express');
	var sleep = require('sleep');
	var schedule = require('node-schedule');
  	var _ = require('lodash');
  	var API = require('./api.js');
  	var default_conf = {
  		port: 80,
		lastMentionId : 0,
		lastMentionInCommentsId: 0, 
		debug: true, 
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
	    var weibo_required = _.every(['token', 'code', 'settings'], function(n) {
	      return _.has(config.weibo, n);
	    });
	    if (!weibo_required) return;

	    this.conf = default_conf;
    	_.assign(this.conf, config);

	    this.url = this._url();
	    api = new API(this.url);

	    this.app = express();
	    this.app.parent = this; // set parent to app

		this.app.set('port', (this.conf.port));
		this.app.get('/', function(request, response) {
			var echostr = request.query.echostr;
			response.send(echostr);
		});

		this.app.get('/auth', function(request, response) {
			this.conf.weibo.code = request.query.code;
  			response.redirect('/access_token');
		});

		this.app.get('/access_token', function(request, response) {
			var jsonParas = {
			    code:this.conf.weibo.code,
			    grant_type:"authorization_code"
			};
			Weibo.OAuth2.access_token(jsonParas,function(data){
			    this.conf.weibo.access_token = data.access_token;
			    response.send('Authenticated!');
			});
  	
		});
	};
	WeiboServer.prototype = {
	    /*
	     * Start weibo server
	     *
	     * *port*, which port to listen to, optinal. If not set, will look up 
	     * conf.port and if still not set, 80 by default.
	     */
	    start: function(port) {
			var server = this.app.listen(port || this.app.get('port'), function() {
				// TODO: log
				console.log("weibo server for %s starts...", self.url);
				Weibo.init(this.conf.weibo.settings);
				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": this.conf.weibo.access_token,
				    "since_id": this.conf.lastMentionId,
				    "count": 1
				}
				Weibo.Statuses.mentions(para, function(data){
					if (this.conf.debug){
						console.log(data);
					}
					if (data.statuses[0] != undefined){
						this.conf.lastMentionId = data.statuses[0].id;
					}
				});
				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": this.conf.weibo.access_token,
				    "since_id": this.conf.weibo.lastMentionInCommentsId,
				    "count": 1
				}
				Weibo.Comments.mentions(para, function(data){
					if (this.conf.debug){
						console.log(data);
					}
					if (data.comments[0] != undefined){
						this.conf.lastMentionInCommentsId = data.comments[0].id;
					}
				});
				if(this.conf.debug){
			 		//adapter.random(Weibo.appKey.appKey,this.conf.access_token);
			 	}
			});
			server.on('error', function(err) {
			// TODO: log
			});
			var rule = new schedule.RecurrenceRule();
			rule.second = 1;

			var replyToMentions = schedule.scheduleJob(rule, function(){
				/*if no last mention found in record, then it must have
				 been called before we finish initialization.
				 Thus, we will abort this job if no record found.
				*/
				if(this.conf.lastMentionId == 0 ){
					return
				}
				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": this.conf.weibo.access_token,
				    "since_id": this.conf.lastMentionId
				}
				Weibo.Statuses.mentions(para, function(data){
					if (this.conf.debug){
						console.log(data);
					}
					if (data.statuses[0] == null) {
						return;
					}
					this.conf.lastMentionId = data.statuses[0].id;

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
							this.comment(Weibo.appKey.appKey, this.conf.access_token, content, id, null);
							sleep.sleep(5);
						}else{		
							this.status(Weibo.appKey.appKey, this.conf.access_token, content, username);
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
				if(this.conf.lastMentionInCommentsId == 0 ){
					return;
				}

				var para = {
				    "source": Weibo.appKey.appKey,
				    "access_token": this.conf.weibo.access_token,
				    "since_id": this.conf.lastMentionInCommentsId
				}

				Weibo.Comments.mentions(para, function(data){
					if (this.conf.debug){
						console.log(data);
					}	
					if (data.comments[0] == null)
						return;	
					this.conf.lastMentionInCommentsId = data.comments[0].id;

					for (mention in data.comments){
						var username = data.comments[mention].user.screen_name;
						var content = data.comments[mention].text.replace(/(|^)@\S+/,'');
						var id = data.comments[mention].status.id;
						var cid = data.comments[mention].id;
						if (data.comments[mention].status.user.allow_all_comment){
							this.comment(Weibo.appKey.appKey, this.conf.access_token, content, id, cid);
							sleep.sleep(5);
						}else{
							this.status(Weibo.appKey.appKey,this.conf.access_token,content, username);
							sleep.sleep(5);

						}
					}
				});
			});
			rule = new schedule.RecurrenceRule();
			rule.hour = 8;
			rule.minute = 30;
			var postMostViewedCharacter = schedule.scheduleJob(rule, function(){
				this.specialStatus(Weibo.appKey.appKey,this.conf.access_token,"most viewed");


			});
			rule = new schedule.RecurrenceRule();
			rule.hour = [ 11, 15, 17, 21];
			rule.minute = 0;
			var postRandomArticle = schedule.scheduleJob(rule, function(){
				this.random(Weibo.appKey.appKey,this.conf.access_token);
			});

	    },
	    comment: function( content, id, cid ){

	    },

	    status: function( content, username ) {

	    },

	    specialStatus: function ( type ){

	    },

	    postRandomArticle: function (){

	    },
	    /*
	     * Get url of the wiki site
	     */
	    _url: function() {
	      return 'http://' + this.conf.name + '.huiji.wiki';
	    },
	    /*
	     * Get page url on the wiki site
	     */
	    _page_url: function(title) {
	      var base = this.url || this._url();
	      return base + '/wiki/' + title;
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
	      res.reply(this.conf.CONST.ERR);
	      return;
	    }
	};

}());



