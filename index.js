'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _oauth = require('oauth-1.0a');

var crypto = require('crypto');

var _oauth2 = _interopRequireDefault(_oauth);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function HandlePopupResult(result) {
    alert("result of popup is: " + result);
}

var _class = function () {
	function _class(config) {
		_classCallCheck(this, _class);

		this.url = config.rest_url ? config.rest_url : config.url + 'wp-json';
		this.url = this.url.replace(/\/$/, '');
		this.credentials = config.credentials;

		if (this.credentials) {
			this.oauth = new _oauth2.default({
				consumer: config.credentials.client,
				signature_method: 'HMAC-SHA1',
				hash_function: function(base_string, key) {
			        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
			    }
			});
		}
		this.config = config;
	}

	_createClass(_class, [{
		key: 'getConsumerToken',
		value: function getConsumerToken() {
			var _this = this;

			if (!this.config.brokerCredentials) {
				throw new Error('Config does not include a brokerCredentials value.');
			}

			this.config.credentials.client = this.config.brokerCredentials.client;
			return this.post(this.config.brokerURL + 'broker/connect', {
				server_url: this.config.url
			}).then(function (data) {

				if (data.status && data.status === 'error') {
					throw { message: 'Broker error: ' + data.message, code: data.type };
				}
				_this.config.credentials.client = {
					public: data.client_token,
					secret: data.client_secret
				};

				return data;
			});
		}
	}, {
		key: 'getRequestToken',
		value: function getRequestToken() {
			var _this2 = this;
			
			if (!this.config.callbackURL) {
				throw new Error('Config does not include a callbackURL value.');
			}
			return this.post(this.config.url + 'oauth1/request', {
				callback_url: this.config.callbackURL
			}).then(function (data) {
				var redirectURL = _this2.config.url + 'oauth1/authorize?' + _qs2.default.stringify({
					oauth_token: data.oauth_token,
					oauth_callback: _this2.config.callbackURL
				});

				_this2.config.credentials.token = {
					secret: data.oauth_token_secret
				};

				
				return { redirectURL: redirectURL, token: data };
			});
		}
	}, {
		key: 'getAccessToken',
		value: function getAccessToken(oauthVerifier) {
			var _this3 = this;
			console.log('A1');
			return this.post(this.config.url + 'oauth1/access', {
				oauth_verifier: oauthVerifier
			}).then(function (data) {
				console.log('A3');
				_this3.config.credentials.token = {
					public: data.oauth_token,
					secret: data.oauth_token_secret
				};
				console.log('A4');
				return _this3.config.credentials.token;
			});
		}
	}, {
		key: 'authorize',
		value: function authorize(next) {
			console.log(1);
			var args = {};
			var savedCredentials = window.localStorage.getItem('requestTokenCredentials');
			if (window.location.href.indexOf('?') > 0) {
				args = _qs2.default.parse(window.location.href.split('?')[1]);
				console.log(1.2);
			}
			
			if( (typeof next === 'string' || next instanceof String) && next.indexOf('?')) {
				args = _qs2.default.parse(next.split('?')[1]);
				console.log(1.3);
			}

			if (!this.config.credentials.client) {
				console.log(2);
				return this.getConsumerToken().then(this.authorize.bind(this));
			}

			if (this.config.credentials.token && this.config.credentials.token.public) {
				console.log(3);
				return Promise.resolve("Success");
			}

			if (savedCredentials) {
				console.log(4);
				this.config.credentials = JSON.parse(savedCredentials);
				window.localStorage.removeItem('requestTokenCredentials');
			}

			if (!this.config.credentials.token) {
				console.log(6);
				return this.getRequestToken().then(this.authorize.bind(this));
			} else if (!this.config.credentials.token.public && !savedCredentials) {
				console.log(7);
				window.localStorage.setItem('requestTokenCredentials', JSON.stringify(this.config.credentials));
				console.log(7.1);
				//window.location = next.redirectURL;
				//throw 'Redirect to authrization page...'; // This only works in the browser
				if(!next)
				{
					console.log(7.2);
					next = {redirectURL: this.config.callbackURL};
					console.log("7.3:"+JSON.stringify(next));
				}
				this.OpenDialog(next.redirectURL);
				console.log(7.4);
			} else if (!this.config.credentials.token.public && args.oauth_token) {
				console.log(8);
				console.log(JSON.stringify(args));
				this.config.credentials.token.public = args.oauth_token;
				var self = this; 
				return this.getAccessToken(args.oauth_verifier).then(function (token) {
					console.log("AT1:" + JSON.stringify(token));
					console.log("AT2:" + JSON.stringify(self.config.credentials));
					self.saveCredentials();
				});
			} else if (savedCredentials) {
				return this.authorize.bind(this, next); // restart the process, and no die in error
			}
			return Promise.resolve("Error");
			console.log(9);
		}
	}, {
		key: 'saveCredentials',
		value: function saveCredentials() {
			window.localStorage.setItem('tokenCredentials', JSON.stringify(this.config.credentials));
		}
	}, {
		key: 'removeCredentials',
		value: function removeCredentials() {
			delete this.config.credentials.token;
			window.localStorage.removeItem('tokenCredentials');
			window.localStorage.removeItem('requestTokenCredentials');
		}
	}, {
		key: 'hasCredentials',
		value: function hasCredentials() {
			return this.config.credentials && this.config.credentials.client && this.config.credentials.client.public && this.config.credentials.client.secret && this.config.credentials.token && this.config.credentials.token.public && this.config.credentials.token.secret;
		}
	}, {
		key: 'restoreCredentials',
		value: function restoreCredentials() {
			var savedCredentials = window.localStorage.getItem('tokenCredentials');
			if (savedCredentials) {
				this.config.credentials = JSON.parse(savedCredentials);
			}
			return this;
		}
	}, {
		key: 'get',
		value: function get(url, data) {
			return this.request('GET', url, data);
		}
	}, {
		key: 'post',
		value: function post(url, data) {
			return this.request('POST', url, data);
		}
	}, {
		key: 'del',
		value: function del(url, data, callback) {
			return this.request('DELETE', url, data);
		}
	}, {
		key: 'request',
		value: function request(method, url) {
			var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

			if (url.indexOf('http') !== 0) {
				url = this.url + url;
			}

			if (method === 'GET' && data) {
				// must be decoded before being passed to ouath
				url += '?' + decodeURIComponent(_qs2.default.stringify(data));
				data = null;
			}

			var oauthData = null;

			if (data) {
				oauthData = {};
				Object.keys(data).forEach(function (key) {
					var value = data[key];
					if (Array.isArray(value)) {
						value.forEach(function (val, index) {
							return oauthData[key + '[' + index + ']'] = val;
						});
					} else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
						for (var property in value) {
							if (value.hasOwnProperty(property)) {
								oauthData[key + '[' + property + ']'] = value[property];
							}
						}
					} else {
						oauthData[key] = value;
					}
				});
			}

			if (this.oauth) {
				console.log('R5');
				var oauthData = this.oauth.authorize({
					method: method,
					url: url,
					data: oauthData
				}, this.config.credentials.token);
				console.log('R6:'+JSON.stringify(this.config.credentials.token));
			}

			var headers = {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
			};
			console.log('R7');

			var requestUrls = [this.config.url + 'oauth1/request'];
			
			console.log('R8');

			/**
    * Only attach the oauth headers if we have a request token, or it is a request to the `oauth/request` endpoint.
    */
			console.log('R10:' + JSON.stringify(oauthData));
			if (this.oauth && this.config.credentials.token || requestUrls.indexOf(url) > -1) {
				headers = _extends({}, headers, this.oauth.toHeader(oauthData));
			}
			console.log('R11:' + JSON.stringify(headers));
			return fetch(url, {
				method: method,
				headers: headers,
				mode: 'cors',
				body: ['GET', 'HEAD'].indexOf(method) > -1 ? null : _qs2.default.stringify(data)
			}).then(function (response) {
				if (response.headers.get('Content-Type') && response.headers.get('Content-Type').indexOf('x-www-form-urlencoded') > -1) {
					console.log('R12:');
					return response.text().then(function (text) {
						return _qs2.default.parse(text);
						console.log('R13:');
					});
				}
				return response.text().then(function (text) {
					console.log('R14:');
					try {
						var json = JSON.parse(text);
						console.log('R15:');
					} catch (e) {
						console.log('R16:'+text+', Status:'+response.status);
						throw { message: text, code: response.status };
					}

					if (response.status >= 300) {
						console.log('R17:');
						throw json;
					} else {
						console.log('R18:');
						return json;
					}
				});
			});
		}
	},{
		key: 'lastReturnUrl',
		value: ''
	},{
		key: 'OpenDialog',
		value: function OpenDialog(url)
		{
			var self = this;
			
			console.log("Dia1:");
		    var win = window.open(url);
		    win.addEventListener("loadstop", function(event) {
		    	if(event.url.indexOf(self.config.callbackURL) > -1)
		    	{
		    		console.log("dia1.3:" + event.url);
		    		win.close();
		    		self.authorize(event.url);
		    	}
		    });
		    console.log("Dia2:");//+JSON.stringify(win));
		    window.addEventListener("message", function(event) {
		    	console.log("dia3:" + event.data);
		    	self.authorize(event.data);
		    }, false );
		}
	}]);

	return _class;
}();

exports.default = _class;