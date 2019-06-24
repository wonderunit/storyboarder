const findParent = obj => {
  while (obj) {
    if (!obj.parent || obj.parent.type === 'Scene' || obj.parent.userData.type === 'world-scale') {
      return obj
    }
    obj = obj.parent
  }

  return null
}

module.exports = {
  findParent
}
