const EventEmitter = require('events').EventEmitter
const moment = require('moment')

class PomodoroTimer extends EventEmitter {
  constructor(options={duration: 25*60*1000, updateInterval: 300}) {
    super()
    this.state = "rest"
    this.startTime = null
    this.duration = options.duration || 25*60*1000
    this.updateInterval = options.updateInterval || 300
    this.intervalID = null
    this.elapsed = 0
  }

  // Public Interface

  /**
   * 
   * @param {int} duration in minutes.
   */
  setDuration(duration) {
    this.duration = duration * 1000 * 60
  }

  start() {
    this.transitionToState("running")
  }

  cancel() {
    this.transitionToState("rest")
  }

  reset() {
    this.transitionToState("rest")
  }

  getElapsed() {
    return this.elapsed
  }

  getRemaining() {
    return this.duration - this.elapsed
  }

  // Private Interface

  timer() {
    this.elapsed = Date.now() - this.startTime
    let remaining = this.getRemaining()
    if(this.elapsed >= this.duration) {
      this.complete()
    } else {
      let mm = moment.duration(remaining)
      let remainingFriendly = `${ mm.hours() > 0 ? mm.hours()+":" : ""}${mm.minutes()}:${mm.seconds() > 9 ? mm.seconds() : '0'+mm.seconds()}`
      this.emit("update", {"elapsed": this.elapsed, "remaining": remaining, "state": this.state, "remainingFriendly": remainingFriendly})
    }
  }

  /**
   * Execute state transitions.
   * 
   * @param {string} nextState 
   */
  transitionToState(nextState) {
    let update = {}
    switch(this.state) {
      case "rest":
        switch(nextState) {
          case "running":
            this.startTime = Date.now()
            this.intervalID = setInterval(this.timer.bind(this), this.updateInterval)
            let remaining = this.getRemaining()
            let mm = moment.duration(remaining)
            let remainingFriendly = `${mm.minutes()}:${mm.seconds()}`
            update = {"elapsed": this.elapsed, "remaining": remaining, "state": this.state, "remainingFriendly": remainingFriendly}
            break
        }
        break;
      case "running":
        switch(nextState) {
          case "completed":
            update = {"elapsed": this.elapsed, "remaining": this.getRemaining()}
            break
          case "rest":
            this.rest()
            break
        }
        break;
      case "completed":
        switch(nextState) {
          
        }
        this.state = nextState
        break;
    }

    this.state = nextState
    update = Object.assign({"state": this.state}, update)
    this.emit("update", update)
  }

  complete() {
    clearTimeout(this.intervalID)
    this.startTime = null
    this.intervalID = null
    this.elapsed = 0
    this.transitionToState("completed")
  }

  rest() {
    clearTimeout(this.intervalID)
    this.startTime = null
    this.intervalID = null
    this.elapsed = 0
  }
}

module.exports = PomodoroTimer