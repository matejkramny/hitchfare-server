var express = require('express'),
	app = express(),
	mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1/student-discount')

var Offer = mongoose.model('Offer', {
	name: String,
	details: String
})
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
})
var Group = mongoose.model('groups', {
	name: String,
	venues: [{
		type: mongoose.Schema.ObjectId,
		ref: 'Venue'
	}]
});

/*
var jf = new Venue();
jf.name = "The Jam Factory";
jf.address = "27 Park End Street, Oxford";
jf.lat = 51.752336
jf.lng = -1.267498

var taberu = new Venue();
taberu.name = "Taberu Oxford";
taberu.address = "Taberu, Cowley Road, Oxford";
taberu.lat = 51.752336
taberu.lng = -1.267498

jf.save();
taberu.save();

var group = new Group();
group.name = "Eat In";
group.venues = [jf._id, taberu._id];
group.save();*/

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
})

app.get('/groups', function (req, res) {
	Group.find({})
	.sort('-name')
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

app.listen(process.env.PORT || 3000)
