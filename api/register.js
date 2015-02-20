
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.post('/register', register)
		.get('/logout', logout);
}

function register (req, res) {
	var picture = {};

	if (should(req.body.picture).be(Object) != null) {
		picture = req.body.picture;
	}

	var user = new models.User({
		email: should(req.body.email).be(String),
		first_name: should(req.body.first_name).be(String),
		id: should(req.body.id).be(String),
		last_name: should(req.body.last_name).be(String),
		name: should(req.body.name).be(String),
		picture: {
			url: should(picture.url).be(String),
			is_silhouette: should(picture.url).be(Boolean)
		},
		userFriends: req.body.userFriends
	});

	if (user.email == null || user.id == null || user.name == null) {
		return res.status(400).end();
	}

	models.User.findOne({
		id: user.id
	}, function (err, preUser) {
		if (preUser != null) {
			preUser.email = req.body.email;
			preUser.first_name = req.body.first_name;
			preUser.id = req.body.id;
			preUser.last_name = req.body.last_name;
			preUser.name = req.body.name;
			preUser.picture = {
				url: picture.url,
				is_silhouette: picture.url
			};
			preUser.userFriends = req.body.userFriends;
			preUser.save();

			req.login(preUser, function () {
				res.send({
					_id: preUser._id
				});
			});

			return;
		}

		user.save(function (err) {
			req.login(user, function (err) {
				console.log(err)
				if (err != null) {
					res.status(500).end();
				} else {
					res.send({
						_id: user._id
					});
				}
			});
		});
	});
}

function logout (req, res) {
	req.logout();
	req.session.destroy();

	res.status(204).end();
}
