import classNames from 'classnames'
const Item = ({language, displayName, selectedLanguage, onClick, editable}) => {

    let className = classNames("element", {
        "element-selected": language === selectedLanguage,

    })
    return (
        <div className={className} onClick={() => onClick(language)}>
            {displayName} {editable ? '' : '(installed)'}
        </div>
    )
}

export default Item;