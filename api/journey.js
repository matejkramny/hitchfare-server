
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.post('/journeys', create)
		.get('/journeys', getAll);
}

function create (req, res) {
	var journey = new models.Journey({
		owner: req.user._id,
		car: should(req.body.car).be(String),
		driver: req.user._id,
		availableSeats: should(req.body.availableSeats).be(Number),
		start: {
			date: should(req.body.start.date).be(Number),
			lat: should(req.body.start.lat).be(Number),
			lng: should(req.body.start.lng).be(Number)
		},
		end: {
			date: should(req.body.end.date).be(Number),
			lat: should(req.body.end.lat).be(Number),
			lng: should(req.body.end.lng).be(Number)
		},
		price: should(req.body.price).be(Number)
	});

	if (journey.car == null ||
		journey.availableSeats == null ||
		journey.start.date == null ||
		journey.start.lat == null ||
		journey.start.lng == null ||
		journey.end.date == null ||
		journey.end.lat == null ||
		journey.end.lng == null ||
		journey.price == null) {
		return res.status(400).end();
	}

	journey.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function getAll (req, res) {
	models.Journey.find({
		owner: req.user._id
	}, function (err, journeys) {
		res.send(journeys).end();
	});
}
