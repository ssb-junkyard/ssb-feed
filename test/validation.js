'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var explain  = require('explain-error')
var ssbKeys  = require('ssb-keys')

function encode (obj) {
  return JSON.stringify(obj, null, 2)
}

var u = require('./util')


var createFeed = require('../')

var opts = ssbKeys
opts.keys = opts


u.sync(function (async) {

  var ssb = require('./mock')(async)
  var create = require('../util').create

  var validate = require('../validator')(ssb, opts)

  tape('single', function (t) {
    var keys = opts.keys.generate()
    var msg = create(keys, null, {type: 'init', public: keys.public})

    validate(msg, function (err, msg) {
      if(err) throw err
      ssb.get(msg.key, function (err, _msg) {
        t.deepEqual(_msg, msg.value)
        t.end()
      })
    })
  })

  tape('simple', function (t) {
    var keys = opts.keys.generate()
    var prev
    var messages = [
      prev = create(keys, null, {type: 'init', public: keys.public}),
      prev = create(keys, 'msg', 'hello', prev),
      prev = create(keys, 'msg', 'hello2', prev)
    ]

    var _msg = null
    messages.forEach(function (msg) {
      validate(msg, function (err) {
        if(_msg)
          t.equal('%'+opts.hash(encode(_msg)), msg.previous)
        _msg = msg
        if(err) throw err
        if(msg.sequence === 3)
          t.end()
      })
    })
  })

  tape('add & validate', function (t) {
    var keys = opts.keys.generate()
    var prev
    ssb.add(
      prev = create(keys, null, {type: 'init', public: keys.public}),
      function (err) {
        if(err) throw explain(err, 'init failed')

        ssb.add(
          prev = create(keys, 'msg', 'hello', prev),
          function (err) {
            if(err) throw explain(err, 'hello failed')

            ssb.add(
              prev = create(keys, 'msg', 'hello2', prev),
              function (err) {
                if(err) throw explain(err, 'hello2 failed')
                pull(
                  ssb.createFeedStream({ keys: false }),
                  pull.collect(function (err, ary) {
                    if(err) throw explain(err, 'createFeedStream failed')
                    t.deepEqual(ary.pop(), prev)
                    t.end()
                  })
                )
              }
            )
          }
        )
      }
    )
  })

  tape('race: should queue', function (t) {
    var keys = opts.keys.generate()
    var prev, calls = 0
    ssb.add(
      prev = create(keys,null, {type:  'init', public: keys.public}),
      function (err) {
        if(err) throw err
        calls ++
      }
    )
    ssb.add(
      prev = create(keys, 'msg', 'hello', prev),
      function (err) {
        if(err) throw err
        calls ++
      }
    )
    ssb.add(
      prev = create(keys, 'msg', 'hello2', prev),
      function (err) {
        if(err) throw err
        calls ++
      }
    )
    setTimeout(function () {
      ssb.add(
        prev = create(keys, 'msg', 'hello3', prev),
        function (err) {
          if(err) throw err
          calls ++
          t.equal(calls, 4)
          t.end()
        }
      )
    })
  })

  tape('too big', function (t) {
    var keys = opts.keys.generate()
    var str = ''
    for (var i=0; i < 808; i++) str += '1234567890'

    var msg = create(keys, null, {type: 'msg', value: str})

    validate(msg, function (err, msg) {
      if(!err) throw new Error('too big was allowed')
      t.end()
    })
  })

})
