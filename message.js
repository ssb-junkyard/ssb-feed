
var timestamp = require('monotonic-timestamp')

function isObject (o) {
  return o && 'object' === typeof o
}

function isString (s) {
  return 'string' === typeof s
}

module.exports = function (opts) {

  function sign (msg, keys) {

    msg.signature =
      opts.keys.sign(keys, opts.hash(opts.codec.encode(msg)))

    return msg
  }

  function create (keys, type, content, prev) {

    //this noise is to handle things calling this with legacy api.
    if(isString(type) && (Buffer.isBuffer(content) || isString(content)))
      content = {type: type, value: content}
    if(isObject(content))
      content.type = content.type || type
    //noise end

    return sign({
      previous: prev ? opts.hash(opts.codec.encode(prev)) : null,
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
