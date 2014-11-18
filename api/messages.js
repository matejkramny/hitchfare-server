
var should = require('../shouldbe'),
	models = require('../models')

exports.router = function (app) {
	app.get('/messages', getMessageList)
		.get('/messages/:message_list', getMessages)
		.put('/messages/:user', createList)
		.post('/message/:message_list', sendMessage)
}

function getMessages (req, res) {
	if (!(req.messageList.sender.equals(req.user._id) || req.messageList.receiver.equals(req.user._id))) {
		return res.status(403).end();
	}

	models.Message.find({
		list: req.messageList._id
	}).exec(function (err, messages) {
		if (err) throw err;

		res.send(messages);
	});
}

function getMessageList (req, res) {
	models.MessageList.find({
		$or: [
			{
				sender: req.user._id
			},
			{
				receiver: req.user._id
			}
		]
	}).populate('sender receiver').exec(function (err, list) {
		if (err) throw err;

		res.send(list);
	});
}

function sendMessage (req, res) {
	if (!(req.messageList.sender.equals(req.user._id) || req.messageList.receiver.equals(req.user._id))) {
		return res.status(403).end();
	}

	(new models.Message(req.body)).save(function (err) {
		if (err != null) {
			throw err;
		}

		res.status(201).end();
	})
}

function createList (req, res) {
	new models.MessageList({
		sender: req.user._id,
		receiver: req._user._id
	}).save(function (err) {
		if (err) throw err;

		res.status(201).end();
	});
}
