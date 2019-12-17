import React from 'react'
import classNames from "classnames";
import {deleteObjects, selectObject, updateObject} from "../../../shared/reducers/shot-generator";
import {connect} from "react-redux";
import Icon from "../Icon";


const ELEMENT_HEIGHT = 40
const GROUP_PADDING = 12

const getActiveIcon = (props) => {
  return (
      (props.type === 'camera' && props.activeCamera === props.id)
          ? <span
                className='active'
                style={{
                  display: 'flex'
                }}
            >
              <Icon src='icon-item-active'/>
            </span>
          : null
  )
}

const getLockIcon = (props) => {
  return (
      <a
          className={classNames({
            'lock': true,
            'hide-unless-hovered': !props.locked
          })}
          href='#'
      >
        <Icon src={props.locked ? 'icon-item-lock' : 'icon-item-unlock'}/>
      </a>
  )
}

const getVisibilityIcon = (props) => {
  return (
      props.type === 'camera' ? null :
      <a
          className={classNames({
            'visibility': true,
            'hide-unless-hovered': props.visible
          })}
          href='#'
      >
        <Icon src={props.visible ? 'icon-item-visible' : 'icon-item-hidden'}/>
      </a>
  )
}

const getDeleteIcon = (props) => {
  return (
      <a
          className={'delete'}
          href='#'
          style={{
            opacity: !!props.allowDelete ? null : 0.1
          }}
      >
        X
      </a>
  )
}


const Item = React.memo(({selectObject, ...props}) => {
  const className = classNames({
    'element': true,
    'selected': props.selected,
    'zebra': props.index % 2
  })
  
  const typeLabels = {
    'camera': <Icon src='icon-item-camera'/>,
    'character': <Icon src='icon-item-character'/>,
    'object': <Icon src='icon-item-object'/>,
    'light': <Icon src='icon-item-light'/>,
    'volume': <Icon src='icon-item-volume'/>,
    'image': <Icon src='icon-item-image'/>
  }
  
  if (props.id === null) {
    return (
        <div
            className={className}
            style = {{
              height: ELEMENT_HEIGHT
            }}
            onClick={() => selectObject(null)}
        >
          <a
              className='title'
              href='#'
          >
            <span className='id'>{props.displayName}</span>
          </a>
        </div>
    )
  }
  
  
  return (
      <div
          className={className}
          style = {{
            height: ELEMENT_HEIGHT,
            paddingLeft: props.group && GROUP_PADDING
          }}
          onClick={() => selectObject(props.id)}
      >
        <a
            className='title'
            href='#'
        >
          <span className='type'>{typeLabels[props.type]}</span>
          <span className='id'>{props.displayName}</span>
        </a>
        <div className='row'>
          {getActiveIcon(props)}
          {getLockIcon(props)}
          {getVisibilityIcon(props)}
          {getDeleteIcon(props)}
        </div>
      </div>
  )
})

const mapDispatchToProps = {
  selectObject,
  deleteObjects,
  updateObject
}

export default connect(null, mapDispatchToProps)(Item)
