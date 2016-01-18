# ssb-feed

appendable to an ssb feed.

## Example

``` js

var Feed = require('ssb-feed')
//can be a client instance, or a local scuttlebot instance.
var ssbc = require('ssb-client')()
var ssbKeys = require('ssb-keys')

var alice = ssbKeys.generate()
var f = Feed(ssbc, alice)

//post to alice's feed.
f.publish({type: 'post', text: 'hello world, I am alice.'}, function (err) {})
```

## License

MIT

