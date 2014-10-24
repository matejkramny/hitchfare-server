var express = require('express'),
	app = express(),
	mongoose = require('mongoose');

mongoose.connect(process.env.DB || 'mongodb://127.0.0.1/student-discount')

var Offer = mongoose.model('Offer', {
	name: String,
	details: String
});
var Venue = mongoose.model('Venue', {
	name: String,
	picture: String,
	address: String,
	telephone: String,
	offers: [{
		type: mongoose.Schema.ObjectId,
		ref: 'Offer'
	}],
	lat: Number,
	lng: Number
});
var Group = mongoose.model('groups', {
	name: String,
	venues: [{
		type: mongoose.Schema.ObjectId,
		ref: 'Venue'
	}]
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

app.get('/groups', function (req, res) {
	Group.find({})
	.sort('-name')
	.populate('venues')
	.exec(function (err, groups) {
		res.send(groups);
	});
});
app.get('/group/:group_id/venues', function (req, res) {
	req.group.populate('venues', function (err) {
		if (err != null) {
			throw err;
		}

		res.send(req.group.venues);
	});
});

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

app.listen(process.env.PORT || 3000);
