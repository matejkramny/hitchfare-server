
var app = require('../server')
	, request = require('supertest').agent(app.app)
	, should = require('should')
	, models = require('../models')
	, async = require('async')
	, login = require('./fixtures/login');

describe('Cars', function() {
	before(function (done) {
		login(request, done);
	});
	
	it('should create a car', function (done) {
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

				done();
			});
	});

	it('should get cars', function (done) {
		request
			.get('/cars')
			.accept('json')
			.expect(200)
			.end(function (err, res) {
				should(err).be.null;

				res.body.should.lengthOf(1);
				done();
			});
	});
});
