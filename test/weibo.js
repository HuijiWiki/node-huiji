var WeiboServer = require('../weibo.js');
//2.00koSbxFblWJNEe0aee4fd91KEPM2D
//2.00m45lWBblWJNE4ff2df14340098zc

var config = {
	name: "asoiaf",
	debug: true, 
	weibo: {
		code: "29625396137fc382c0c46f38a0ea97c2",
		access_token: "2.00rVrrrCblWJNE9bfb3884beZx5dnC",
		settings: {
		    "appKey":"3858894607",
		    "appSecret":"29625396137fc382c0c46f38a0ea97c2",
		    "redirectUrl":"https://zh-asoiaf-weibo.herokuapp.com/auth"
		},
	},
	port: 5001
};


var weibo = new WeiboServer(config);
weibo.postRandomArticle();
weibo.start();

