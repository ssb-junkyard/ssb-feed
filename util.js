var ssbKeys = require('ssb-keys')
var encode = require('./codec').encode
var timestamp = require('monotonic-timestamp')

function isString (s) {
  return 'string' === typeof s
}

function isInteger (n) {
  return ~~n === n
}

function isObject (o) {
  return o && 'object' === typeof o
}

function clone (obj) {
  var o = {}
  for(var k in obj) o[k] = obj[k];
  return o
}

exports.BatchQueue = function BatchQueue (db) {

  var batch = [], writing = false

  function drain () {
    writing = true
    var _batch = batch
    batch = []

    db.batch(_batch, function () {
      writing = false
      write.size = batch.length
      if(batch.length) drain()
      _batch.forEach(function (op) {
        op.cb(null, {key:op.key, value: op.value})
      })
    })
  }

  function write (op) {
    batch.push(op)
    write.size = batch.length
    if(!writing) drain()
  }

  write.size = 0

  return write
}

exports.create = function (keys, type, content, prev, prev_key) {

  //this noise is to handle things calling this with legacy api.
  if(isString(type) && (Buffer.isBuffer(content) || isString(content)))
    content = {type: type, value: content}
  if(isObject(content))
    content.type = content.type || type
  //noise end

  prev_key = !prev_key && prev ? ssbKeys.hash(encode(prev)) : prev_key || null

  return ssbKeys.signObj(keys, {
    previous: prev_key,
    author: keys.id,
    sequence: prev ? prev.sequence + 1 : 1,
    timestamp: timestamp(),
    hash: 'sha256',
    content: content,
  })
}


exports.validate = function validateSync (pub, msg, previous) {
  // :TODO: is there a faster way to measure the size of this message?

  var key = previous.key
  var prev = previous.value

  var asJson = encode(msg)
  if (asJson.length > 8192) { // 8kb
    validateSync.reason = 'encoded message must not be larger than 8192 bytes'
    return false
  }

  //allow encrypted messages, where content is a base64 string.
  if(!isString(msg.content)) {
    var type = msg.content.type
    if(!isString(type)) {
      validateSync.reason = 'type property must be string'
      return false
    }

    if(52 < type.length || type.length < 3) {
      validateSync.reason = 'type must be 3 < length <= 52, but was:' + type.length
      return false
    }
  }

  if(prev) {
    if(msg.previous !== key) {

      validateSync.reason = 'expected previous: '
        + hash(encode(prev)).toString('base64') + 'but found:' + msg.previous

      return false
    }
    if(msg.sequence !== prev.sequence + 1
     || msg.timestamp <= prev.timestamp) {

        validateSync.reason = 'out of order'

        return false
    }
  }
  else {
    if(!(msg.previous == null
      && msg.sequence === 1 && msg.timestamp > 0)) {

        validateSync.reason = 'expected initial message'

        return false
    }
  }

  var _pub = pub.public || pub
  if(!(msg.author === _pub || msg.author === hash(_pub))) {

    validateSync.reason = 'expected different author:'+
      hash(pub.public || pub).toString('base64') +
      'but found:' +
      msg.author.toString('base64')

    return false
  }

  if(!ssbKeys.verifyObj(pub, msg)) {
    validateSync.reason = 'signature was invalid'
    return false
  }
  validateSync.reason = ''
  return true
}

