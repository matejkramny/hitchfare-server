module.exports = function (what) {
	return {
		be: function (type) {
			if (typeof what == type.name.toLowerCase()) {
				return what
			}

			if (type == Boolean) {
				return false
			}

			return null
		}
	}
}