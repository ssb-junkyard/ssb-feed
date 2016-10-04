'use strict'
var tape     = require('tape')
var pull     = require('pull-stream')
var ssbKeys  = require('ssb-keys')
var createFeed = require('../')
var ssbkeys = ssbKeys

var crypto = require('crypto')

var seed = crypto.createHash('sha256').update('test1').digest()
var sign_cap = crypto.createHash('sha256').update('test1').digest()
var assert = require('assert')

module.exports = function (createMock, createAsync, opts) {


  tape('simple', function (t) {
    createAsync(function (async) {
      var ssb1 = createMock(async, {})
      var ssb2 = createMock(async, {caps: {sign: sign_cap}})

      var feed = createFeed(ssb1, ssbkeys.generate('ed25519', seed), opts)

      feed.add({type: 'msg', value: 'hello there!'}, function (err, msg) {
        if(err) throw err
        console.log('added', msg)
        assert.ok(!!msg)
        assert.ok(!!msg.key)
        assert.ok(!!msg.value)
        ssb2.add(msg.value, function (err) {
          t.ok(err)
          t.ok(/signature was invalid/.test(err.message))
          console.log(err)
          t.end()
        })
      })
    })
  })

  tape('check that default validates old default messages', function (t) {
    createAsync(function (async) {

      var ssb1 = createMock(async, {})
      var ssb2 = createMock(async, {caps: {sign: sign_cap}})

      var data = { //first message in my log.
        "key": "%7iU6nEO35X37x7lFGXpwx8fWFDFIwAaxQNu2ySVVz10=.sha256",
        "value": {
          "previous": null,
          "author": "@EMovhfIrFk4NihAKnRNhrfRaqIhBv1Wj8pTxJNgvCCY=.ed25519",
          "sequence": 1,
          "timestamp": 1449201626119,
          "hash": "sha256",
          "content": {
            "type": "about",
            "about": "@EMovhfIrFk4NihAKnRNhrfRaqIhBv1Wj8pTxJNgvCCY=.ed25519",
            "name": "Dominic_2"
          },
          "signature": "vyn7WnkamEjHvQ1/crAZgKUi6ucOcHkpG4uRdSMjZdJnT8eyyH63rCmsC4A0bmhDaDPEwCVHoOF4NQHiVS+0Cg==.sig.ed25519"
        },
        "timestamp": 1472327253354
      }

      ssb1.add(data.value, function (err, msg) {
        if(err) throw err

        ssb2.add(data.value, function (err) {
          t.ok(/signature was invalid/.test(err.message))
          t.end()
        })
      })
    })
  })
}




if(!module.parent) {
  module.exports(require('./mock'), require('./util').sync)

}









