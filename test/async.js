

var interleavings = require('interleavings')
var u = require('./util')

var testFeed = require('./feed')

testFeed(require('./mock'), interleavings.test)

testFeed(u.remote, interleavings.test)


