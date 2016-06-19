

var tape = require('tape')
var Queue = require('../queue')

tape('simple', function (t) {

  var n = Queue(function (value, prev, cb) {
    process.nextTick(function () {
      cb(null, value + (prev|0))
    })
  })

  n(1)
  n(1)
  n(1, function (err, value) {
    t.equal(value, 3)
    t.end()
  })

})


tape('simple', function (t) {

  var n = Queue(function (value, prev, cb) {
    cb(null, value + (prev|0))
  })

  n(1)
  n(1)
  n(1, function (err, value) {
    t.equal(value, 3)
    t.end()
  })

})




tape('simple', function (t) {

  var n = Queue(function (value, prev, cb) {
    setTimeout(function () {
      cb(null, value + (prev|0))
    }, Math.random()*20)
  })

  n(1)
  n(1)
  n(1, function (err, value) {
    t.equal(value, 3)
    t.end()
  })

})





