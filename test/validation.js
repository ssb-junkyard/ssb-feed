'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var explain  = require('explain-error')
var ssbKeys  = require('ssb-keys')
var codec    = require('../codec')

var opts = ssbKeys
opts.keys = opts
  var create = require('../message')(opts)
  var ssb = require('./mock')()

  var validation = require('../validator')(ssb, opts)

  tape('getLastest - empty', function (t) {
    var keys = opts.keys.generate()
    validation.getLatest(keys.id, function (err, obj) {
      t.deepEqual({
        key: null, value: null, type: 'put',
        public: null, ready: true
      }, obj)
      t.end()
    })
  })
  
  tape('single', function (t) {
    var keys = opts.keys.generate()
    var msg = create(keys, null, {type: 'init', public: keys.public})

    validation.validate(msg, function (err) {
      if(err) throw err
      validation.getLatest(msg.author, function (err, obj) {
        if(err) throw err
        t.ok(obj)
        t.deepEqual({
          key: opts.hash(codec.encode(msg)), value: msg, type: 'put',
          public: keys.public, ready: true
        }, obj)

        validation.getLatest(opts.hash(msg.author), function (err, obj) {
          t.deepEqual({
            key: null, value: null, type: 'put',
            public: null, ready: true
          }, obj)
          t.end()
        })
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
      validation.validate(msg, function (err) {
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
  return
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

  //when an add fails, you should still be able to add another
  //message if you wait until it has returned.

  tape('too big', function (t) {
    var keys = opts.keys.generate()
    var feed = ssb.createFeed(keys)
    var str = ''
    for (var i=0; i < 808; i++) str += '1234567890'
    feed.add({ type: 'msg', value: str }, function (err) {
      if(!err) throw new Error('too big was allowed')
      console.log(err)
      feed.add({ type: 'msg', value: 'this ones cool tho' }, function (err) {
        if (err) throw err
        t.end()
      })
    })
  })


