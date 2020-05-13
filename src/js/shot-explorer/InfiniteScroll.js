import React, { useEffect, useRef, useState, useMemo } from 'react'

const InfiniteScroll = React.memo(({
    elements, 
    Component,
    style,
    className,
    fetchMoreElements,
    ...itemData
}) => {
    const ref = useRef(null)
    const bottomRef = useRef(null)
    const [isFetching, setIsFetching] = useState(false);

    // Requests more objects when reaches the end of scroll 
    useMemo(() => {
        if(!isFetching) return
        fetchMoreElements()
    }, [isFetching])

    // Sets fetching to false when elements amoung changed which signify that more objects were added
    useEffect(() => {
        setIsFetching(false)
    }, [elements])

    // Observes if scroll intersects the bottom compoennt and sets fetching to true 
    const observer = useRef( new window.IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.intersectionRatio > 0) {
                setIsFetching(true)
            }
        });
    }, {threshold: 0.60}))

    // adds bottom element to IntersectionObserver
    useEffect(() => {
        const { current : currentObserver } = observer
        currentObserver.disconnect()
        if (bottomRef.current && elements.length > 0) {
            currentObserver.observe(bottomRef.current);
        }
        return () => currentObserver.disconnect()
    }, [bottomRef, elements]);

    return(
        <div ref={ref} className={ className } style={ style }>
            {
                elements.map((object, index) => {
                    return <Component
                    key={ index }
                    object={ object }
                    { ...itemData }
                    />
                })
            }
            <div className="infinite-scroll-bottom" ref={bottomRef}><div></div></div>
        </div>
    )
})
export default InfiniteScroll