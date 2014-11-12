
var app = require('../server')
	, request = require('supertest').agent(app.app)
	, should = require('should')
	, models = require('../models')
	, async = require('async')
	, login = require('./fixtures/login');

describe('Journeys', function() {
	before(function (done) {
		login(request, done);
	});

	it('should create a journey', function (done) {
		request
		.post('/cars')
		.accept('json')
		.send({
			name: 'IQ',
			seats: 4
		})
		.expect(201)
		.end(function (err, res) {
			should(err).be.null;

			request.get('/cars').accept('json').end(function (err, res) {
				should(err).be.null;

				var car = res.body[0]._id;

				request
				.post('/journeys')
				.accept('json')
				.send({
					car: car,
					availableSeats: 3,
					start: {
						date: Date.now(),
						lat: -1,
						lng: 15
					},
					end: {
						date: Date.now(),
						lat: -1,
						lng: 15
					},
					price: 10
				})
				.expect(201)
				.end(function (err, res) {
					should(err).be.null;

					done();
				});
			});
		});
	});

	it('should get journeys', function (done) {
		request
			.get('/journeys')
			.accept('json')
			.expect(200)
			.end(function (err, res) {
				should(err).be.null;

				res.body.should.lengthOf(1);
				console.log(res.body);
				done();
			});
	});
});
