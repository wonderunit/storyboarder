import React, {useRef, useMemo, useState, useEffect} from 'react'
import Modal from "../Modal"
import Select from "../Select"

const HandSelectionModal = React.memo(({
    visible,
    setVisible,
    model,
    skeleton,
    id,
    onSuccess,
    defaultSelectedHand = null
}) => {
    const originalSkeleton = useRef(null)
    const [selectedHand, setSelectedHand] = useState(null)
    const selectOptions = useMemo(() => {
        if(!skeleton) return []
        originalSkeleton.current = skeleton
        let selectOptions = []
        for(let i = 0; i < skeleton.bones.length; i++) {
          if(!skeleton.bones[i].name.includes("leaf"))
          {
            let name = skeleton.bones[i].name
            selectOptions.push({ value: name, label:name})
          }

        }
        if(!selectedHand) { 
          setSelectedHand(selectOptions[0])
        }
        return selectOptions
    }, [skeleton])

    useEffect(() => {
      if(!defaultSelectedHand) return 
      setSelectedHand({ value:defaultSelectedHand, label:defaultSelectedHand })
    }, [defaultSelectedHand])

    return <Modal visible={visible} onClose={() => setVisible(false)}>
                <div style={{margin:"5px 5px 5px 5px"}}>
                  Select Hand:
                </div>
                <div className="select">
                  <Select 
                    label='Hand'
                    value={ selectedHand }
                    options={ selectOptions }
                    onSetValue={(item) => setSelectedHand(item)}/>
                </div>
                <div className="skeleton-selector__div">
                  <button
                    className="skeleton-selector__button"
                    onClick={() => {
                      setVisible(false)
                      onSuccess(model, originalSkeleton.current, id, {name:  selectedHand.value})
                    }}>
                      Proceed
                  </button>
                  </div>
            </Modal>
})
export default HandSelectionModal
