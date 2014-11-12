
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.get('/me', getSelf);
}

function getSelf (req, res) {
	res.send(req.user).end();
}
