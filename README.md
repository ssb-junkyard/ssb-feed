# ssb-feed

A publishing interface for scuttlebutt feeds.

Track the state necessary to publish ssb feeds. This is built into secure-scuttlebutt,
where it validates replicated messages, and it is also used "remotely" in patchbay.

By default, [Scuttlebot](https://ssbc.github.io/scuttlebot/) uses a "master" identity/feed,
which `sbot.publish()` will append new messages to. If you want to manipulate additional feeds,
you can load the keypair and then use this library to do so.

## Example

``` js

var ssbFeed = require('ssb-feed')
var ssbClient = require('ssb-client')
var ssbKeys = require('ssb-keys')

var alice = ssbKeys.generate()
ssbClient(function (err, sbot) {
  var feed = ssbFeed(sbot, alice)

  // Post to alice's feed
  feed.publish({
    type: 'post',
    text: 'hello world, I am alice.'
  }, function (err) { ... })

  // Also available:
  console.log(feed.id)
  console.log(feed.keys)
})
```

This example uses `ssb-client`, but, if you're embedding `scuttlebot` or the `secure-scuttlebutt` library into your process, you can use them locally.

## License

MIT

