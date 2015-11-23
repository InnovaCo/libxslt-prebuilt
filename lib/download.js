/**
 * Downloads libxslt bundle for current platform, optionally saves it in cache
 */
'use strict';
var fs = require('fs');
var path = require('path');
var homePath = require('home-path');
var mkdirp = require('mkdirp');
var parseUrl = require('url').parse;
var extend = require('xtend');
var chalk = require('chalk');
var arch = require('./arch');
var expectResponse = require('./utils').expectResponse;
var request = require('request').defaults({
	json: true,
	headers: {
		accept: 'application/vnd.github.v3+json',
		'user-agent': 'LibXSLT publisher bot'
	}
});
var pkg = require('../package.json');
require('es6-promise').polyfill();

var cacheDir = path.join(homePath(), '.' + pkg.name);

module.exports = function(options) {
	return getRelease(options)
	.then(pickAsset)
	.then(function(url) {
		return getCachedFile(url).catch(function() {
			return downloadFile(url);
		});
	});
};

/**
 * Fetches GitHub Release data for given tag
 * @param  {Object} data
 * @return {Promise}
 */
function getRelease(data) {
	data = data || {};
	return new Promise(function(resolve, reject) {
		var release = data.release || ('v' + pkg.version);
		var domain = data.domain || 'https://api.github.com';
		var repo = parseUrl(pkg.repository.url).pathname.slice(1).replace(/\.git$/, '');
		var url = [domain, 'repos', repo, 'releases/tags', release].join('/');
		request(url, expectResponse(resolve, reject));
	});
}

/**
 * Picks asset that matches best for current platform and runtime
 * @param  {Object} release Release payload
 * @return {Promise}        Promise resolved with asset URL
 */
function pickAsset(release) {
	var re = new RegExp('^libxslt\\-v([\\d\\.]+)\\-' + process.platform + '\\-' + arch() + '\\.zip$');
	var assets = release.assets.reduce(function(result, asset) {
		var m = asset.name.match(re);
		if (m) {
			result[m[1]] = asset;
		}
		return result;
	}, {});


	var nodeVersion = process.version.match(/v(\d+\.\d+)/)[1];
	var assetKey = nodeVersion;
	if (!assets[assetKey]) {
		console.log('Available assets', Object.keys(assets));
		// no exact match, find asset as close as possible to current version
		var nodeVersionFloat = parseFloat(nodeVersion);
		var possibleMatches = Object.keys(assets)
		.map(parseFloat)
		.sort(function(a, b) {
			return a - b;
		})
		.filter(function(version) {
			return Math.floor(version) === Math.floor(nodeVersionFloat);
		});

		assetKey = possibleMatches.reduceRight(function(prev, key) {
			return key < nodeVersionFloat && prev < key ? key : prev;
		});
	}

	if (assets[assetKey]) {
		console.log('Found asset', chalk.green(assets[assetKey].name));
		return Promise.resolve(assets[assetKey].browser_download_url);
	}

	return Promise.reject(new Error('Unable to find asset for current platform.\n'
		+ 'OS: ' + process.platform + '\n'
		+ 'Arch: ' + arch() + '\n'
		+ 'Node version: ' + nodeVersion
	));
}


/**
 * Returns locally cached file, if exists
 * @return {Promise} Promise that resolved with file path
 */
function getCachedFile(url) {
	var fileName = path.basename(url);
	var cachedFile = path.join(cacheDir, fileName);
	return new Promise(function(resolve, reject) {
		fs.stat(cachedFile, function(err) {
			err ? reject(err) : resolve(cachedFile);
		});
	});
}

/**
 * Downloads given file into cache folder and resolves promise with 
 * path to cached file
 * @param  {String} url
 * @return {Promise}
 */
function downloadFile(url) {
	console.log('Download bundle from', chalk.underline(url));
	return new Promise(function(resolve, reject) {
		var fileName = path.basename(url);
		var cachedFile = path.join(cacheDir, fileName);
		
		console.log('Saving cache to', chalk.yellow(cachedFile));
		mkdirp(cacheDir, function(err) {
			if (err) {
				return reject(err);
			}

			var dest = fs.createWriteStream(cachedFile, {defaultEncoding: 'binary'});
			request(url).on('error', reject)
			.pipe(dest).on('error', reject)
			.on('finish', function() {
				resolve(cachedFile);
			});
		});
	});
}

if (require.main === module) {
	module.exports();
}