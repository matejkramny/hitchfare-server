var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	async = require('async'),
	models = require('./models'),
	should = require('./shouldbe'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	passport = require('passport'),
	MongoStore = require('connect-mongo')(session),
	apn = require('apn'),
	fs = require('fs');

var dir = 'development';
if (process.env.NODE_ENV == 'production') {
	dir = 'production';
}

var apnConn = new apn.Connection({
	cert: __dirname + "/certs/" + dir + "/cert.pem",
	key: __dirname + "/certs/" + dir + "/key.pem",
});
exports.apn = apnConn;

exports.app = app;

passport.serializeUser(function(user, done) {
	done(null, user._id);
});
passport.deserializeUser(function(id, done) {
	models.User.findOne({ _id: id }, done);
});

mongoose.connect(process.env.DB || 'mongodb://127.0.0.1/fareshout')

app.set('x-powered-by', false);

app.use(require('morgan')('dev'));
app.use(require('body-parser').json({
	strict: true
}));
app.use(require('cookie-parser')());
app.use(session({
	secret: "afterlife",
	name: 'fareshout',
	proxy: true,
	saveUninitialized: false,
	resave: false,
	cookie: {
		secure: false,
		//maxAge: 604800000
	},
	store: new MongoStore({
		db: mongoose.connection.db
	})
}));

app.use(passport.initialize());
app.use(passport.session());

require('./api/register').router(app);
app.get('/terms', function (req, res) {
	fs.createReadStream(__dirname + "/phempto_terms.html").pipe(res);
})

app.use(function (req, res, next) {
	if (!req.user) {
		res.status(403).end();
		return;
	}

	next();
});

require('./params')(app);

['car', 'journey', 'messages', 'me'].forEach(function (f) {
	require('./api/'+f).router(app);
});

app.listen(process.env.PORT || 3000);
console.log("Listening to :", process.env.PORT || 3000)
