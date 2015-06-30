var WeiboServer = require('../weibo.js');


var config = {
	name: "asoiaf",
	debug: true, 
	weibo: {
		code: "29625396137fc382c0c46f38a0ea97c2",
		access_token: "2.00m45lWBblWJNE4ff2df14340098zc",
		settings: {
		    "appKey":"3858894607",
		    "appSecret":"29625396137fc382c0c46f38a0ea97c2",
		    "redirectUrl":"https://zh-asoiaf-weibo.herokuapp.com/auth"
		},
	},
	port: 3830
};


var weibo = new WeiboServer(config);
//weibo.authorize();
//weibo.getToken();
//weibo.postRandomArticle();https://api.weibo.com/oauth2/authorize?client_id=3858894607&redirect_uri=https://zh-asoiaf-weibo.herokuapp.com/auth&client_secret=29625396137fc382c0c46f38a0ea97c2&
// weibo.postRandomArticle();
weibo.status('琼恩');
