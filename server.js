var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	async = require('async'),
	models = require('./models'),
	should = require('./shouldbe'),
	session = require('express-session'),
	passport = require('passport'),
	MongoStore = require('connect-mongo')(session);

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
	}
}));

app.use(passport.initialize());
app.use(passport.session());

require('./api/register').router(app);

app.use(function (req, res, next) {
	if (!req.user) {
		res.status(403).end();
		return;
	}

	next();
});

['car', 'journey'].forEach(function (f) {
	require('./api/'+f).router(app);
});

app.listen(process.env.PORT || 3000);
console.log("Listening to :", process.env.PORT || 3000)
