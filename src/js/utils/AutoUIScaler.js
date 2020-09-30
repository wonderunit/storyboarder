
class AutoUIScaler {
    constructor(initialScaleLimits, normalWinDimensions, currentScale, onChange) {
        this.defaultScaleLimits = initialScaleLimits
        this.normalWinDimensions = normalWinDimensions
        this.currentScaleLimits = { max:initialScaleLimits.max, min:initialScaleLimits.min }
        this.scale = null
        this.relativeScale = currentScale
        this.onChange = onChange
        this.decrementValue = -0.025
    }

    updateScale() {
        let newScale = this.scale + this.currentScaleLimits.max - this.defaultScaleLimits.max
        this.relativeScale = Math.min(this.currentScaleLimits.max, Math.max(this.currentScaleLimits.min, newScale))
        this.onChange(this.relativeScale)
    }

    scaleBy(value) {
        let newScale = this.relativeScale + value
        newScale = Math.min(this.currentScaleLimits.max, Math.max(this.currentScaleLimits.min, newScale))
        this.relativeScale = newScale
        this.onChange(newScale)
        newScale = this.scale + value
        this.scale = Math.min(this.defaultScaleLimits.max, Math.max(this.defaultScaleLimits.min, newScale))
    }

    setScale(value) {
        this.scale = Math.min(this.defaultScaleLimits.max, Math.max(this.defaultScaleLimits.min, value))
        this.updateScale()
    }

    updateScaleBoundaries(currentWindowSize) {
        let windowMinimalSize = this.normalWinDimensions
        let addToZoom = 0
        let pixelsDifference = 0
        if( windowMinimalSize.width > currentWindowSize.width ) {
            pixelsDifference = ( windowMinimalSize.width - currentWindowSize.width ) / 50
            pixelsDifference = Math.round(pixelsDifference)
            addToZoom += this.decrementValue * pixelsDifference
        }
        if( windowMinimalSize.height > currentWindowSize.height ) {
            pixelsDifference = ( windowMinimalSize.height - currentWindowSize.height ) / 50
            pixelsDifference = Math.round(pixelsDifference)
            addToZoom += this.decrementValue * pixelsDifference
        }
        this.currentScaleLimits.max = this.defaultScaleLimits.max + addToZoom
        if( !this.scale ) {
            this.scale  = this.relativeScale - this.currentScaleLimits.max + this.defaultScaleLimits.max
        }
    }

}

module.exports = AutoUIScaler