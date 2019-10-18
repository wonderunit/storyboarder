const getFilepathForImage = ({ imageAttachmentIds }) => {
  if (imageAttachmentIds[0] !== 'placeholder') {
    const parts = imageAttachmentIds[0].split(/[\\\/]/)
    const filename = parts[parts.length - 1]
    return `/data/user/images/${filename}`
  } else {
    return `/data/system/images/placeholder.png`
  }
}

module.exports = getFilepathForImage
