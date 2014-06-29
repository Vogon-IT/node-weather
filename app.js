var util = require('util'),
  request = require('request'), // https://github.com/mikeal/request
  jsdom = require('jsdom').jsdom, // https://www.npmjs.org/package/jsdom
  xml2js = require('xml2js'), // https://www.npmjs.org/package/xml2js
  schedule = require('node-schedule'), // https://www.npmjs.org/package/node-schedule
  RSVP = require('rsvp'); // promise https://www.npmjs.org/package/rsvp

var request = request.defaults({
  jar: true
});

var config = require('./config');

// REST API session related
//
var getToken = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running token...');
    var options = {
      uri: config.uri + 'users/sign_in',
      method: 'GET'
    };

    request.get(options, function(error, res, body) {
      if (error) {
        reject(error);
      }

      var doc = jsdom(body),
        meta = doc.querySelector("meta[name=csrf-token]");

      config.token = meta.getAttribute("content");

      resolve(config.token);
    });
  });
};

var signOut = function() {
  return new RSVP.Promise(function(resolve, reject) {
    request.del({
      uri: config.uri + 'users/sign_out',
      json: {
        'utf8': '✓',
        'authenticity_token': config.token,
      }
    }, function(error, res, body) {
      if (error) reject(error);

      resolve();
    });
  });
};

var signIn = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running signin...');
    var options = {
      uri: config.uri + 'users/sign_in.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      json: {
        'utf8': '✓',
        'authenticity_token': config.token,
        'user': {
          'username': config.username,
          'password': config.password,
          'remember_me': 1
        }
      }
    };

    request(options, function(error, res, body) {
      if (error) {
        reject(error);
      }

      resolve();
    });
  });
};

// Weather related
//
var downloadWeather = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running download...');
  });
};


var xml2json = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running xml2json...');

  });
};

var uploadWeather = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running upload...');

    if (data === null) {
      util.puts('no unprocessed images');
      return;
    }

    var r = request.post(config.uri + 'images.json', function optionalCallback(err, res, body) {
      util.puts(res.statusCode);

      if (err) {
        return util.puts('upload failed:', err);
      }

      if (res.statusCode === 401) {
        signOut().then(signIn).then(queryNextImage).then(uploadImage).then(null, function(error) {
          util.puts(error);
        });
      } else if (res.statusCode === 201) {
        cleanUp(image)
          .then(queryNextImage)
          .then(uploadImage).then(null, function(error) {
            util.puts(error);
          });

        resolve(image);
      } else {
        reject(res.statusCode);
      }
    });

    var form = r.form();
    form.append('utf8', '✓');
    form.append('authenticity_token', config.token);
    form.append('image[image]', fs.createReadStream(imagePath));
  });
};

// run init promises
signOut().then(null, function() {
  util.puts('signOut error');
}).then(getToken).then(null, function() {
  util.puts('getToken error');
}).then(downloadWeather).then(null, function() {
  util.puts('query error');
}).then(uploadWeather).then(null, function() {
  util.puts('upload error');
});

// Run upload process every 10 minutes
// var rule = new schedule.RecurrenceRule();
// rule.minute = 1;

// var j = schedule.scheduleJob(rule, function() {
//   queryNextImage().then(null, function() {
//     util.puts('query error');
//   }).then(uploadImage).then(null, function() {
//     util.puts('upload error');
//   });
// });

// var json = {
//   'utf8': '✓',
//   'authenticity_token': config.token,
//   'weather': {
//     'weather_timestamp': new Date(),
//     'temperature': 23
//   }
// };