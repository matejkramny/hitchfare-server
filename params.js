
var models = require('./models'),
	mongoose = require('mongoose');

module.exports = function (app) {
	app.param('user', function (req, res, next, id) {
		try {
			id = mongoose.Types.ObjectId(id);
		} catch (e) {
			return next("Invalid ID");
		}

		models.User.findOne({
			_id: id
		}, function (err, user) {
			if (err != null) {
				throw err;
			}

			req._user = user;
			next();
		});
	});

	app.param('message_list', function (req, res, next, id) {
		try {
			id = mongoose.Types.ObjectId(id);
		} catch (e) {
			return next("Invalid ID");
		}

		models.MessageList.findOne({
			_id: id
		}, function (err, obj) {
			if (err != null) {
				throw err;
			}

			req.messageList = obj;
			next();
		});
	});

	app.param('journey_id', function (req, res, next, id) {
		try {
			id = mongoose.Types.ObjectId(id);
		} catch (e) {
			return next("Invalid ID");
		}

		models.Journey.findOne({
			_id: id
		}, function (err, journey) {
			if (err) throw err;

			req.journey = journey;

			next();
		});
	});
}
