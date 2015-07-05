'use strict';

var isRef = require('ssb-ref')
var isHash = isRef.isHash
var isFeedId = isRef.isFeedId
var contpara = require('cont').para
var explain = require('explain-error')

var codec = require('./codec')
var ssbKeys = require('ssb-keys')

// make a validation stream?
// read the latest record in the database
// check it against the incoming data,
// and then read through

function get (db, key) {
  return function (cb) {
    return db.get(key, cb)
  }
}

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

var hash = ssbKeys.hash
var encode = codec.encode

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

      console.log("VALIDATE", id, op.value, feed.key)
      if(util.validate(id, op.value, feed)) {
        feed.key = op.key
        feed.value = op.value
        feed.ts = Date.now()
        write(op)
      }
      else
        op.cb(new Error(util.validate.reason))
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
    if(
      !isObject(msg) ||
      !isInteger(msg.sequence) ||
      !isFeedId(msg.author) ||
      !(isObject(msg.content) || isString(msg.content))
    )
      return cb(new Error('invalid message'))

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
