var cont = require('cont')
var Message = require('./message')
var pull = require('pull-stream')
var cat = require('pull-cat')

var ssbKeys = require('ssb-keys')
var codec = require('./codec')

function isFunction (f) {
  return 'function' === typeof f
}

function isString (s) {
  return 'string' === typeof s
}

function isObject (o) {
  return (
    o && 'object' === typeof o
    && !Buffer.isBuffer(o)
    && !Array.isArray(o)
  )
}

function isEncrypted (str) {
  return isString(str) && /^[0-9A-Za-z\/+]+={0,2}\.box/.test(str)
}

module.exports = function (ssb, keys) {

  var create = Message(ssbKeys)

  function getPrev(next) {
    ssb.getLatest(keys.id, next)
  }
  function noop (err) {
    if (err) throw err
  }

  var queue = null
  var prev = null
  var writing = false
  return {
    id: keys.id,
    keys: keys,
    init: function (cb) {
      this.add({ type: 'init', public: keys.public }, cb)
    },
    add: cont(function (type, message, cb) {
      // argument variations
      if (isFunction(message))    { cb = message; message = type } // add(msgObj, cbFn)
      else if (isObject(message)) { message.type = type } // add(typeStr, mgObj, cbFn)
      else                        { message = { type: type, value: message } } // add(typeStr, msgStr, cbFn)

      if(!isEncrypted(message)) {

        type = message.type

        if (!(isString(type) && type.length <= 52 && type.length >= 3)) {
          return cb(new Error(
            'type must be a string' +
            '3 <= type.length < 52, was:' + type
          ))
        }

      }

      // create queue
      if (!queue) {
        queue = []
        getPrev(function (err, _prev) {
          prev = _prev
          if (!prev && type !== 'init') {
            // new feed, publish an `init` msg first
            queue.unshift({
              message: {
                type: 'init',
                public: keys.public
              },
              cb: noop
            })
          }
          write()
        })
      }

      // queue and write next
      queue.push({ message: message, cb: cb })
      if (prev) write()

      function write () {
        if (queue.length && !writing) {
          writing = true

          // send to ssb for write
          var m = queue.shift()
          ssb.add(create(keys, null, m.message, prev), function (err, addedmsg) {
            writing = false
            if (!err)
              prev = addedmsg.value

            m.cb(err, addedmsg)
            write() // continue to drain queue
          })
        }
      }
      return this
    })
  }
}
