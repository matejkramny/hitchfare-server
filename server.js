var express = require('express'),
	app = express(),
	mongoose = require('mongoose'),
	async = require('async');

mongoose.connect(process.env.DB || 'mongodb://127.0.0.1/student-discount')

var Offer = mongoose.model('Offer', {
	name: String,
	details: String,
	description: String,
	worked_for_me: Number,
	did_not_work: Number
});
var Venue = mongoose.model('Venue', {
	name: String,
	pictures: [String],
	address: String,
	telephone: String,
	offers: [{
		type: mongoose.Schema.ObjectId,
		ref: 'Offer'
	}],
	lat: Number,
	lng: Number,
	website: String,
	type: String // sushi, restaurant, bar
});
var Group = mongoose.model('groups', {
	name: String,
	venues: [{
		type: mongoose.Schema.ObjectId,
		ref: 'Venue'
	}]
});
var UserRequest = mongoose.model('userRequest', {
	uuid: String,
	venue: {
		type: mongoose.Schema.ObjectId,
		ref: 'Venue'
	},
	group: {
		type: mongoose.Schema.ObjectId,
		ref: 'Group'
	},
	offer: {
		type: mongoose.Schema.ObjectId,
		ref: 'Offer'
	},
	type: String // request, view, useOffer, workedOffer, notworkedOffer
});

app.use(require('morgan')('dev'));
app.use(require('body-parser').json({
	strict: true
}));

app.param('group_id', function (req, res, next, id) {
	var _id = null;
	try {
		_id = mongoose.Types.ObjectId(id)
	} catch (e) {
		next("Invalid ID");
		return;
	}

	Group.findOne({
		_id: _id
	}, function (err, group) {
		req.group = group;

		next();
	});
});
app.param('venue_id', function (req, res, next, id) {
	var _id = null;
	try {
		_id = mongoose.Types.ObjectId(id)
	} catch (e) {
		next("Invalid ID");
		return;
	}

	Venue.findOne({
		_id: _id
	}, function (err, venue) {
		req.venue = venue;

		next();
	});
});
app.param('offer_id', function (req, res, next, id) {
	var _id = null;
	try {
		_id = mongoose.Types.ObjectId(id)
	} catch (e) {
		next("Invalid ID");
		return;
	}

	Offer.findOne({
		_id: _id
	}, function (err, offer) {
		req.offer = offer;

		next();
	});
});

app.use(function (req, res, next) {
	var uuid = req.headers['x-device-id'];
	req.uuid = null;
	
	if (uuid) {
		req.uuid = uuid + ""; // cast to string
	}

	function logRequest () {
		res.removeListener('finish', logRequest);
		res.removeListener('close', logRequest);

		var venue_id = null;
		var group_id = null;

		if (req.group) {
			group_id = req.group._id;
		}
		if (req.venue) {
			venue_id = req.venue._id;
		}

		var request = new UserRequest({
			uuid: uuid + "",
			venue: venue_id,
			group: group_id
		});
		request.save();
	}

	res.on('finish', logRequest);
	res.on('close', logRequest);

	next();
});

app.get('/groups', function (req, res) {
	Group.find({})
	.sort('-name')
	.populate('venues')
	.exec(function (err, groups) {
		res.send(groups);
	});
});
app.get('/group/:group_id/venue/:venue_id/offers', function (req, res) {
	req.venue.populate({
		path: 'offers',
		options: {
			sort: '-worked_for_me'
		}
	}, function (err) {
		if (err != null) {
			throw err;
		}

		res.send(req.venue.offers)
	});
});

app.delete('/group/:group_id/venue/:venue_id/offer/:offer_id/use', function (req, res) {
	if (!req.uuid) {
		res.status(400).end();
		return;
	}

	Offer.update({
		_id: req.offer._id
	}, {
		$inc: {
			did_not_work: 1
		}
	});

	res.status(201).end();
});
app.post('/group/:group_id/venue/:venue_id/offer/:offer_id/use', function (req, res) {
	if (!req.uuid) {
		res.status(400).end();
		return;
	}
	
	Offer.update({
		_id: req.offer._id
	}, {
		$inc: {
			worked_for_me: 1
		}
	});

	res.status(201).end();
});

// poor man's API protection
app.use(function (req, res, next) {
	if (!req.headers.auth || req.headers.auth != "hello") {
		return next(403);
	}

	next();
});

app.post('/groups', function (req, res) {
	(new Group(req.body)).save(function (err) {
		res.status(201).end();
	})
});
app.post('/group/:group_id/venues', function (req, res) {
	var venue = new Venue(req.body);
	venue.save();

	req.group.venues.push(venue._id);
	req.group.save();

	res.status(201).end();
});
app.post('/group/:group_id/venue/:venue_id/offers', function (req, res) {
	var offer = new Offer(req.body);
	offer.save();

	req.venue.offers.push(offer._id);
	req.venue.save();

	res.status(201).end();
});

app.get('/analytics', function (req, res) {
	var topVenues = null;
	var topUsers = null;

	async.parallel([
		function (cb) {
			UserRequest.aggregate([
				{
					$group: {
						_id: '$uuid',
						totalRequests: {
							$sum: 1
						}
					},
				}, {
					$sort: {
						totalRequests: 1
					}
				}
			], function (err, result) {
				topUsers = result;
				cb();
			});
		},
		function (cb) {
			UserRequest.aggregate([
				{
					$match: {
						venue: {
							$ne: null
						}
					}
				}, {
					$group: {
						_id: '$venue',
						numberOfReqs: {
							$sum: 1
						}
					}
				}, {
					$sort: {
						totalRequests: 1
					}
				}
			], function (err, result) {
				async.each(result, function (r, cb) {
					var v = Venue.findOne({
						_id: r._id
					}, function (err, venue) {
						r.venue = venue;
						cb();
					});
				}, function (err) {
					topVenues = result;
					cb();
				});
			});
		}
	], function (err) {
		var parsed = '';

		async.each(topVenues, function (v, cb) {
			parsed += v.venue.name + ' - ' + v.numberOfReqs + ' Requests' + "\n";
		});

		async.each(topUsers, function (u, cb) {
			parsed += u._id + ' - ' + u.numberOfReqs + ' Requests' + "\n";
		});

		res.send(parsed);
		res.end();
	});
});

app.listen(process.env.PORT || 3000);
