class LineMileageCounter {
  constructor () {
    this.reset()
  }

  distance (p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y)
  }

  reset () {
    this.value = 0
    this.prev = null
  }

  add (curr) {
    if (this.prev) {
      this.value += this.diff(this.prev, curr)
    }
    this.prev = curr
  }

  get () {
    return this.value
  }

  diff (prev, curr) {
    let v = this.distance(prev, curr)
    return isNaN(v) ? 0 : v
  }
}

module.exports = LineMileageCounter
