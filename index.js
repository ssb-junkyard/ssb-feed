var cont = require('cont')
var util = require('./util')
var Queue = require('./queue')

var ssbKeys = require('ssb-keys')

function isFunction (f) {
  return 'function' === typeof f
}

function isObject (o) {
  return (
    o && 'object' === typeof o
    && !Buffer.isBuffer(o)
    && !Array.isArray(o)
  )
}

module.exports = function (ssb, keys, opts) {
  opts = opts || {}
  if(!ssb.add)
    throw new Error('*must* install feeds on ssb instance')

  var queue = Queue(function (msg, prev, cb) {
    if(prev && !opts.remote) next(prev)
    else
      ssb.getLatest(keys.id, function (err, prev) {
        if(err) cb(err)
        else next(prev)
      })

    function next (prev) {
      ssb.add(
        util.create(
          keys, null, msg,
          prev && prev.value,
          prev && prev.key
        ),
        cb
      )
    }
  })

  var publish =
    cont(function (type, message, cb) {
      // argument variations
      if (isFunction(message))    { cb = message; message = type } // add(msgObj, cbFn)
      else if (isObject(message)) { message.type = type } // add(typeStr, mgObj, cbFn)
      else                        { message = { type: type, value: message } } // add(typeStr, msgStr, cbFn)

      var err = util.isInvalidContent(message)
      if(err) return cb(err)

      queue(message, cb)

      return this
    })

  return {
    id: keys.id,
    keys: keys,
    add: publish,
    publish: publish
  }
}


