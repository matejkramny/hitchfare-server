
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.get('/me', getSelf)
		.get('/user/:user', getUser)
		.put('/device/:token', addDevice)
		.get('/rating', getRating)
		.get('/rating/:journey_id', getRatingForJourney);
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
		owner: req.user._id
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

}
