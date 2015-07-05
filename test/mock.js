

var Validator = require('../validator')
var Pushable = require('pull-pushable')
function compare (a, b) {
  return a.value.timestamp - b.value.timestamp
//  return a.key < b.key ? 1 : a.key > b.key ? -1 : 0
}

var pull = require('pull-stream')

module.exports = function () {

  var data = [], validator, live

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

    batch: function (batch, cb) {
      console.log('BATCH', batch)
      batch.forEach(function (d) {
        if(!d.key && d.value) throw new Error('invalid batch')
        if(live) live.push(d)
        data.push(d)
      })
      data.sort(compare)
      cb()
    },

    get: function (id, cb) {
      for(var i = 0; i < data.length; i++)
        if(id === data[i].key)
          return cb(null, data[i].value)
      cb(new Error('value not found'))

    },

    //this is also needed for the tests.
    createFeedStream: function (opts) {
      opts = opts || {}
      console.log('create_feed_stream', data)
      if(opts.live) {
        live = Pushable(); data.forEach(live.push)
      }
      return pull(
        opts.live ? live: pull.values(data),
        pull.map(function (data) {
          if(opts.keys === false) return data.value
          return data
        })
      )
    }
  }

  ssbMock.add = Validator(ssbMock)

  return ssbMock
}
