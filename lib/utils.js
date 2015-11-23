'use strict';

module.exports.expectResponse = function(resolve, reject, code) {
	code = code || 200;
	return function(err, res, content) {
		if (!err && res.statusCode === code) {
			if (typeof content === 'string') {
				content = JSON.parse(content);
			}
			return resolve(content);
		}

		if (!err) {
			if (typeof content !== 'string') {
				content = JSON.stringify(content);
			}
			err = new Error('Unexpected response code: ' + res.statusCode + '\n\n' + content);
		}
		reject(err);
	};
}