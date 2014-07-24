var express = require('express'),
	stylus = require('stylus'),
	nib = require('nib'),
	fs = require('fs'),
	request = require('request'),
	util = require('util'),
	Twit = require('twit');

var app = express();

var T = new Twit({
	consumer_key: 'mr87LvmetQRQg9gR7IPDPexWX',
	consumer_secret: 'iAETAqN6RurKv1VWeS68vegvLbMfs1tFh3LYQbE2n5qQ4VELRC',
	access_token: '2625256832-686SDrJGW9IPstSPQScHZPvAl9vNzAindSgLHQE',
	access_token_secret: '6OThS6l2NYBEs4QFIcnawSucjWlEcujLKyRFTFECirzP1'
});


app.set('view engine', 'jade'); //templates located in /views/*.jade
app.set('case sensitive routing', 'true');

app.getPort = function() { 
	return Number(process.env.PORT || 3000);
}

app.log = function(message) { 
	console.log(new Date() + ": " + message);
}

app.accesslog = function(req) { 
	app.log(req.route);
}

function compile(str, path) {
	console.log("Compiling " + str);
	return stylus(str).set('filename', path).use(nib());
}

app.use(stylus.middleware({ 
	src: __dirname + '/public', 
	compile: compile 
}));

app.use(express.static(__dirname, 'public'));

function getRandomInRange(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function insertLinks(tweet_text) {
	new_text = "";
	tweet_text.split(" ").forEach(function(word) {
		if (word[0] == '@' && word.length > 1) {
			new_text += "<a href='https://twitter.com/" + word.substr(1, word.length) + "'>" + word + "</a>" + " ";
		} else if (word[0] == '#' && word.length > 1) {
			new_text += "<a href='https://twitter.com/hashtag/" + word.substr(1, word.length) + "?src=hash'>" + word + "</a>" + " ";
		} else {
			new_text += word + " ";
		}
	});
	return new_text.trim();
}

function trimDate(date) {
	return date.split(" ").splice(1,2).join(" ");
}
// Fisher-Yates shuffle algorithm
// credit: http://bost.ocks.org/mike/shuffle/
function shuffle(array) {
  var m = array.length, t, i;
  while (m) { 
    i = Math.floor(Math.random() * m--); 
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

app.get('/', function(req,res) {
	bricks = []
	request('https://api.instagram.com/v1/users/23362758/media/recent?client_id=c836878d8188457799e29b06d9205263&count=5', function (err, resp, body) {
		if (!err && resp.statusCode == 200) {
			instagram = JSON.parse(body);
			instagram['data'].forEach(function(item){
				t = new Date(1970,0,1);
				t.setSeconds(item['created_time'])
				photo = {
					'thumbnail' : item['images']['thumbnail']['url'],
					'link' : item['link'],
					'numComments' : item['comments']['count'],
					'numLikes' : item['likes']['count'],
					'created' : trimDate(t.toDateString()),
					'text' : insertLinks(item['caption']['text']),
					'type' : 'insta',
					'brick_id' : getRandomInRange(1,5)
				};
				bricks.push(photo);
			});
		}
		T.get('/statuses/user_timeline', 
			{screen_name:  'eternallyjackie', 
			count: 5},
			function(err, data, resp) {
				if(!err && resp.statusCode == 200) {
					tweets = []
					data.forEach(function(item) {
						tweet = {}
						tweet.type = 'tweet'
						tweet.brick_id = getRandomInRange(1,5);
						t = new Date(item['created_at']);
						tweet.created_at = trimDate(t.toDateString());
						if('retweeted_status' in item) {
							tweet.text = insertLinks(item['retweeted_status']['text']);
							tweet.real_name = item['retweeted_status']['user']['name'];
							tweet.screen_name = '@' + item['retweeted_status']['user']['screen_name'];
							tweet.profile_image = item['retweeted_status']['user']['profile_image_url'];
							tweet.retweet_count = item['retweeted_status']['retweet_count'];
							tweet.favorite_count = item['retweeted_status']['favorite_count'];
							tweet.is_retweet = true;
						} else {
							tweet.text = insertLinks(item['text']);
							tweet.real_name = item['user']['name'];
							tweet.screen_name = '@' + item['user']['screen_name'];
							tweet.profile_image = item['user']['profile_image_url'];
							tweet.retweet_count = item['retweet_count'];
							tweet.favorite_count = item['favorite_count'];
							tweet.is_retweet = false;
						}
						if('media' in item['entities']) {
							tweet.media = item['entities']['media'][0]['media_url'];
						}
						bricks.push(tweet);
					});
				}
				shuffle(bricks);
				console.log(JSON.stringify(bricks, null , 4));
				res.render('index', {'bricks' : bricks});
			});
	});
	
});

app.listen(app.getPort(), function() {
  app.log("Magic happens on port " + app.getPort());
});

