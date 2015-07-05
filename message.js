
var timestamp = require('monotonic-timestamp')
var ssbKeys = require('ssb-keys')
var encode = require('./codec').encode

function isObject (o) {
  return o && 'object' === typeof o
}

function isString (s) {
  return 'string' === typeof s
}

module.exports = function (opts) {

  function sign (msg, keys) {

    msg.signature = ssbKeys.sign(keys, encode(msg))

    return msg
  }

  function create (keys, type, content, prev, prev_key) {

    //this noise is to handle things calling this with legacy api.
    if(isString(type) && (Buffer.isBuffer(content) || isString(content)))
      content = {type: type, value: content}
    if(isObject(content))
      content.type = content.type || type
    //noise end

    prev_key = !prev_key && prev ? ssbKeys.hash(encode(prev)) : prev_key || null

    return sign({
      previous: prev_key,
      author: keys.id,
      sequence: prev ? prev.sequence + 1 : 1,
      timestamp: timestamp(),
      hash: 'sha256',
      content: content,
    }, keys)
  }

  create.sign = sign

  return create
}
