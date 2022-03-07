
const { useMemo, useRef, useEffect } = require('react')
const { useThree } = require('react-three-fiber')

const THREE  = require('three')
const { getSelections, getSceneObjects } = require('../../../shared/reducers/shot-generator')

const { connect } = require('react-redux')

const Group = React.memo((props) => {

    const { sceneObject } = props

    const ref = useRef()

    return (
        <group
            ref={ ref }
            name={'someGR_VR'}
            userData={{ 
                id: sceneObject.id,
                type: sceneObject.type,
                children: sceneObject.children
            }}
        />
    )
})


const getObjectInfo = (state) => {

    const selected = getSelections(state)[0]
    const object = getSceneObjects(state)[selected]

    if (!object) {
        return {}
      }
    
      return {
        x: object.x,
        y: object.y,
        z: object.z
      }
  }
  
  const mapStateToProps = (state) => getObjectInfo(state)
  
module.exports = connect(mapStateToProps, null)(Group)