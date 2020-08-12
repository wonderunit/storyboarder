
import React from 'react'
import classNames from 'classnames'
import { toggleWorkspaceGuide } from '../../../shared/reducers/shot-generator'
import { connect } from 'react-redux'
import Icon from '../Icon'
import { useTranslation } from 'react-i18next'
const preventDefault = (fn, ...args) => e => {
    e.preventDefault()
    fn(e, ...args)
  }

  
const GuidesInspector = connect(
  state => ({
    center: state.workspace.guides.center,
    thirds: state.workspace.guides.thirds,
    eyeline: state.workspace.guides.eyeline
  }),
  {
    toggleWorkspaceGuide
  }
)(
(({
  center, thirds, eyeline,
  toggleWorkspaceGuide
}) => {
  const { t } = useTranslation()
  return<div className="guides-inspector"> 
        <div className="row">
          <div className="guides-inspector__label">{t('shot-generator.guides-inspector.guides')}</div>
            <div className="round-buttons-panel">
                <a href="#"
                  className={ classNames({ active: center }) }
                  onClick={ preventDefault(() => toggleWorkspaceGuide("center")) }>
                <Icon src="icon-guides-center"/>
                </a>
                <a href="#"
                  className={ classNames({ active: thirds }) }
                  onClick={ preventDefault(() => toggleWorkspaceGuide("thirds")) }>
                <Icon src="icon-guides-thirds"/>
                </a>
                <a href="#"
                  className={ classNames({ active: eyeline }) }
                  onClick={ preventDefault(() => toggleWorkspaceGuide("eyeline")) }>
                <Icon src="icon-guides-eyeline"/>
                </a>
              </div>
        </div>
    </div>
}))

export default GuidesInspector
