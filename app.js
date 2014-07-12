var express = require('express'),
	stylus = require('stylus'),
	nib = require('nib');

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
	return stylus(str).set('filename', path).use(nib());
}
app.use(stylus.middleware({ 
	src: __dirname + '/public', 
	compile: compile 
}));

app.get('/', function(req,res) {
	res.render('index',{'name' : 'Jackie Kwan'});
});

app.listen(app.getPort(), function() {
  app.log("Magic happens on port " + app.getPort());
});
