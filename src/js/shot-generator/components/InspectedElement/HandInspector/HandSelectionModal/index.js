import React, {useRef, useMemo, useState, useEffect} from 'react'
import Modal from '../../../Modal'
import Select from '../../../Select'
import { useTranslation } from 'react-i18next'
const HandSelectionModal = React.memo(({
    visible,
    setVisible,
    model,
    skeleton,
    id,
    onSuccess,
    defaultSelectedHand = null
}) => {
    const { t } = useTranslation()
    const [selectedHand, setSelectedHand] = useState(null)
    const selectOptions = useMemo(() => {
        if(!skeleton) return []
        let selectOptions = []
        let skeletonValues = Object.values(skeleton)
        for(let i = 0; i < skeletonValues.length; i++) {
          if(skeletonValues[i].name && !skeletonValues[i].name.includes("leaf"))
          {
            let name = skeletonValues[i].name
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
                  {t("shot-generator.inspector.hand-preset.select-hand")}:
                </div>
                <div className="select">
                  <Select 
                    label="Hand"
                    value={ selectedHand }
                    options={ selectOptions }
                    onSetValue={(item) => setSelectedHand(item)}/>
                </div>
                <div className="skeleton-selector__div">
                  <button
                    className="skeleton-selector__button"
                    onClick={() => {
                      setVisible(false)
                      onSuccess(model, id, selectedHand.value)
                    }}>
                      {t("shot-generator.inspector.common.add-preset")}
                  </button>
                  </div>
            </Modal>
})
export default HandSelectionModal
