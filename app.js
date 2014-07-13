var express = require('express'),
	stylus = require('stylus'),
	nib = require('nib'),
	fs = require('fs'),
	request = require('request');

var app = express();

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

app.get('/', function(req,res) {
	photos = []
	request('https://api.instagram.com/v1/users/23362758/media/recent?client_id=c836878d8188457799e29b06d9205263&count=5', function (err, resp, body) {
		if (!err && resp.statusCode == 200) {
			instagram = JSON.parse(body);
			instagram['data'].forEach(function(item){
				photos.push(String(item['images']['thumbnail']['url']));
			});
		}
		res.render('index', {'photos' : photos});
	});
	
});

app.listen(app.getPort(), function() {
  app.log("Magic happens on port " + app.getPort());
});
