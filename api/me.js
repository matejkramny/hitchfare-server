
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.get('/me', getSelf)
		.get('/user/:user', getUser)
		.put('/device/:token', addDevice)
}

function getSelf (req, res) {
	res.send(req.user).end();
}

function addDevice (req, res) {
	var token = req.params.token;

	models.UserDevice.findOne({
		user: req.user._id,
		token: token
	}, function (err, device) {
		if (err) throw err;

		if (device == null) {
			device = new models.UserDevice({
				token: token,
				user: req.user._id
			});
			device.save();
		}

		res.status(201).end();
	});
}

function getUser (req, res) {
	res.send(req._user);
}
