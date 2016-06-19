

module.exports = function (async) {

  var queue = [], working = false, prev = null

  function start () {
    if(working) return
    working = true
    ;(function next (item) {
      async(item.value, prev, function (err, result) {
        prev = result
        if(item.cb) item.cb(err, result)
        if(queue.length) next(queue.shift(), result)
        else
          working = false
      })
    })(queue.shift())
  }

  return function (value, cb) {
    queue.push({value: value, cb: cb})
    start()
  }

}






