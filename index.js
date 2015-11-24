module.exports = require('./build/libxslt');
var binding = require('bindings')('node-libxslt');

// override `parseFile` method with the one that properly reads stylesheet
// from file and retains file context
module.exports.parseFile = function(sourcePath, options, callback) {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	try {
		var stylesheet = exports.parse(binding.readXmlFile(sourcePath, options));
		if (typeof callback === 'function') {
			callback(null, stylesheet);
		}
		return stylesheet;
	} catch (err) {
		return callback(err);
	}
};