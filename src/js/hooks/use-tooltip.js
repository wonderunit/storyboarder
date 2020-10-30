import React, {useCallback, useEffect, useRef, useMemo} from 'react'

import {acceleratorAsHtml} from '../utils'

const triangleSize = 10.0

const tooltipVerticalOffset = {
  top: (element, content) => -content.offsetHeight - triangleSize,
  bottom: (element, content) => element.offsetHeight + triangleSize
}

const tooltipHorizontalOffset = {
  left: (element, content) => -content.offsetWidth - triangleSize,
  right: (element, content) => element.offsetWidth + triangleSize
}

const tooltipOffset = {
  'top left': (element, content) => ({
    heightOffset: tooltipVerticalOffset.top(element, content),
    widthOffset: 0
  }),
  'top center': (element, content) => ({
    heightOffset: tooltipVerticalOffset.top(element, content),
    widthOffset: element.offsetWidth * 0.5 - content.offsetWidth * 0.5
  }),
  'top right': (element, content) => ({
    heightOffset: tooltipVerticalOffset.top(element, content),
    widthOffset: element.offsetWidth - content.offsetWidth
  }),

  'bottom left': (element, content) => ({
    heightOffset: tooltipVerticalOffset.bottom(element, content),
    widthOffset: 0
  }),
  'bottom center': (element, content) => ({
    heightOffset: tooltipVerticalOffset.bottom(element, content),
    widthOffset: element.offsetWidth * 0.5 - content.offsetWidth * 0.5
  }),
  'bottom right': (element, content) => ({
    heightOffset: tooltipVerticalOffset.bottom(element, content),
    widthOffset: element.offsetWidth - content.offsetWidth
  }),

  'right top': (element, content) => ({
    heightOffset: 0,
    widthOffset: tooltipHorizontalOffset.right(element, content)
  }),
  'right middle': (element, content) => ({
    heightOffset: element.offsetHeight * 0.5 - content.offsetHeight * 0.5,
    widthOffset: tooltipHorizontalOffset.right(element, content)
  }),
  'right bottom': (element, content) => ({
    heightOffset: element.offsetHeight - content.offsetHeight,
    widthOffset: tooltipHorizontalOffset.right(element, content)
  }),

  'left top': (element, content) => ({
    heightOffset: 0,
    widthOffset: tooltipHorizontalOffset.left(element, content)
  }),
  'left middle': (element, content) => ({
    heightOffset: element.offsetHeight * 0.5 - content.offsetHeight * 0.5,
    widthOffset: tooltipHorizontalOffset.left(element, content)
  }),
  'left bottom': (element, content) => ({
    heightOffset: element.offsetHeight - content.offsetHeight,
    widthOffset: tooltipHorizontalOffset.left(element, content)
  }),
}

const tooltipContent = (title, description, keys, position = 'top center') => {
  const div = document.createElement('div')
  div.className = `tooltip ${position.replace(' ', '-')}`
  div.innerHTML = `
    <div class='title'>${title}</div>
    <div class='description'>${description}</div>
    ${keys ? `<div class='key-command'>${acceleratorAsHtml(keys)}</div>` : ''}
    `
  
  return div
}

/**
 * Creates a tooltip
 * @param {String} title Tooltip title
 * @param {String} description Tooltip description
 * @param {String|null|undefined} keys Keyboard keys
 * @param {String|undefined} position Tooltip position
 * @param {Number} time Ms to wait until tooltip is shown
 * @returns {Object} Events to attach
 */
const useTooltip = (title, description, keys, position = 'top center', time = 2000) => {
  const content = useMemo(() => tooltipContent(title, description, keys, position), [title])
  const timeoutRef = useRef(-1)
  const offsets = tooltipOffset[position] || tooltipOffset['top center']
  const onPointerEnter = useCallback((event) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    
    timeoutRef.current = setTimeout(() => {
      document.body.appendChild(content)
      
      const {heightOffset, widthOffset} = offsets(element, content)

      content.style.top = `${rect.top + heightOffset}px`
      content.style.left = `${rect.left + widthOffset}px`
    }, time)
  }, [title])

  const onPointerLeave = useCallback(() => {
    if (timeoutRef.current !== -1) {
      clearTimeout(timeoutRef.current)
    }
    if (content.parentNode) {
      content.parentNode.removeChild(content)
    }
  }, [title])
  
  useEffect(() => () => {
    if (content.parentNode) {
      content.parentNode.removeChild(content)
    }
  }, [])

  return {
    onPointerEnter,
    onPointerLeave,
    onPointerDown: onPointerLeave,
    onPointerUp: onPointerLeave
  };
}

export default useTooltip
