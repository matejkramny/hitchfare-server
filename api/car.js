
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.post('/cars', createCar)
		.get('/cars', getAll)
		.put('/car/:car_id', updateCar)
		.put('/car/:car_id/image', uploadImage)
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

		res.send({
			_id: car._id
		}).end();
	});
}

function getAll (req, res) {
	models.Car.find({
		owner: req.user._id
	}, function (err, cars) {
		res.send(cars).end();
	});
}

function updateCar (req, res) {
	
}

function uploadImage (req, res) {
	res.status(500).end();
}
