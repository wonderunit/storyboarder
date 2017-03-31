const EventEmitter = require('events').EventEmitter

// via: right-now
const now = () => {
  var time = process.hrtime()
  return time[0] * 1e3 + time[1] / 1e6
}

class Engine extends EventEmitter {
  constructor (fn) {
    super(fn)
    this.running = false
    this.last = now()
    this._delay = 1/60 * 1000 * 3
    this._timer = null
    this._tick = this.tick.bind(this)

    if (fn)
      this.on('tick', fn)
  }

  start () {
    if (this.running) 
        return
    this.running = true
    this.last = now()
    this._timer = setTimeout(this._tick, this._delay)
    return this
  }

  stop () {
    this.running = false
    if (this._timer)
        clearTimeout(this._timer)
    return this
  }

  tick () {
    this._timer = setTimeout(this._tick, this._delay)
    var time = now()
    var dt = time - this.last
    this.emit('tick', dt)
    this.last = time
  }
}

module.exports = Engine
