'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var ssbKeys  = require('ssb-keys')
var createFeed = require('../')
var opts = ssbKeys

var crypto = require('crypto')

var seed = crypto.createHash('sha256').update('test1').digest()
var assert = require('assert')

module.exports = function (createMock, createAsync) {

  tape('simple', function (t) {

    createAsync(function (async) {

      var ssb = createMock(async)

      var feed = createFeed(ssb, opts.generate('ed25519', seed), opts)

      feed.add({type: 'msg', value: 'hello there!'}, function (err, msg) {
        if(err) throw err
        console.log('added', msg)
        assert.ok(!!msg)
        assert.ok(!!msg.key)
        assert.ok(!!msg.value)
        pull(
          ssb.createFeedStream(),
          pull.collect(function (err, ary) {
            if(err) throw err
            assert.equal(ary.length, 1)
            assert.ok(!!ary[0].key)
            assert.ok(!!ary[0].value)
            async.done()
          })
        )
      })
    }, function (err) {
      if(err) throw err
      t.end()
    })
  })


  //write in series
  tape('tail', function (t) {
    createAsync(function (async) {
      var ssb = createMock(async)

      var feed = createFeed(ssb, opts.generate('ed25519', seed), opts)

      console.log('add 1'); console.log('add 2');
      var nDrains = 0, nAdds = 2;

      feed.add({
        type: 'msg',
        value:'hello there!'
      }, function (err, msg1) {

        if(err) throw err
        var lasthash = msg1.key

        pull(
          pull.values([1,2,3,4]),
          async.through(),
          pull.asyncMap(function (n, cb) {
            feed.add({type: 'msg', value: 'message '+n}, function(err, msgX) {
              if(err) throw err
              assert.equal(msgX.value.previous, lasthash)
              lasthash = msgX.key;
              cb()
            })
          }),
          pull.drain()
        )

        pull(
          ssb.createFeedStream({ live: true }),
          pull.drain(function (ary) {
            nDrains++;
            if (nDrains == 4) {
              async.done()
              return false
            }
          })
        )

      })
    }, function (err) {
      console.log(err)
      if(err) throw err
      t.end()
    })
  })

  tape('tail, parallel add', function (t) {
    createAsync(function (async) {
      var ssb = createMock(async)

      var feed = createFeed(ssb, opts.generate('ed25519', seed), opts)

      var nDrains = 0, nAdds = 2, l = 7
      feed.add({type: 'msg', value: 'hello there!'}, function (err, msg1) {
        if(err) throw err

        var lasthash = msg1.key

        function addAgain(n) {
          feed.add('msg', 'message '+n, function(err, msgX) {
//            assert.equal(msgX.value.previous, lasthash)
//            lasthash = msgX.key;
            nAdds++;
            if (err) throw err;
          });
        }

        var received = []

        pull(
          ssb.createFeedStream({ live: true }),
          pull.drain(function (msg) {
            nDrains++;
            received.push(msg)
            console.log('drain', nDrains)
            if (nDrains == 3) {
              assert.deepEqual(received.map(function (v) {
                return v.value.content.value
              }), ['hello there!', 'message 1', 'message 2'])
              async.done()
              return false
            }
          })
        )

        addAgain(1)
        addAgain(2)
//        addAgain(3)
//        addAgain(4)
      })
    }, function (err) {
      if(err) throw err
      t.end()
    })
  })

  tape('too big', function (t) {
    createAsync(function (async) {
      var ssb = createMock(async)
      var keys = opts.generate()
      var feed = createFeed(ssb, opts.generate('ed25519', seed), opts)
      var str = ''
      for (var i=0; i < 808; i++) str += '1234567890'

      feed.add({type: 'msg', value: str}, function (err, msg) {
        if(!err) throw new Error('too big was allowed')
        async.done()
      })
    }, function (err) {
      if(err) throw err  
      t.end()
    })
  })

}

if(!module.parent)
  module.exports(require('./mock'), require('./util').sync)
















