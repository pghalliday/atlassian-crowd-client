'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require('core-js/shim');

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var CrowdApi = (function () {
  function CrowdApi(_ref) {
    var baseUrl = _ref.baseUrl;
    var application = _ref.application;
    var _ref$sessionTimeout = _ref.sessionTimeout;
    var sessionTimeout = _ref$sessionTimeout === undefined ? 600 : _ref$sessionTimeout;
    var _ref$debug = _ref.debug;
    var debug = _ref$debug === undefined ? false : _ref$debug;

    _classCallCheck(this, CrowdApi);

    var uri = _url2['default'].parse(baseUrl);
    this.settings = {
      protocol: uri.protocol,
      hostname: uri.hostname,
      basepath: uri.pathname + 'rest/usermanagement/1',
      credentials: application.name + ':' + application.password,
      port: uri.port || (uri.protocol === 'https:' ? 443 : 80),
      sessionTimeout: sessionTimeout,
      debug: debug
    };
  }

  _createClass(CrowdApi, [{
    key: 'request',
    value: function request(method, path) {
      var _this = this;

      var data = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];

      var error = undefined;
      var opts = {
        hostname: this.settings.hostname,
        port: this.settings.port,
        auth: this.settings.credentials,
        method: method,
        path: this.settings.basepath + path,
        headers: {
          // JSON is not supported for the /group/membership endpoint.
          'Accept': path === '/group/membership' ? 'application/xml' : 'application/json'
        }
      };

      switch (method) {
        case 'POST':
        case 'PUT':
        case 'DELETE':
          data = JSON.stringify(data) || '';
          opts.headers['Content-Type'] = 'application/json';
          opts.headers['Content-Length'] = data.length;
          break;
      }

      return new Promise(function (resolve, reject) {
        _this.log('Request:', opts, data);

        var handler = _this.settings.protocol === 'https:' ? _https2['default'] : _http2['default'];
        var request = handler.request(opts, function (response) {
          var responseData = '';

          switch (response.statusCode) {
            case 204:
              resolve();
              break;
            case 401:
              error = new Error('Application Authorization Error');
              error.type = 'APPLICATION_ACCESS_DENIED';
              _this.log(error);
              reject(error);
              break;
            case 403:
              error = new Error('Application Permission Denied');
              error.type = 'APPLICATION_PERMISSION_DENIED';
              _this.log(error);
              reject(error);
              break;
          }

          response.on('data', function (chunk) {
            return responseData += chunk.toString();
          });

          response.on('end', function () {
            _this.log('Response:', response.statusCode, responseData);

            if (path === '/group/membership' && response.statusCode === 200 && responseData) {
              // Return the raw XML response for /group/membership, since it doesn't support JSON.
              resolve(responseData);
            } else if (response.headers['content-type'] !== 'application/json') {
              error = new Error('Invalid Response from Crowd, expecting JSON.');
              error.type = 'INVALID_RESPONSE';
              reject(error);
            } else if (responseData) {
              responseData = JSON.parse(responseData);
              if (responseData.reason || responseData.message) {
                if (typeof responseData.reason === 'undefined') {
                  responseData.reason = 'BAD_REQUEST';
                  responseData.message = 'Invalid Request to Crowd.';
                }
                error = new Error(responseData.message);
                error.type = responseData.reason;
                reject(error);
              } else {
                resolve(responseData);
              }
            } else {
              resolve();
            }
          });
        });

        request.on('error', function (e) {
          console.log('Error sending request: ' + e.message);
          reject(error);
        });

        if (data) {
          request.end(data);
        } else {
          request.end();
        }
      });
    }
  }, {
    key: 'log',
    value: function log() {
      if (this.settings.debug) {
        console.log.apply(console, arguments);
      }
    }
  }]);

  return CrowdApi;
})();

exports['default'] = CrowdApi;
module.exports = exports['default'];