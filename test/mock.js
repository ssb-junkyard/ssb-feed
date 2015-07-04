

var Validator = require('../validator')

function compare (a, b) {
  return a.value.timestamp - b.value.timestamp
//  return a.key < b.key ? 1 : a.key > b.key ? -1 : 0
}

var pull = require('pull-stream')

module.exports = function () {

  var data = [], validator

  var ssbMock = {
    data: data,

    getLatest: function (id, cb) {
      var last, max = 0
      data.forEach(function (data) {
        console.log(id, data)
        if(data.value.author === id && data.value.sequence >= max) {
          last = data; max = last.value.sequence
        }
      })
      cb(null, last || {key:null,value:null})
    },

    add: function (msg, cb) {
      validator.validate(msg, cb)
    },

    batch: function (batch, cb) {
      batch.forEach(function (d) {
        data.push(d)
      })
      data.sort(compare)
      cb()
    },

    //this is also needed for the tests.
    createFeedStream: function (opts) {
      return pull(
        pull.values(data),
        pull.map(function (data) {
          if(opts.keys === false) return data.value
        })
      )
    }
  }

  validator = Validator(ssbMock)
  console.log(validator)
  return ssbMock
}
