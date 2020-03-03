import React from 'react'

const Icon = React.memo(({ src }) =>
    <img
        className='icon'
        width={32}
        height={32}
        src={`./img/shot-generator/${src}.svg`}
    />
)

export default Icon
