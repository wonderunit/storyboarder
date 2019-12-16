Array.prototype.remove = function(object) {
    let indexOf = this.indexOf(object)
    if(indexOf !== -1) {
        this.splice(indexOf, 1)
    }
}