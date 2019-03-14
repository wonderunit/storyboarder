const getFillColor = state => state.toolbar.tools[state.toolbar.activeTool].color
const getFillAlpha = state => state.toolbar.tools[state.toolbar.activeTool].strokeOpacity

module.exports = {
  getFillColor,
  getFillAlpha
}
