import classNames from 'classnames'
const Item = ({language, displayName, selectedLanguage, onClick}) => {


    let className = classNames("element", {
        "element-selected": language === selectedLanguage,

    })
    return (
        <div className={className} onClick={() => onClick(language)}>
            {displayName}
        </div>
    )
}

export default Item;