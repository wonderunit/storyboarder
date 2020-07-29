import { useRef, useEffect, useState } from 'react'
const Input = ({label, value, type, marginLeft, onChange = () => {console.log("Saved")}}) => {
    const [currentValue, setCurrentValue] = useState(value)
    const [isEditing, setEditing] = useState(false)
    const saveChanges = () => {
        if(currentValue !== value) {
            onChange(currentValue)
        }
        setEditing(false)
    }
    const submit = (event) => {
        switch(event.keyCode) {
            case 13: // Enter key
                saveChanges()
            break;
            case 27:
                setEditing(false)
                setCurrentValue(value)
            break;
            default: 
            break;
        }
    }
    const onValueChange = (event) => {
        setCurrentValue(event.target.value)
    }

    return (
        <div 
        className='json-row'
        style={{
            marginLeft, 
            display: "flex"
        }}>
          <div className="json-label" style={{marginLeft}}>{label}:</div>
          <div className="json-value">
            { isEditing ? 
                <input className="json-input" type="text" value={currentValue} onChange={onValueChange} onKeyDown={submit} onMouseLeave={saveChanges}/>
                :
                <div className="json-input-preview" onClick={() => setEditing(true)}>{currentValue}</div>
            }
          </div>
          
        </div>
      )
}

export default Input