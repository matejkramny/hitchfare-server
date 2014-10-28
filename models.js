var mongoose = require('mongoose');

exports.User = mongoose.model('User', {
	email: String,
	first_name: String,
	id: String,
	last_name: String,
	name: String,
	picture: {
		is_silhouette: Boolean,
		url: String
	}
});
