var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	async = require('async'),
	models = require('./models'),
	should = require('./shouldbe'),
	session = require('express-session'),
	passport = require('passport'),
	MongoStore = require('connect-mongo')(session);

passport.serializeUser(function(user, done) {
	done(null, user._id);
});
passport.deserializeUser(function(id, done) {
	models.User.findOne({ _id: id }, done);
});

mongoose.connect(process.env.DB || 'mongodb://127.0.0.1/fareshout')

app.set('x-powered-by', false);

app.use(function (req, res, next) {
	console.log(req.headers);
	next();
})
app.use(require('morgan')('dev'));
app.use(require('body-parser').json({
	strict: true
}));
app.use(require('cookie-parser')());
app.use(session({
	secret: "afterlife",
	name: 'fareshout',
	store: new MongoStore({
		url: process.env.DB || 'mongodb://127.0.0.1/fareshout'
	}),
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

app.post('/register', function (req, res) {
	var picture = {};

	if (should(req.body.picture).be(Object) != null) {
		picture = req.body.picture;
	}

	var user = new models.User({
		email: should(req.body.email).be(String),
		first_name: should(req.body.email).be(String),
		id: should(req.body.id).be(String),
		last_name: should(req.body.last_name).be(String),
		name: should(req.body.name).be(String),
		picture: {
			url: should(picture.url).be(String),
			is_silhouette: should(picture.url).be(Boolean)
		}
	});

	if (user.email == null || user.id == null || user.name == null) {
		return res.status(400).end();
	}

	models.User.findOne({
		id: user.id
	}, function (err, preUser) {
		if (preUser != null) {
			req.login(preUser, function () {
				res.status(204).end()
			});
			
			return;
		}

		user.save(function (err) {
			req.login(user, function (err) {
				console.log(err)
				if (err != null) {
					res.status(500).end();
				} else {
					res.status(201).end();
				}
			});
		});
	});
});

app.use(function (req, res, next) {
	console.log(req.session)
	console.log(req.user)
	if (!req.user) {
		res.status(403).end();
		return;
	}

	next();
});

app.get('/penis', function (req, res) {
	res.send('yolo').end()
});

app.listen(process.env.PORT || 3000);
console.log("Listening to :", process.env.PORT || 3000)
