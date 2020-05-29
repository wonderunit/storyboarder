const PSD = require('psd');

const ImportPSDToBase64 = (filepath) => {
    let psd = PSD.fromFile(filepath);
    psd.parse();
    return toBase64(psd.image.toPng())
}

const toBase64 = (png) => {
    canvas = document.createElement('canvas')
    canvas.width = png.width
    canvas.height = png.height
    context = canvas.getContext('2d')

    imageData = context.getImageData(0, 0, png.width, png.height)
    pixelData = imageData.data

    for(let i = 0; i < png.data.length; i++) {
        pixelData[i] =  png.data[i]
    }

    context.putImageData(imageData, 0, 0)

    return canvas.toDataURL('image/png')
}
module.exports = ImportPSDToBase64