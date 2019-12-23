

const clampElementToView = (container, node) => {
  let nodeElement = (node instanceof Node) ? node : container.childNodes[node]
  
  const nodeOverTheView = ((nodeElement.offsetTop + nodeElement.offsetHeight) > (container.scrollTop + container.offsetHeight))
  const nodeBehindTheView = (nodeElement.offsetTop < container.scrollTop)
  
  if (nodeOverTheView || nodeBehindTheView) {
    container.scrollTop = nodeElement.offsetTop
  }
}

export default clampElementToView
