const findMatchingAncestor = (child, list) => {
  if (list.includes(child)) return child

  let lastMatch = null
  child.traverseAncestors(o => {
    if (list.includes(o)) lastMatch = o
  })

  return lastMatch
}

module.exports = findMatchingAncestor
