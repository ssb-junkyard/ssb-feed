'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var ssbKeys  = require('ssb-keys')
var createFeed = require('../')
var opts = ssbKeys

tape('simple', function (t) {

  var ssb = require('./mock')()

  var feed = createFeed(ssb, opts.generate(), opts)

  feed.add({type: 'msg', value: 'hello there!'}, function (err, msg) {
    if(err) throw err
    console.log('added', msg)
    t.assert(!!msg)
    t.assert(!!msg.key)
    t.assert(!!msg.value)
    pull(
      ssb.createFeedStream(),
      pull.collect(function (err, ary) {
        if(err) throw err
        console.log('**************************')
        console.log(JSON.stringify(ary, null, 2))

        t.equal(ary.length, 1)
        t.ok(!!ary[0].key)
        t.ok(!!ary[0].value)
        t.end()
      })
    )
  })

})

tape('tail', function (t) {

  var ssb = require('./mock')()

  var feed = createFeed(ssb, opts.generate(), opts)

  console.log('add 1'); console.log('add 2');
  var nDrains = 0, nAdds = 2;

  feed.add({
    type: 'msg',
    value:'hello there!'
  }, function (err, msg1) {

    if(err) throw err
    var lasthash = msg1.key

    function addAgain() {
      feed.add({type: 'msg', value: 'message '+nDrains}, function(err, msgX) {
        if(err) throw err
        t.equal(msgX.value.previous, lasthash)
        console.log(msgX.value.previous, lasthash)
        lasthash = msgX.key;
        nAdds++;
        console.log('add', nAdds);
        if (err) throw err;
        if (nAdds > 7) {
          console.log('TIMEOUT');
          throw new Error('Should have had 5 drains by now.');
        }
      });
    }

    var int = setInterval(addAgain, 100);

    pull(
      ssb.createFeedStream({ live: true }),
      pull.drain(function (ary) {
        nDrains++;
        if (nDrains == 5) {
          t.assert(true);
          t.end()
          clearInterval(int);
        }
      })
    )
    addAgain();
  })
})

tape('tail, parallel add', function (t) {

  var ssb = require('./mock')()

  var feed = createFeed(ssb, opts.generate(), opts)

  var nDrains = 0, nAdds = 2, l = 7
  feed.add({type: 'msg', value: 'hello there!'}, function (err, msg1) {
    if(err) throw err

    var lasthash = msg1.key
    function addAgain() {
      feed.add('msg', 'message '+nDrains, function(err, msgX) {
        t.equal(msgX.value.previous, lasthash)
        lasthash = msgX.key;
        nAdds++;
        if (err) throw err;
      });
      if(--l) addAgain()
    }

    pull(
      ssb.createFeedStream({ live: true }),
      pull.drain(function (ary) {
        nDrains++;
        console.log('drain', nDrains)
        if (nDrains == 7) {
          t.assert(true);
          t.end()
        }
      })
    )
    addAgain()
  })
})

tape('too big', function (t) {
  var ssb = require('./mock')()
  var keys = opts.generate()
  var feed = createFeed(ssb, opts.generate(), opts)
  var str = ''
  for (var i=0; i < 808; i++) str += '1234567890'

  feed.add({type: 'msg', value: str}, function (err, msg) {
    if(!err) throw new Error('too big was allowed')
    t.end()
  })
})

