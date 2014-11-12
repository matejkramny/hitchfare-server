
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.post('/cars', createCar)
		.get('/cars', getAll);
}

function createCar (req, res) {
	var car = new models.Car({
		name: should(req.body.name).be(String),
		owner: req.user._id,
		seats: should(req.body.seats).be(Number)
	});

	console.log(req.body);
	
	if (car.name == null ||
		car.seats == null ||
		car.seats > 9 ||
		car.seats <= 0) {
		return res.status(400).end();
	}

	car.save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}

function getAll (req, res) {
	models.Car.find({
		owner: req.user._id
	}, function (err, cars) {
		res.send(cars).end();
	});
}
