import React from 'react'
import classNames from "classnames"
import Icon from "../Icon";

const stopPropagation = (fn, ...args) => e => {
  e.stopPropagation()
  fn(e, ...args)
}

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
          onClick={ stopPropagation((e) => props.onLockItem(e, props)) }
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
          onClick={ stopPropagation((e) =>props.onHideItem(e, props)) }
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
          onClick={ stopPropagation((e) => props.allowDelete && props.onDeleteItem(e, props)) }
      >
        X
      </a>
  )
}


const Item = React.memo((props) => {
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
            onClick={(e) => props.onSelectItem(e, null)}
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
          onClick={(e) => props.onSelectItem(e, props)}
      >
        <a
            className='title'
        >
          <span className='type'>{typeLabels[props.type]}</span>
          <span className='id' style={{ overflow: "hidden", textOverflow: "ellipsis", width: "125px"}}>{ props.name || props.displayName}</span>
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


export default Item
