var cont = require('cont')
var util = require('./util')

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

module.exports = function (ssb, keys) {

  if(!ssb.add)
    throw new Error('*must* install feeds on this ssb instance')

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
    add: cont(function (type, message, cb) {
      // argument variations
      if (isFunction(message))    { cb = message; message = type } // add(msgObj, cbFn)
      else if (isObject(message)) { message.type = type } // add(typeStr, mgObj, cbFn)
      else                        { message = { type: type, value: message } } // add(typeStr, msgStr, cbFn)

      var err = util.isInvalidContent(message)
      if(err) return cb(err)

      return ssb.add.queue(keys.id, function (key, value) {
        return util.create(keys, null, message, value, key)
      }, cb)

      return this
    })
  }
}
