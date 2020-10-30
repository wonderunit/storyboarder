import { useMemo } from 'react'
import Input from './Input'
import ParentLabel from './ParentLabel'

const JsonEditor = ({json, onChange, marginLeftStep = 10}) => {

    const getKey = (prefix, currentKey, parentKeyPath, marginLeft) => {
        return `${prefix}_${parentKeyPath}_${currentKey}_${marginLeft}`
    }

    const applyChangesToJson = ({key, value, parent}) => {
        parent[key] = value
        onChange(json)
    }

    const parseJSON = (currentKey, parentKeyPath, parent, elems, marginLeft) => {
        parentKeyPath = parentKeyPath + "_" + currentKey
        let data = parent[currentKey]; 
        let label = currentKey;

        if(Array.isArray(data)){
            if(marginLeft > 0){ //special case to avoid showing root
              elems.push(
                <ParentLabel
                  key={getKey('parent_label', currentKey, parentKeyPath, marginLeft)} 
                  value={label}
                  current={data} 
                  parent={parent}
                  marginLeft={marginLeft}
                />
              );
            }
      
            for(let key = 0; key < data.length; key++){
                parseJSON(key, parentKeyPath, data, elems, marginLeft + marginLeftStep);
            }
            elems.push(<div className="json-label" style={{marginLeft: marginLeft, display: "flex"}}>{'}'}</div>)
        } else if(data instanceof Object) {
            if(marginLeft > 0){//special case to avoid showing root
                elems.push(
                    <ParentLabel
                        key={getKey('parent_label', currentKey, parentKeyPath, marginLeft)} 
                        value={label}
                        current={data} 
                        parent={parent}
                        marginLeft={marginLeft}
                    />
                );
            }
    
            Object.keys(data).forEach(key => {
                parseJSON(key, parentKeyPath, data, elems, marginLeft + marginLeftStep);
            });
            elems.push(<div key={getKey('bracket', currentKey, parentKeyPath, marginLeft)} className="json-label" style={{marginLeft: marginLeft, display: "flex"}}>{'}'}</div>)
        } else {
            elems.push(
                <Input 
                  key={getKey('input', currentKey, parentKeyPath, marginLeft)}  
                  label={label} 
                  type="text"
                  marginLeft={marginLeft}
                  parent={parent}
                  value={data}
                  onChange={applyChangesToJson}/>
              );
        }
    }
    
    const elements = useMemo(() => {
        let elems = []
        parseJSON('root', '', { 'root': json }, elems, 0)
        return elems
    }, [json])

    return (
        <div className="json-root">
            { elements }
        </div>
    )
}

export default JsonEditor;