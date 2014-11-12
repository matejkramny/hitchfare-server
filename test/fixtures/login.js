
var async = require('async'),
	models = require('../../models'),
	should = require('should');

var user = {
	email: "test@matej.me",
	first_name: "tester",
	id: "123456789",
	last_name: "test",
	name: "Tester test",
	picture: {
		url: "http://img4.wikia.nocookie.net/__cb20130407031721/tmnt/images/9/9d/Megan-Fox-14.jpg",
		is_silhouette: false
	}
}

module.exports = function (request, done) {
	async.waterfall([
		function (done) {
			models.User.remove({}, function (e) { done(e) });
		},
		function (done) {
			models.Message.remove({}, function (e) { done(e) });
		},
		function (done) {
			models.Car.remove({}, function (e) { done(e) });
		},
		function (done) {
			models.Journey.remove({}, function (e) { done(e) });
		},
		function (done) {
			models.JourneyPassenger.remove({}, function (e) { done(e) });
		},
		function (done) {
			request.get('/logout').end(function (e) { done(e) });
		},
		function registerUser (done) {
			request
			.post('/register')
			.accept('json')
			.send(user)
			.end(function (err, res) {
				if (!(res.status == 201 || res.status == 204)) {
					err = "Failed"
				}

				done(err);
			});
		}
	], function (err) {
		if (err) return done(err);

		models.User.findOne({
			id: user.id
		}, done);
	});
}
