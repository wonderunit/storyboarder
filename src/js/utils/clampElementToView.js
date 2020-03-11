

const clampElementToView = (container, node) => {
  let nodeElement = (node instanceof Node) ? node : container.childNodes[node]
  
  const nodeOverTheView = ((nodeElement.offsetTop + nodeElement.offsetHeight) > (container.scrollTop + container.offsetHeight))
  const nodeBehindTheView = (nodeElement.offsetTop < container.scrollTop)
  
  if (nodeOverTheView || nodeBehindTheView) {
    container.scrollTo({
      top: nodeElement.offsetTop,
      left: nodeElement.offsetLeft,
      behavior: 'smooth'
    })
  }
}

export default clampElementToView
