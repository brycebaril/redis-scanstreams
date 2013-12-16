redis-scanstreams
=====

[![NPM](https://nodei.co/npm/redis-scanstreams.png)](https://nodei.co/npm/redis-scanstreams/)

[![david-dm](https://david-dm.org/brycebaril/redis-scanstreams.png)](https://david-dm.org/brycebaril/redis-scanstreams/)
[![david-dm](https://david-dm.org/brycebaril/redis-scanstreams/dev-status.png)](https://david-dm.org/brycebaril/redis-scanstreams#info=devDependencies/)

Provides a streaming interface to the Redis *SCAN commands.

Replaces the SCAN, SSCAN, HSCAN, and ZSCAN methods on the [node_redis](http://npm.im/redis) client with streaming versions.

You can read more about SCAN [here](http://redis.io/commands/scan)

```javascript
var redis = require("redis")

// replace the methods for any clients
require("redis-scanstreams")(redis)

var client = redis.createClient()
var tail = require("terminus").tail

client.scan()
  .pipe(tail({objectMode: true}, console.log)
```

API
===

`scanStreams(redis_library)`
---

Replaces the *SCAN methods in the provided library. Assumes `node_redis` or a library that similarly exposes the `RedisClient` type which has the *SCAN methods.

`client.scan(options)`
---

Calls the `scan` command, walking the cursor through the entire keyspace. Returns a `stream.Readable` containing the redis keyspace.

Options:
  * `pattern`: the pattern to match keys against
  * `count`: how many (max estimate) records to return per batch

e.g.
```js
client.scan({pattern: "key:*", count: 1000})
```

`client.sscan(key, options)`
---

Calls the `sscan` command on key `key`. Key must be a Redis Set. Options are identical to `SCAN`. Provides a `stream.Readable` containing set members.

`client.hscan(key, options)`
---

Calls the `hscan` command on key `key`. Key must be a Redis Hash. Options are identical to `SCAN`. Provides a `stream.Readable` containing hash key/value pairs, i.e.:

```js
[
  {key: "hash_key_1", value: "value at hash_key_1"},
  {key: "hash_key_2", value: "value at hash_key_2"},
  ...
]
```

`client.zscan(key, options)`
---

Calls the `zscan` command on key `key`. Key must be a Redis Zset. Options are identical to `SCAN`. Provides a `stream.Readable` containing hash member/score pairs, i.e.:

```js
[
  {key: "zset_member_1", value: "score for zset_member_1"},
  {key: "zset_member_2", value: "score for zset_member_2"},
  ...
]
```

LICENSE
=======

MIT
