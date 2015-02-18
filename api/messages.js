
var should = require('../shouldbe'),
	models = require('../models'),
	server = require('../server'),
	apn = require('apn'),
	async = require('async');

exports.router = function (app) {
	app.get('/messages', getMessageLists)
		.get('/messages/list/:message_list', getMessageList)
		.get('/messages/:message_list', getMessages)
		.put('/messages/:message_list/read', setReadThread)
		.put('/messages/:user', createList)
		.post('/message/:message_list', sendMessage)
		.delete('/message/:message_list', deleteMessageList);
}

function getMessages (req, res) {
	if (!(req.messageList.sender.equals(req.user._id) || req.messageList.receiver.equals(req.user._id))) {
		return res.status(403).end();
	}

	models.Message.find({
		list: req.messageList._id
	})
	.lean()
	.sort('sent')
	.exec(function (err, messages) {
		if (err) throw err;

		for (var i = 0; i < messages.length; i++) {
			messages[i].sent = (new Date(messages[i].sent)).getTime() / 1000;
		}

		res.send(messages);
	});
}

function getMessageLists (req, res) {
	models.MessageList.find({
		$or: [
			{
				sender: req.user._id
			},
			{
				receiver: req.user._id
			}
		]
	})
	.populate('sender receiver')
	.lean()
	.exec(function (err, list) {
		if (err) throw err;

		async.each(list, function (list, cb) {
			models.Message.findOne({
				list: list._id
			})
			.sort('-sent')
			.lean()
			.exec(function (err, message) {
				if (err || !message) {
					list.lastMessage = null;
				} else {
					list.lastMessage = message;
					list.lastMessage.sent = (new Date(list.lastMessage.sent)).getTime() / 1000;
				}

				cb();
			});
		}, function (err) {
			if (err) throw err;

			list.sort(function (a, b) {
				if (a.lastMessage == null && b.lastMessage == null) {
					return 0;
				}

				if (a.lastMessage == null) {
					return 1;
				} else if (b.lastMessage == null) {
					return -1;
				}

				if (a.lastMessage.sent < b.lastMessage.sent) {
					return 1;
				}
				if (a.lastMessage.sent > b.lastMessage.sent) {
					return -1;
				}

				return 0;
			});

			res.send(list);
		});
	});
}

function getMessageList (req, res) {
	req.messageList.populate('sender receiver', function (err) {
		if (err) throw err;

		models.Message.findOne({
			list: req.messageList._id
		})
		.lean()
		.sort('-sent')
		.exec(function (err, message) {
			if (err || !message) {
				req.messageList.lastMessage = null;
			} else {
				req.messageList.lastMessage = message;
				req.messageList.lastMessage.sent = (new Date(req.messageList.lastMessage.sent)).getTime() / 1000;
			}

			res.send(req.messageList);
		});
	});
}

function sendMessage (req, res) {
	if (!(req.messageList.sender.equals(req.user._id) || req.messageList.receiver.equals(req.user._id))) {
		return res.status(403).end();
	}

	var message = new models.Message(req.body)
	message.sent = new Date();
	message.save(function (err) {
		if (err != null) {
			throw err;
		}

		// Send push to recipient
		var recipient = req.messageList.sender
		if (req.messageList.sender.equals(req.user._id)) {
			recipient = req.messageList.receiver
		}

		var notification = {
			message: message._id,
			list: req.messageList._id,
			sender: req.user._id,
			receiver: recipient,
			read: false
		};
		sendNotification(notification, req.user, message);

		res.status(201).end();
	});
}

function createList (req, res) {
	var list = new models.MessageList({
		sender: req.user._id,
		receiver: req._user._id
	});

	list.save(function (err) {
		if (err) throw err;

		list.populate('sender receiver', function (err) {
			if (err) throw err;

			res.send(list);
		});
	});
}

function sendNotification (notification, user, message) {
	models.Notification.find({
		receiver: notification.receiver,
		read: false
	}).count(function (err, unread) {
		if (err) throw err;

		models.UserDevice.find({
			user: notification.receiver
		}).exec(function (err, devices) {
			if (err) throw err;
			if (devices.length == 0) return;

			var notif = new apn.Notification();
			notif.expiry = Math.floor(Date.now() / 1000) + 86400;
			notif.badge = unread + 1;
			notif.sound = "ping.aiff";
			notif.alert = user.name + ": " + message.message;
			notif.payload = {
				notification: notification._id,
				list: notification.list,
				message: notification.message,
				sender: notification.sender,
				action: 'newMessage'
			};

			for (var i = 0; i < devices.length; i++) {
				var notModel = new models.Notification(notification);
				notModel.device = devices[i]._id
				notModel.save();

				var device = new apn.Device(devices[i].token)
				server.apn.pushNotification(notif, device);
			}
		});
	});
}

function deleteMessageList (req, res) {
	if (!(req.messageList.sender.equals(req.user._id) || req.messageList.receiver.equals(req.user._id))) {
		return res.status(403).end();
	}

	models.Notification.remove({
		list: req.messageList._id
	}, function (err) {
		if (err) throw err;
	});

	models.Message.remove({
		list: req.messageList._id
	}, function (err) {
		if (err) throw err;

		req.messageList.remove(function (err) {
			if (err) throw err;

			res.status(204).end();
		});
	});
}

function setReadThread (req, res) {
	models.Notification.remove({
		receiver: req.user._id
	}, function (err) {
		if (err) throw err;

		res.send({
			unreadCount: 0
		});
	});
}
