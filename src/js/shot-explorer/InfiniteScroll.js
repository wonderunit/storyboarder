import React, { useEffect, useRef, useState } from 'react'

const InfiniteScroll = React.memo(({
    elements, 
    Component,
    style,
    className,
    fetchMoreElements,
    ...itemData
}) => {
    const ref = useRef(null)
    const [isFetching, setIsFetching] = useState(false);
    const handleScroll = () => {
        let shotsContainer = ref.current
        let containerHeight = window.outerHeight - shotsContainer.offsetTop
        if (containerHeight + shotsContainer.scrollTop < shotsContainer.scrollHeight - 10 * itemData.aspectRatio) return;
        setIsFetching(true)
    }

    useEffect(() => {
        if(!isFetching) return
        fetchMoreElements()
    }, [isFetching])

    useEffect(() => {
        setIsFetching(false)
    }, [elements])

    useEffect(() => {
        if(!ref.current) return;
        ref.current.addEventListener('scroll', handleScroll);
        return () => {
                ref.current.removeEventListener('scroll', handleScroll);
        } 
    }, [ref.current])

    return(
    <div ref={ref} className={ className } style={ style }>{
        elements.map((object, index) => {
            return <Component
            key={ index }
            object={ object }
            { ...itemData }
            />
        })
    }
    { isFetching && <div>Fetching new elements...</div>}
    </div>
    )
})
export default InfiniteScroll