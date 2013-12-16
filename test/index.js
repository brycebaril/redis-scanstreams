var test = require("tape").test
var terminus = require("terminus")
var redis = require("redis")

var PORT = 6379
var HOST = '127.0.0.1'
var DBNUM = 15

var scanStreams = require("../scan_streams")
scanStreams(redis)

function getClient() {
  var client = redis.createClient(PORT, HOST)
  client.select(DBNUM)
  return client
}


test("commands substituted", function (t) {
  var client = getClient()
  t.ok(client.scan && typeof client.scan == "function", "has scan")
  t.ok(client.SCAN && typeof client.SCAN == "function", "has SCAN")
  t.equals(client.scan.length, 1, "scan replaced with custom scan")

  t.ok(client.sscan && typeof client.sscan == "function", "has sscan")
  t.ok(client.SSCAN && typeof client.SSCAN == "function", "has SSCAN")
  t.equals(client.sscan.length, 2, "sscan replaced with custom sscan")

  t.ok(client.hscan && typeof client.hscan == "function", "has hscan")
  t.ok(client.HSCAN && typeof client.HSCAN == "function", "has HSCAN")
  t.equals(client.hscan.length, 2, "hscan replaced with custom hscan")

  t.ok(client.zscan && typeof client.zscan == "function", "has zscan")
  t.ok(client.ZSCAN && typeof client.ZSCAN == "function", "has ZSCAN")
  t.equals(client.zscan.length, 2, "zscan replaced with custom zscan")

  client.quit(function () {
    t.end()
  })
})

test("setup", function (t) {
  var client = getClient()
  client.flushdb()
  client.send_command("DEBUG", ["POPULATE", 50])
  var hash = {}
  var set = []
  var zset = ["zset:1"]
  for (var i = 0; i < 500; i++) {
    hash["key_" + i] = "value_" + i
    set.push("member_" + i)
    zset.push(i, "z_member_" + i)
  }
  client.hmset("hash:1", hash)
  client.sadd("set:1", set)
  client.send_command("zadd", zset)
  client.quit(function () {
    t.end()
  })
})

test("simple scan", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 53, "Correct number of records")
    t.ok(records.indexOf("key:10") >= 0, "has an expected key")
    t.ok(records.indexOf("hash:1") >= 0, "has an expected key")
    client.quit(function () {
      t.end()
    })
  }

  client.scan()
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple scan w/ pattern", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 50, "Correct number of records")
    t.ok(records.indexOf("key:10") >= 0, "has an expected key")
    t.ok(records.indexOf("set:1") == -1, "key was excluded")
    client.quit(function () {
      t.end()
    })
  }

  client.scan({pattern: "key:*"})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple scan w/ count", function (t) {
  var client = getClient()

  // TODO should actually check that count was obeyed here...

  function checkResults(records) {
    t.equals(records.length, 53, "Correct number of records")
    t.ok(records.indexOf("key:10") >= 0, "has an expected key")
    t.ok(records.indexOf("hash:1") >= 0, "has an expected key")
    client.quit(function () {
      t.end()
    })
  }

  client.scan({count: 25})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple scan w/ pattern & count", function (t) {
  var client = getClient()

  // TODO should actually check that count was obeyed here...

  function checkResults(records) {
    t.equals(records.length, 50, "Correct number of records")
    t.ok(records.indexOf("key:10") >= 0, "has an expected key")
    t.ok(records.indexOf("set:1") == -1, "key was excluded")
    client.quit(function () {
      t.end()
    })
  }

  client.scan({pattern: "key:*", count: 25})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple hscan", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 500, "Correct number of records")
    var found = records.filter(function (e) {
      if (e.key == "key_10") return true
      if (e.value == "value_333") return true
      return false
    })
    t.equals(found.length, 2, "Found expected records")
    client.quit(function () {
      t.end()
    })
  }

  client.hscan("hash:1")
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple hscan w/ pattern", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 111, "Correct number of records")
    var found = records.filter(function (e) {
      if (e.key == "key_10") return true
      if (e.value == "value_333") return true
      return false
    })
    t.equals(found.length, 1, "Found expected records")
    client.quit(function () {
      t.end()
    })
  }

  client.hscan("hash:1", {pattern: "key_3*"})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple sscan", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 500, "Correct number of records")
    t.ok(records.indexOf("member_10") >= 0, "has an expected key")
    t.ok(records.indexOf("member_333") >= 0, "has an expected value")
    client.quit(function () {
      t.end()
    })
  }

  client.sscan("set:1")
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple sscan w/ pattern", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 111, "Correct number of records")
    t.ok(records.indexOf("member_10") == -1, "key was excluded")
    t.ok(records.indexOf("member_333") >= 0, "has an expected value")
    client.quit(function () {
      t.end()
    })
  }

  client.sscan("set:1", {pattern: "member_3*"})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple zscan", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 500, "Correct number of records")
    var found = records.filter(function (e) {
      if (e.key == "z_member_10") return true
      if (e.key == "z_member_333") return true
      return false
    })
    t.equals(found.length, 2, "Found expected records")
    client.quit(function () {
      t.end()
    })
  }

  client.zscan("zset:1")
    .pipe(terminus.concat({objectMode: true}, checkResults))
})

test("simple zscan w/ pattern", function (t) {
  var client = getClient()

  function checkResults(records) {
    t.equals(records.length, 111, "Correct number of records")
    var found = records.filter(function (e) {
      if (e.key == "z_member_10") return true
      if (e.key == "z_member_333") return true
      return false
    })
    t.equals(found.length, 1, "One key now excluded")
    client.quit(function () {
      t.end()
    })
  }

  client.zscan("zset:1", {pattern: "z_member_3*"})
    .pipe(terminus.concat({objectMode: true}, checkResults))
})