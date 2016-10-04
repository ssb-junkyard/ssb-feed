

var Validator = require('../validator')
var Pushable = require('pull-pushable')
function compare (a, b) {
  return a.value.timestamp - b.value.timestamp
//  return a.key < b.key ? 1 : a.key > b.key ? -1 : 0
}

var pull = require('pull-stream')

module.exports = function (async, opts) {

  var data = [], validator, live

  var ssbMock = {
    data: data,

    getLatest: async(function (id, cb) {
      var last, max = 0
      data.forEach(function (data) {
        if(data.value.author === id && data.value.sequence >= max) {
          last = data; max = last.value.sequence
        }
      })
      cb (null, last || {key:null,value:null})
    }, 'add'),

    batch: async(function (batch, cb) {
      console.log('BATCH', JSON.stringify(batch))
      batch.forEach(function (d) {
        if(!d.key && d.value) throw new Error('invalid batch')
        if(live) live.push(d)
        data.push(d)
      })
      data.sort(compare)
      cb()
    }, 'batch'),

    get: async(function (id, cb) {
      for(var i = 0; i < data.length; i++)
        if(id === data[i].key)
          return cb(null, data[i].value)
      cb(new Error('value not found'))

    }, 'get'),

    //this is also needed for the tests.
    createFeedStream: function (opts) {
      opts = opts || {}
      if(opts.live) {
        live = Pushable()
        data.forEach(function (v) { live.push(v) })
      }
      return pull(
        opts.live ? live : pull.values(data),
        pull.map(function (data) {
          if(opts.keys === false) return data.value
          return data
        }),
        pull.through(function (D) {
          console.log('READ', D)
        }, function (err) {
          console.log("ERR", err)
        }),
        async.through('feed')
      )
    }
  }
  ssbMock.add = Validator(ssbMock, opts)

  return ssbMock
}


