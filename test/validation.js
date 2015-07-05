'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var explain  = require('explain-error')
var ssbKeys  = require('ssb-keys')
var codec    = require('../codec')

var createFeed = require('../')

var opts = ssbKeys
opts.keys = opts
  var create = require('../message')(opts)
  var ssb = require('./mock')()

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
          t.equal(opts.hash(codec.encode(_msg)), msg.previous)
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

