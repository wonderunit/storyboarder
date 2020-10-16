import React from 'react'

const ProgressIntro = ({value = 0, msg = '', delay = 0}) => {

    return (
        <div className={'progress-container'}>
            <div className={'progress-branding'}>
                <div>Wonder Unit</div>
                <div>Shot Generator XR</div>
            </div>
            <div className={'progress-bar'}>
                <div style={{width: value + '%'}} />
            </div>
            <div className={'progress-msg'}>
                {msg}
            </div>
        </div>
    )
}

export default ProgressIntro