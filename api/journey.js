
var should = require('../shouldbe'),
	models = require('../models'),
	mongoose = require('mongoose'),
	async = require('async'),
	server = require('../server'),
	apn = require('apn');

exports.router = function (app) {
	app.post('/journeys', create)
		.get('/journeys', getAll)
		.get('/journeys/my', getMy)
		.get('/journeys/onlyMy', getOnlyMy)
		.get('/journeys/requests', getJourneysRequests)
		.get('/journeys/myrequests', getMyJourneyRequests)
		.get('/journeys/user/:user', getUserJourneys)
		.get('/journeys/reviewable', getReviewableJourneys)
		.put('/journey/:journey_id', requestJoinJourney)
		.post('/journey/:journey_id', updateJourney)
		.delete('/journey/:journey_id', deleteJourney)
		.get('/journey/:journey_id/passengers', getJourneyPassengers)
		.get('/journey/:journey_id/requests', getJourneyPassengerRequests)
		.put('/journey/:journey_id/request/:journey_passenger_id', approvePassenger)
		.delete('/journey/:journey_id/request/:journey_passenger_id', disApprovePassenger)
		.put('/journey/:journey_id/request/:journey_passenger_id/review/:review_stars', rateJourney)
}

function create (req, res) {
	var journey = {
		owner: req.user._id,
		car: should(req.body.car).be(String, true),
		isDriver: should(req.body.isDriver).be(Boolean),
		availableSeats: should(req.body.availableSeats).be(Number),
		start: {
			date: should(req.body.start.date).be(Number),
			location: should(req.body.start.location).be(String, true)
		},
		end: {
			location: should(req.body.end.location).be(String, true)
		},
		price: should(req.body.price).be(Number)
	};

	if (journey.start.date != null) {
		journey.start.date = new Date(Math.floor(journey.start.date * 1000));
	}

	if (req.body.start.loc instanceof Array && req.body.start.loc.length == 2) {
		journey.start.loc = req.body.start.loc
	}
	if (req.body.end.loc instanceof Array && req.body.end.loc.length == 2) {
		journey.end.loc = req.body.end.loc
	}

	try {
		if (journey.car != null) {
			journey.car = mongoose.Types.ObjectId(journey.car);
		}
	} catch (e) {
		journey.car = null;
	}

	if ((journey.isDriver === true && journey.car == null) ||
		journey.isDriver == null ||
		(journey.isDriver === true && journey.availableSeats == null) ||
		journey.start.date == null ||
		journey.start.location == null ||
		journey.end.location == null ||
		(journey.isDriver == true && journey.price == null)) {
		console.log("error:", journey);

		return res.status(400).end();
	}

	(new models.Journey(journey)).save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function updateJourney (req, res) {
	var journey = req.journey;
	journey.car = should(req.body.car).be(String, true);
	journey.isDriver = should(req.body.isDriver).be(Boolean);
	journey.availableSeats = should(req.body.availableSeats).be(Number);
	journey.start = {
		date: should(req.body.start.date).be(Number),
		location: should(req.body.start.location).be(String, true)
	};
	journey.end = {
		location: should(req.body.end.location).be(String, true)
	};
	journey.price = should(req.body.price).be(Number);

	if (journey.start.date != null) {
		journey.start.date = new Date(Math.floor(journey.start.date * 1000));
	}

	if (req.body.start.loc instanceof Array && req.body.start.loc.length == 2) {
		journey.start.loc = req.body.start.loc
	}
	if (req.body.end.loc instanceof Array && req.body.end.loc.length == 2) {
		journey.end.loc = req.body.end.loc
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
		journey.end.location == null ||
		journey.price == null) {
		console.log("error:", journey);

		return res.status(400).end();
	}

	journey.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function getAll (req, res) {
	var now = new Date();
	now.setHours(0, 0, 0, 0);

	var q = {
		owner: {
			$ne: req.user._id
		},
		'start.date': {
			$gte: now.getTime()
		}
	};

	var isLocationQuery = false;

	if (typeof req.query.lat == 'string' && typeof req.query.lng == 'string' && typeof req.query.startLocation != 'string') {
		isLocationQuery = true;
		var lat = parseFloat(req.query.lat);
		var lng = parseFloat(req.query.lng);

		q['start.loc'] = {
			$near: [lng, lat],
			//$maxDistance: 20 / 111.12 // 10 km * meters * Pi / 180 = 10km in Radians
		}
	}

	if (typeof req.query.startLocation == 'string') {
		q['start.location'] = req.query.startLocation;
	}
	if (typeof req.query.endLocation == 'string') {
		q['end.location'] = req.query.endLocation;
	}

	if (typeof req.query.startDate == 'string') {
		var startDate = new Date(parseInt(req.query.startDate))
		q['start.date'] = {
			$gte: startDate.getTime(),
			$lt: startDate.getTime() + 86400 * 1000 // + 1 day
		}
	}

	var query = models.Journey.find(q)

	if (isLocationQuery == false) {
		query = query.sort('-start.date');
	}

	query
	.populate('owner car')
	.exec(function (err, journeys) {
		if (err) throw err;

		res.send(journeys).end();
	});
}

function getMy (req, res) {
	models.JourneyPassenger.find({
		user: req.user._id,
		approved: true,
		didApprove: true
	}, function (err, passengers) {
		if (err) throw err;

		var journeyIds = [];
		for (var i = 0; i < passengers.length; i++) {
			journeyIds.push(passengers[i].journey);
		}

		models.Journey.find({
			$or: [
				{
					owner: req.user._id
				},
				{
					_id: {
						$in: journeyIds
					}
				}
			]
		})
		.sort('-start.date')
		.populate('owner car')
		.exec(function (err, journeys) {
			if (err) throw err;

			res.send(journeys);
		});
	});
}

function getOnlyMy (req, res) {
	models.Journey.find({
			owner: req.user._id
		})
		.sort('-start.date')
		.populate('owner car')
		.exec(function (err, journeys) {
			if (err) throw err;

			res.send(journeys);
		});
}

function getUserJourneys (req, res) {
	models.Journey.find({
		owner: req._user._id
	})
	.sort('-start.date')
	.populate('owner car')
	.exec(function (err, journeys) {
		res.send(journeys).end();
	});
}

function requestJoinJourney (req, res) {
	// when journey is not in driver mode and the body doesn't request the requester's journey id
	if (req.journey.isDriver === false && !req.body.journey_id) {
		return res.status(400).end();
	}

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

		if (req.journey.isDriver === false) {
			passenger.passengerJourney = req.body.journey_id;
		}

		passenger.save(function (err) {
			if (err) throw err;

			res.status(201).end();
		});

		// push a notification to the owner of the journey
		req.journey.populate('owner', function (err) {
			if (err) throw err;

			models.Notification.find({
				receiver: req.journey.owner._id,
				read: false
			}).count(function (err, unread) {
				models.UserDevice.find({
					user: req.journey.owner._id
				}).exec(function (err, devices) {
					if (err) throw err;
					if (devices.length == 0) return;

					var notif = new apn.Notification();
					notif.expiry = Math.floor(Date.now() / 1000) + 86400;
					notif.badge = unread;
					notif.sound = "ping.aiff";
					notif.alert = req.user.name + " Wants to join your journey!";
					notif.payload = {
						journey: req.journey._id,
						requester: req.user._id,
						action: 'journeyRequest'
					};

					for (var i = 0; i < devices.length; i++) {
						var device = new apn.Device(devices[i].token)
						server.apn.pushNotification(notif, device);
					}
				});
			});
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
	.populate('user journey')
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

	if (req.journey.isDriver === false) {
		// Do magic. Reverse this request the other way..
		models.Journey.findOne({
			owner: req.journeyPassenger.user,
			_id: req.journeyPassenger.passengerJourney
		}, function (err, journey) {
			if (err || !journey) {
				console.log(req.journeyPassenger)
				return res.status(400).end();
			}

			var passengerRequest = new models.JourneyPassenger({
				didApprove: true,
				approved: true,
				approvedWhen: new Date,
				user: req.user._id,
				journey: journey._id
			});

			async.parallel([
				function (cb) {
					passengerRequest.save(cb);
				},
				function (cb) {
					models.JourneyPassenger.remove({
						_id: req.journeyPassenger._id
					}, cb);
				},
				function (cb) {
					models.Journey.remove({
						_id: req.journey._id
					}, cb);
				}
			], function (err) {
				if (err) throw err;

				// reduce number of seats..
				models.Journey.update({
					_id: journey._id
				}, {
					$inc: {
						availableSeats: -1
					}
				}, function (err) {
					if (err) throw err;
				});

				res.status(204).end();
			});
		});

		return;
	}

	if (req.journey.availableSeats <= 0) {
		return res.status(400).end();
	}

	req.journeyPassenger.didApprove = true;
	req.journeyPassenger.approved = true;
	req.journeyPassenger.approvedWhen = new Date;
	req.journeyPassenger.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});

	models.Journey.update({
		_id: req.journey._id
	}, {
		$inc: {
			availableSeats: -1
		}
	}, function (err) {
		if (err) throw err;
	});

	req.journey.populate('owner', function (err) {
		models.Notification.find({
			receiver: req.journeyPassenger.user,
			read: false
		}).count(function (err, unread) {
			models.UserDevice.find({
				user: req.journeyPassenger.user
			}).exec(function (err, devices) {
				if (err) throw err;
				if (devices.length == 0) return;

				var notif = new apn.Notification();
				notif.expiry = Math.floor(Date.now() / 1000) + 86400;
				notif.badge = unread;
				notif.sound = "ping.aiff";
				notif.alert = req.journey.owner.name + " Accepted your journey request!";
				notif.payload = {
					journey: req.journey._id,
					requester: req.user._id,
					action: 'requestApprove'
				};

				for (var i = 0; i < devices.length; i++) {
					var device = new apn.Device(devices[i].token)
					server.apn.pushNotification(notif, device);
				}
			});
		});
	});
}

function disApprovePassenger (req, res) {
	if (!(req.journey.owner.equals(req.user._id) || req.user._id.equals(req.journeyPassenger.user))) {
		return res.status(403).end();
	}

	if (req.journeyPassenger.didApprove == true) {
		// Remove the passenger.

		models.Journey.update({
			_id: req.journey._id
		}, {
			$inc: {
				availableSeats: 1
			}
		}, function (err) {
			if (err) throw err;
		});

		if (req.user._id.equals(req.journeyPassenger.user)) {
			sendRejectRequestNotification(req.user, req.journey.owner, " Is no longer passenger on your journey.", req.journey);
		} else {
			sendRejectRequestNotification(req.user, req.journeyPassenger.user, " Removed your from passenger list.", req.journey);
		}

		req.journeyPassenger.remove(function (err) {
			if (err) throw err;

			res.status(204).end();
		});

		return;
	}

	if (req.user._id.equals(req.journeyPassenger.user)) {
		// delete the request..
		sendRejectRequestNotification(req.user, req.journey.owner, " Cancelled the journey request.", req.journey);

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

	req.journeyPassenger.populate('user', function (err) {
		sendRejectRequestNotification(req.user, req.journeyPassenger.user._id, " Rejected your journey request.", req.journey);
	});
}

function sendRejectRequestNotification (sender, receiver, message, journey) {
	models.Notification.find({
		receiver: receiver,
		read: false
	}).count(function (err, unread) {
		models.UserDevice.find({
			user: receiver
		}).exec(function (err, devices) {
			if (err) throw err;
			if (devices.length == 0) return;

			var notif = new apn.Notification();
			notif.expiry = Math.floor(Date.now() / 1000) + 86400;
			notif.badge = unread;
			notif.sound = "ping.aiff";
			notif.alert = sender.name + message;
			notif.payload = {
				journey: journey._id,
				action: 'requestReject'
			};

			for (var i = 0; i < devices.length; i++) {
				var device = new apn.Device(devices[i].token)
				server.apn.pushNotification(notif, device);
			}
		});
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
	.exec(function (err, requests) {
		console.log(requests);

		async.each(requests, function (request, cb) {
			request.journey.populate('owner', function (err) {
				cb(err);
			});
		}, function (err) {
			var reqs = []

			for (var i = 0; i < requests.length; i++) {
				reqs.push(requests[i].toObject());

				if (typeof reqs[i].requested == 'object') {
					reqs[i].requested = reqs[i].requested.getTime()
				}
			}

			res.send(reqs);
		});
	});
}

function deleteJourney (req, res) {
	if (!req.journey.owner.equals(req.user._id)) {
		return res.status(403).end();
	}

	// Delete all journey reqs
	models.JourneyPassenger.remove({
		journey: req.journey._id
	}, function (err) {
		if (err) throw err;
	});

	req.journey.remove(function (err) {
		if (err) throw err;

		res.status(204).end();
	});
}

function getReviewableJourneys (req, res) {
	var now = (new Date()).getTime()
	var dayAgo = (new Date(now - 86400 * 1000)).getTime()

	models.JourneyPassenger.find({
		user: req.user._id,
		approved: true,
		didApprove: true,
		$or: [
			{
				rated: {
					$exists: false
				}
			},
			{
				rated: false
			}
		]
	})
	.populate({
		path: 'journey',
		match: {
			'start.date': {
				$lte: dayAgo
			}
		}
	})
	.populate('user')
	.exec(function (err, passengers) {
		if (err) throw err;

		var ps = [];

		for (var i = 0; i < passengers.length; i++) {
			if (passengers[i].journey == null) {
				continue;
			}

			ps.push(passengers[i]);
		}

		async.each(ps, function (p, cb) {
			p.journey.populate('owner', cb)
		}, function (err) {
			if (err) throw err;
			res.send(ps);
		});
	});
}

function rateJourney (req, res) {
	if (req.journeyPassenger.user.equals(req.user._id) == false || req.journeyPassenger.rated == true) {
		return res.status(400).end();
	}

	var stars = req.params.review_stars;
	if (stars < 1 || stars > 5) {
		return res.status(400).end();
	}

	req.journeyPassenger.rating = stars;
	req.journeyPassenger.rated = true;
	req.journeyPassenger.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}
