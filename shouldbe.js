module.exports = function (what) {
	return {
		be: function (type, strict) {
			if (typeof strict == 'undefined') strict = false;

			var t = typeof what
			if (t == type.name.toLowerCase()) {
				// Strict
				var valid = true;

				if (strict) {
					if (t == typeof "" && what.length == 0) {
						valid = false;
					}
				}

				if (valid) {
					return what;
				}

				return null;
			}

			if (t == Boolean) {
				return false
			}

			return null
		}
	}
}