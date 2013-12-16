module.exports = replaceScans

var spigot = require("stream-spigot")
var xtend = require("xtend")
var through2 = require("through2")

function replaceScans(redis) {
  var clientProto = redis.RedisClient.prototype
  clientProto.scan = clientProto.SCAN = scan
  clientProto.sscan = clientProto.sscan = sscan
  clientProto.hscan = clientProto.hscan = hscan
  clientProto.zscan = clientProto.zscan = zscan
  return redis
}

function scan(options) {
  var client = this
  options = xtend({command: "scan"}, options)
  if (options.match)
    options.pattern = options.match
  if (options.command != "scan" && options.key == null) {
    throw new Error("[S|H|Z]SCAN commands require a key name")
  }
  var ended = false

  // TODO replace the buffering with _writev when 0.12 is released.
  var buffer = []

  // TODO want_buffers or detect_buffers?
  var stream = spigot({objectMode: true}, function (n) {
    var self = this
    if (buffer.length > 0) {
      return self.push(buffer.shift())
    }
    getMore(function (err) {
      if (err) {
        self.emit("error", err)
        self.push(null)
      }
      if (buffer.length > 0)
        self.push(buffer.shift())
      else if (ended)
        self.push(null)
    })
  })

  var cursor = 0
  var cursorIdx = 0

  var args = []
  if (options.key != null) {
    args.push(options.key)
    cursorIdx = 1
  }
  args.push(cursor)
  if (options.pattern != null)
    args = args.concat(["MATCH", options.pattern])
  if (options.count != null)
    args = args.concat(["COUNT", options.count])

  function getMore(cb) {
    if (ended)
      return setImmediate(cb)

    args[cursorIdx] = cursor
    client.send_command(options.command, args, function (err, reply) {
      if (err) return cb(err)
      cursor = reply[0]
      if (cursor == 0)
        ended = true
      if (reply[1].length == 0 && !ended)
        return getMore(cb)
      buffer = buffer.concat(reply[1])
      cb()
    })
  }

  return stream
}

function sscan(key, options) {
  return this.scan(xtend({command: "sscan", key: key}, options))
}

var PairWise = through2.ctor({objectMode: true}, function (chunk, encoding, callback) {
  var isValue = this.keyName != null
  if (isValue) {
    this.push({key: this.keyName, value: chunk})
    this.keyName = null
    return callback()
  }
  this.keyName = chunk
  return callback()
})

function hscan(key, options) {
  return this.scan(xtend({command: "hscan", key: key}, options))
    .pipe(PairWise())
}

function zscan(key, options) {
  return this.scan(xtend({command: "zscan", key: key}, options))
    .pipe(PairWise())
}