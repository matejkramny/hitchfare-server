
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.get('/me', getSelf)
		.get('/user/:user', getUser)
		.get('/user/:user/mutualFriends', getMutualFriends)
		.get('/user/:user/cars', getUserCars)
		.put('/device/:token', addDevice)
		.get('/rating/user/:user', getRating)
		.get('/rating/journey/:journey_id', getRatingForJourney);
}

function getSelf (req, res) {
	res.send(req.user).end();
}

function addDevice (req, res) {
	var token = req.params.token;

	models.UserDevice.findOne({
		user: req.user._id,
		token: token
	}, function (err, device) {
		if (err) throw err;

		if (device == null) {
			device = new models.UserDevice({
				token: token,
				user: req.user._id
			});
			device.save();
		}

		res.status(201).end();
	});
}

function getUser (req, res) {
	res.send(req._user);
}

function getRating (req, res) {
	models.Journey.find({
		owner: req._user._id
	})
	.select('_id')
	.exec(function (err, journeys) {
		if (err) throw err;

		var _ids = [];

		for (var i = 0; i < journeys.length; i++) {
			_ids.push(journeys[i]._id);
		}

		models.JourneyPassenger.find({
			journey: {
				$in: _ids
			},
			approved: true,
			didApprove: true,
			rated: true
		})
		.select('rating')
		.exec(function (err, ratings) {
			if (err) throw err;

			var avSum = 0;
			for (var i = 0; i < ratings.length; i++) {
				avSum += ratings[i].rating;
			}

			res.send({
				average: avSum / ratings.length
			});
		});
	});
}

function getRatingForJourney (req, res) {
	models.JourneyPassenger.find({
		journey: req.journey._id,
		approved: true,
		didApprove: true,
		rated: true
	})
	.select('rating')
	.exec(function (err, ratings) {
		if (err) throw err;

		var avSum = 0;
		for (var i = 0; i < ratings.length; i++) {
			avSum += ratings[i].rating;
		}

		res.send({
			average: avSum / ratings.length
		});
	});
}

function getMutualFriends (req, res) {
	if (req.user.userFriends == null || req._user.userFriends == null) {
		return res.send([]);
	}

	// check that user has journeys with the user in the past
	models.Journey.find({
		owner: req._user._id
	}).select('_id').lean().exec(function (err, journeys) {
		var ids = [];
		for (var i = 0; i < journeys.length; i++) {
			ids.push(journeys[i]._id);
		}

		models.JourneyPassenger.findOne({
			user: req.user._id,
			approved: true,
			didApprove: true,
			journey: {
				$in: ids
			}
		}).select('').lean().exec(function (err, journey) {
			if (err || !journey) {
				// not yet a journey..
				return res.send([]).end();
			}

			var mutual = [];
			for (var i = 0; i < req.user.userFriends.length; i++) {
				for (var x = 0; x < req._user.userFriends.length; x++) {
					if (req.user.userFriends[i] == req._user.userFriends[x]) {
						mutual.push(req.user.userFriends[i]);
						break;
					}
				}
			}

			models.User.find({
				id: {
					$in: mutual
				}
			})
			.exec(function (err, friends) {
				if (err) throw err;

				res.send(friends);
			});
		});
	});
}

function getUserCars (req, res) {
	models.Car.find({
		owner: req._user._id
	}).sort('-_id').exec(function (err, cars) {
		res.send(cars).end();
	});
}
