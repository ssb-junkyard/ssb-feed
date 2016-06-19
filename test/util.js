var through = require('pull-stream/throughs/through')
var createMock = require('./mock')

exports.sync = function sync(test, done) {
  function async(fn) {
    return fn
  }
  async.through = function () { return through() }
  async.done = done
  test(async, done)
}

exports.remote = function (async) {
  //simulate add from a ssb-client  by hiding add.queue
  //(when exposed remotely, functions do not have properties)
  var mock = createMock(async)
  var add = mock.add
  mock.add = function (value, cb) {
    return add(value, cb)
  }
  return mock
}
