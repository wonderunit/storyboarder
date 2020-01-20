import { remote } from 'electron'
import React, { useEffect } from 'react'
import menu from '../../../menu'

const onMenuFocus = () => {
  menu.setShotGeneratorMenu()
}
const MenuManager = ({ }) => {
  useEffect(() => {
    let win = remote.getCurrentWindow()
    win.on('focus', onMenuFocus)
    onMenuFocus()

    return function cleanup () {
      win.off('focus', onMenuFocus)
    }
  }, [])
  return null
}
export default MenuManager