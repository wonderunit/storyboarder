import { useRef, useEffect, useState, useMemo } from 'react'
const minWidth = 10
const Input = ({label, value, type, marginLeft, parent, onChange = () => {}}) => {
    const [currentValue, setCurrentValue] = useState(value)
    const [isEditing, setEditing] = useState(false)
    const [inputWidth, setInputWidth] = useState(0)
    const inputRef = useRef()
    const getTextWidth = useRef({canvas: null})

    const saveChanges = () => {
        if(currentValue !== value) {
            onChange({key:label, value:currentValue, parent})
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

    useEffect(() => {
        if(!inputRef.current) return
        resizeInput()
    }, [isEditing])

    const onValueChange = (event) => {
        setCurrentValue(event.target.value)
        resizeInput()
    }

    useMemo(() => {
        setCurrentValue(value)
    }, [value])

    const resizeInput = () => {
        let canvas = getTextWidth.current.canvas || (getTextWidth.current.canvas = document.createElement("canvas"));
        let context = canvas.getContext("2d");
        context.font = `bold ${inputRef.current.style.fontSize} arial`
        let metrics = context.measureText(inputRef.current.value);
        let newInputWidth = metrics.width + 2
		if (newInputWidth < minWidth) {
			newInputWidth = minWidth;
		}
		if (newInputWidth !== inputRef.current.width) {
			setInputWidth(newInputWidth)
		}
    }

    const mouseLeave = () => {
        if(document.activeElement !== inputRef.current) {
            setEditing(false)
        }
    }

    return (
        <div 
        className='json-row'
        style={{
            marginLeft, 
            display: "flex"
        }}>
          <div className="json-label">{label}:</div>
          <div className="json-value">
            { isEditing ? 
                <input className="json-input" 
                        type="text"
                        style={{
                            width:inputWidth,
                            fontSize: "12px"
                        }} 
                        ref={inputRef} 
                        value={currentValue} 
                        onChange={onValueChange} 
                        onKeyDown={submit} 
                        onMouseLeave={mouseLeave}
                        onBlur={saveChanges}/>
                :
                <div className="json-input-preview"
                        onClick={() => setEditing(true)}>
                    {
                    currentValue
                    }
                </div>
            }
          </div>
          
        </div>
      )
}

export default Input