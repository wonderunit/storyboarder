import { remote } from 'electron'
import React, { useEffect } from 'react'
import menu from '../../../menu'
import i18n from '../../../services/i18next.config'
const onMenuFocus = () => {
  menu.setShotGeneratorMenu(i18n)
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