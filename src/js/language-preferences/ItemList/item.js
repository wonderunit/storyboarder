import classNames from 'classnames'
const Item = ({language, selectedLanguage, onClick}) => {


    let className = classNames("element", {
        "element-selected": language === selectedLanguage,

    })
    return (
        <div className={className} onClick={() => onClick(language)}>
            {language}
        </div>
    )
}

export default Item;