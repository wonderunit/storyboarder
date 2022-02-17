const remote = require('@electron/remote')
import React, { useEffect, useMemo } from 'react'
import menu from '../../../menu'
import i18n from '../../../services/i18next.config'
const onMenuFocus = () => {
  menu.setShotGeneratorMenu(i18n)
}
const MenuManager = ({ t }) => {

  useMemo(() => {
    onMenuFocus()
  }, [t])

  useEffect(() => {
    let win = remote.getCurrentWindow()
    win.on('focus', onMenuFocus)
    return function cleanup () {
      win.off('focus', onMenuFocus)
    }
  }, [])
  return null
}
export default MenuManager