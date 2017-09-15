const util = require('../../utils/index')
const tips = require('./tips')


class StoryTips {
  constructor (sfx, notifications) {
    this.sfx = sfx
    this.notifications = notifications
    this.tips = util.shuffle(tips)
  }

  show () {
    if (this.tips.length == 0) {
      this.tips = util.shuffle(tips)
    }
    let tip = this.tips.shift()
    this.sfx.positive()
    this.notifications.notify({message: tip, timing: 20})
  }

  getTipString () {
    if (this.tips.length == 0) {
      this.tips = util.shuffle(tips)
    }
    let tip = this.tips.shift()
    
    return tip.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(\r\n|\n|\r)/gm,'')
  }

}

module.exports = StoryTips