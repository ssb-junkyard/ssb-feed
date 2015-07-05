'use strict';

var hash = require('ssb-keys').hash

// make a validation stream?
// read the latest record in the database
// check it against the incoming data,
// and then read through

function isString (s) {
  return 'string' === typeof s
}

function isInteger (n) {
  return ~~n === n
}

function isObject (o) {
  return o && 'object' === typeof o
}

var util = require('./util')
var encode = util.encode

module.exports = function (ssb) {

  var write = util.BatchQueue(ssb)

  function getLatest (id, cb) {
    ssb.getLatest(id, function (err, data) {
      if(err) return cb(null, {key: null, value: null, type: 'put', public: null, ready: true})
      cb(null, {
        key: data.key, value: data.value, type: 'put',
        public: data.value && data.value.author, ready: true
      })
    })
  }

  var latest = {}

  function setLatest(id) {
    if(latest[id].ready)
      throw new Error('setLatest should only be called once')
    ssb.getLatest(id, function (err, data) {
      latest[id].key = data.key
      latest[id].value = data.value
      latest[id].ready = true
      validate(id)
    })
  }

  function validate(id) {
    var feed = latest[id]
    if(!feed.queue.length) return
    if(!feed.ready) return

    while(feed.queue.length) {
      var op = feed.queue.shift()

      if('function' == typeof op.create) {
        op.value = op.create(feed.key, feed.value)
        op.key = hash(encode(op.value))
      }

      var err
      if(err = util.isInvalid(id, op.value, feed))
        op.cb(err)
      else {
        feed.key = op.key
        feed.value = op.value
        feed.ts = Date.now()
        write(op)
      }
    }
  }

  function queue (id, job) {
    if(!latest[id]) {
      latest[id] = {
        key:null, value: null,
        ready: false, queue: [],
        ts: Date.now()
      }
      latest[id].queue.push(job)
      setLatest(id)
    }
    else
      latest[id].queue.push(job)

    validate(id)
  }

  function add (msg, cb) {
    var err = util.isInvalidShape(msg)
    if(err) return cb(err)

    queue(msg.author, {
        key: hash(encode(msg)),
        value: msg, cb: cb,
        create: null
      })
  }

  add.queue = function (id, create, cb) {
    queue(id, {
        key: null, value: null,
        create: create, cb: cb
      })

  }

  return add
}
