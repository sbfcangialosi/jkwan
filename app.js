var express = require('express'),
	stylus = require('stylus'),
	nib = require('nib'),
	fs = require('fs'),
	request = require('request'),
	util = require('util'),
	Twit = require('twit');

var app = express();

var T, access_token;

function readSecrets() {
    fs.readFile('secrets/twitter', 'utf8', function(err,data) {
        if(err) {
            return console.log(err);
        }
        data = data.toString().split("\n");
        T = new Twit({
            consumer_key : data[0],
            consumer_secret : data[1],
            access_token : data[2],
            access_token_secret : data[3]
        });
    });

    fs.readFile('secrets/instagram', 'utf8', function(err,data) {
        if (err) {
            return console.log(err);
        }
        access_token = data.toString().replace(/\n/g,'');
    });
}

readSecrets();

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

function removeLinks(tweet_text) {
	new_text = "";
	tweet_text.split(" ").forEach(function(word) {
		if (word.indexOf("http://t.co") == -1) {
			new_text += word + " ";
		}
	});
	return new_text.trim();
}

function insertTags(tweet_text) {
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
    if (!T || !access_token) {
        readSecrets();
    }
	request('https://api.instagram.com/v1/users/23362758/media/recent?access_token='+access_token+'&count=25', function (err, resp, body) {
		if (!err && resp.statusCode == 200) {
			instagram = JSON.parse(body);
			instagram['data'].forEach(function(item){

				photo = {
					'thumbnail' : item['images']['standard_resolution']['url'],
					'link' : item['link'],
					'type' : 'insta',
					'brick_id' : getRandomInRange(1,5)
				};
				bricks.push(photo);
			});
		}
		T.get('/statuses/user_timeline',
			{screen_name:  'eternallyjackie',
			count: 20},
			function(err, data, resp) {
				if(!err && resp.statusCode == 200) {
					tweets = []
					data.forEach(function(item) {
						tweet = {}
						tweet.type = 'tweet'
						tweet.brick_id = getRandomInRange(1,5);
						if('retweeted_status' in item) {
							tweet.text = removeLinks(insertTags(item['retweeted_status']['text']));
							tweet.profile_image = item['retweeted_status']['user']['profile_image_url'];
							tweet.is_retweet = true;
						} else {
							tweet.text = removeLinks(insertTags(item['text']));
							tweet.profile_image = item['user']['profile_image_url'];
							tweet.is_retweet = false;
						}
						if(!('media' in item['entities'])) {
							bricks.push(tweet);
						}

					});
				}
				shuffle(bricks);
				res.render('index', {'bricks' : bricks});
			}
		);
	});

});

app.listen(app.getPort(), function() {
  app.log("Magic happens on port " + app.getPort());
});

