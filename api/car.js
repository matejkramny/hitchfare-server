
var should = require('../shouldbe'),
	models = require('../models'),
	formidable = require('formidable'),
	aws = require('aws-sdk'),
	util = require('util'),
	fs = require('fs'),
	s3 = new aws.S3(),
	async = require('async');

aws.config.update({
	region: 'us-west-1'
});

exports.router = function (app) {
	app.post('/cars', createCar)
		.get('/cars', getAll)
		.put('/car/:car_id', updateCar)
		.put('/car/:car_id/image', uploadImage)
		.delete('/car/:car_id', deleteCar)
}

function createCar (req, res) {
	var car = new models.Car({
		name: should(req.body.name).be(String),
		description: should(req.body.description).be(String),
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
	}).sort('-_id').exec(function (err, cars) {
		res.send(cars).end();
	});
}

function updateCar (req, res) {
	req.car.name = should(req.body.name).be(String);
	req.car.seats = should(req.body.seats).be(Number);
	req.car.description = should(req.body.description).be(String);

	if (req.car.name == null ||
		req.car.seats == null ||
		req.car.seats > 9 ||
		req.car.seats <= 0) {
		return res.status(400).end();
	}

	req.car.save(function (err) {
		if (err) throw err;

		res.send({
			_id: req.car._id
		}).end();
	});
}

function uploadImage (req, res) {
	var form = formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		var path;
		try {
			path = files.picture.path;
		} catch (e) {
			return res.status(400).end();
		}

		async.parallel([
			function (cb) {
				models.Car.update({
					_id: req.car._id
				}, {
					$set: {
						url: 'http://fareshout-public.s3-website-us-east-1.amazonaws.com/' + req.car._id + '.png'
					}
				}, function (err) {
					if (err) throw err;

					cb(null);
				});
			},
			function (cb) {
				fs.readFile(path, function (err, image) {
					var data = {
						Bucket: "fareshout-public",
						Key: req.car._id + ".png",
						Body: image,
						ContentType: "image/png",
						ACL: 'public-read'
					};
					s3.putObject(data, function(err, res) {
						console.log("done");
						cb(err);
					});
				});
			}
		], function (err) {
			if (err) {
				console.log(err);
				return res.status(500).end();
			}

			res.status(200).end();
		});
	});
}

function deleteCar (req, res) {
	if (!req.car.owner.equals(req.user._id)) {
		return res.status(403).end();
	}

	req.car.remove(function (err) {
		if (err) throw err;

		res.status(204).end();
	});
}
