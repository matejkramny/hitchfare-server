
var should = require('../shouldbe'),
	models = require('../models'),
	mongoose = require('mongoose'),
	async = require('async');

exports.router = function (app) {
	app.post('/journeys', create)
		.get('/journeys', getAll)
		.get('/journeys/my', getMy)
		.get('/journeys/requests', getJourneysRequests)
		.get('/journeys/myrequests', getMyJourneyRequests)
		.get('/journeys/user/:user', getUserJourneys)
		.put('/journey/:journey_id', requestJoinJourney)
		.get('/journey/:journey_id/passengers', getJourneyPassengers)
		.get('/journey/:journey_id/requests', getJourneyPassengerRequests)
		.put('/journey/:journey_id/request/:journey_passenger_id', approvePassenger)
		.delete('/journey/:journey_id/request/:journey_passenger_id', disApprovePassenger)
}

function create (req, res) {
	console.log(req.body);

	var journey = {
		owner: req.user._id,
		name: should(req.body.name).be(String, true),
		car: should(req.body.car).be(String, true),
		isDriver: should(req.body.isDriver).be(Boolean),
		availableSeats: should(req.body.availableSeats).be(Number),
		start: {
			date: should(req.body.start.date).be(Number),
			location: should(req.body.start.location).be(String, true),
			lat: should(req.body.start.lat).be(Number),
			lng: should(req.body.start.lng).be(Number)
		},
		end: {
			date: should(req.body.end.date).be(Number),
			location: should(req.body.end.location).be(String, true),
			lat: should(req.body.end.lat).be(Number),
			lng: should(req.body.end.lng).be(Number)
		},
		price: should(req.body.price).be(Number)
	};

	if (journey.start.date != null) {
		journey.start.date = new Date(Math.floor(journey.start.date * 1000));
	}
	if (journey.end.date != null) {
		journey.end.date = new Date(Math.floor(journey.end.date * 1000));
	}

	try {
		journey.car = mongoose.Types.ObjectId(journey.car);
	} catch (e) {
		journey.car = null;
	}

	if (journey.car == null ||
		journey.isDriver == null ||
		journey.availableSeats == null ||
		journey.start.date == null ||
		journey.start.location == null ||
		//journey.start.lat == null ||
		//journey.start.lng == null ||
		journey.end.date == null ||
		journey.end.location == null ||
		//journey.end.lat == null ||
		//journey.end.lng == null ||
		journey.price == null) {
		console.log("error:", journey);

		return res.status(400).end();
	}

	(new models.Journey(journey)).save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function getAll (req, res) {
	models.Journey.find({
		owner: {
			$ne: req.user._id
		}
	})
	.sort('-start')
	.exec(function (err, journeys) {
		res.send(journeys).end();
	});
}

function getMy (req, res) {
	models.Journey.find({
		owner: req.user._id
	}, function (err, journeys) {
		res.send(journeys).end();
	});
}

function getUserJourneys (req, res) {
	models.Journey.find({
		owner: req._user._id
	}, function (err, journeys) {
		res.send(journeys).end();
	});
}

function requestJoinJourney (req, res) {
	// check if user already passenger
	models.JourneyPassenger.findOne({
		journey: req.journey._id,
		user: req.user._id
	}, function (err, existingPassenger) {
		if (err) throw err;

		if (existingPassenger) {
			return res.status(400).end();
		}

		var passenger = new models.JourneyPassenger({
			journey: req.journey._id,
			user: req.user._id
		});

		passenger.save(function (err) {
			if (err) throw err;

			res.status(201).end();
		});
	});
}

function getJourneyPassengers (req, res) {
	models.JourneyPassenger.find({
		journey: req.journey._id,
		didApprove: true,
		approved: true
	})
	.sort('-requested')
	.populate('user')
	.lean()
	.exec(function (err, passengers) {
		if (err) throw err;

		for (var i = 0; i < passengers.length; i++) {
			if (typeof passengers[i].requested == 'object') {
				passengers[i].requested = passengers[i].requested.getTime()
			}
		}

		res.send(passengers);
	});
}

function getJourneyPassengerRequests (req, res) {
	if (!req.journey.owner.equals(req.user._id)) {
		return res.status(403).end();
	}

	models.JourneyPassenger.find({
		journey: req.journey._id,
		didApprove: false
	})
	.sort('requested')
	.populate('user')
	.exec(function (err, passengers) {
		if (err) throw err;

		for (var i = 0; i < passengers.length; i++) {
			if (typeof passengers[i].requested == 'object') {
				passengers[i].requested = passengers[i].requested.getTime()
			}
		}

		res.send(passengers);
	});
}

function approvePassenger (req, res) {
	if (!req.journey.owner.equals(req.user._id)) {
		return res.status(403).end();
	}

	if (req.journeyPassenger.didApprove == true) {
		return res.status(400).end();
	}

	req.journeyPassenger.didApprove = true;
	req.journeyPassenger.approved = true;
	req.journeyPassenger.approvedWhen = new Date;
	req.journeyPassenger.save(function (err) {
		if (err) throw err;
		
		res.status(201).end();
	});
}

function disApprovePassenger (req, res) {
	if (!(req.journey.owner.equals(req.user._id) || req.user._id.equals(req.journeyPassenger.user))) {
		return res.status(403).end();
	}

	if (req.journeyPassenger.didApprove == true) {
		return res.status(400).end();
	}

	if (req.user._id.equals(req.journeyPassenger.user)) {
		// delete the request..
		req.journeyPassenger.remove(function (err) {
			if (err) throw err;

			res.status(204).end();
		});

		return;
	}

	req.journeyPassenger.didApprove = true;
	req.journeyPassenger.approved = false;
	req.journeyPassenger.approvedWhen = new Date;
	req.journeyPassenger.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function getJourneysRequests (req, res) {
	models.Journey.find({
		owner: req.user._id
	}, function (err, journeys) {
		var _ids = [];

		async.each(journeys, function (journey, cb) {
			_ids.push(journey._id);
			cb();
		}, function () {
			models.JourneyPassenger.find({
				journey: {
					$in: _ids
				},
				$or: [
					{
						didApprove: {
							$exists: false
						}
					},
					{
						didApprove: false
					}
				]
			})
			.populate('user journey')
			.lean()
			.sort('-requested')
			.exec(function (err, reqs) {
				if (err) throw err;

				for (var i = 0; i < reqs.length; i++) {
					if (typeof reqs[i].requested == 'object') {
						reqs[i].requested = reqs[i].requested.getTime()
					}
				}

				res.send(reqs);
			});

		});
	});
}

function getMyJourneyRequests (req, res) {
	models.JourneyPassenger.find({
		user: req.user._id,
		$or: [
			{
				didApprove: {
					$exists: false
				}
			},
			{
				didApprove: false
			}
		]
	})
	.populate('journey user')
	.lean()
	.exec(function (err, requests) {
		for (var i = 0; i < requests.length; i++) {
			if (typeof requests[i].requested == 'object') {
				requests[i].requested = requests[i].requested.getTime()
			}
		}

		res.send(requests);
	});
}
