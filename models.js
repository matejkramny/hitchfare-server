
var mongoose = require('mongoose');

exports.User = mongoose.model('User', {
	email: String,
	first_name: String,
	id: String, // facebook id
	last_name: String,
	name: String,
	picture: {
		is_silhouette: Boolean,
		url: String
	}
});

exports.Message = mongoose.model('Message', {
	sender: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	receiver: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	message: String,
	sent: {
		type: Date,
		default: Date.now
	}
});

exports.Car = mongoose.model('Car', {
	name: String,
	owner: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	seats: {
		type: Number,
		min: 0,
		max: 9
	}
});

exports.Journey = mongoose.model('Journey', {
	name: String,
	owner: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	car: {
		type: mongoose.Schema.ObjectId,
		ref: 'Car'
	},
	driver: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	availableSeats: {
		type: Number,
		min: 0,
		max: 9
	},
	start: {
		date: Date,
		human: String,
		lat: Number,
		lng: Number
	},
	end: {
		date: Date, // optional
		human: String,
		lat: Number,
		lng: Number
	},
	price: Number // £
});

exports.JourneyPassenger = mongoose.model('JourneyPassenger', {
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	journey: {
		type: mongoose.Schema.ObjectId,
		ref: 'Journey'
	},
	approved: Boolean, // decision. True or false depending on whether the user approves/rejects the decision
	didApprove: Boolean, // was approved or rejected. This is before the user acts. After the user acts, this is true.
	approvedWhen: Date,
	rated: {
		type: Boolean,
		default: false
	},
	rating: {
		type: Number,
		min: 1,
		max: 10,
		default: 1
	}
});
