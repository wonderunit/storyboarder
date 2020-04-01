import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

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

    useMemo(() => {
        if(!isFetching) return
        fetchMoreElements()
    }, [isFetching])

    useEffect(() => {
        setIsFetching(false)
    }, [elements])

    const observer = useRef( new window.IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.intersectionRatio > 0) {
                setIsFetching(true)
            }
        });
      }, {threshold: 0.60}))

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