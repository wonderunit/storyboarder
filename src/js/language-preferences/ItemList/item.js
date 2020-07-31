import classNames from 'classnames'
const Item = ({data, selectedLanguage, onClick}) => {


    let className = classNames("element", {
        "element-selected": data === selectedLanguage
    })
    return (
        <div className={className} onClick={() => onClick(data)}>
            {data}
        </div>
    )
}

export default Item;