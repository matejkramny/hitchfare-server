
var should = require('../shouldbe'),
	models = require('../models'),
	mongoose = require('mongoose');

exports.router = function (app) {
	app.post('/journeys', create)
		.get('/journeys', getAll)
		.get('/journeys/my', getMy);
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
	}, function (err, journeys) {
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
