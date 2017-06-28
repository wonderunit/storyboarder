const util = require('../utils')

// data functions
const boardFileImageSize = boardFileData =>
  (boardFileData.aspectRatio >= 1)
    ? [900 * boardFileData.aspectRatio, 900]
    : [900, 900 / boardFileData.aspectRatio]

const msecsToFrames = (fps, value) =>
  (fps/1000) * value

// fcp templating
const clipItem = data =>
`
					<clipitem id="${data.id}">
						<!-- id -->
						<masterclipid>${data.masterClipId}</masterclipid>
						<!-- set name if dialogue or action, otherwise filename -->
						<name>${data.name}</name>
						<description>${data.description}</description>
						<enabled>TRUE</enabled>
						<duration>${data.duration}</duration>
						<rate>
							<timebase>24</timebase>
							<ntsc>TRUE</ntsc>
						</rate>
						<!-- start time in frames (24fps) -->
						<start>${data.start}</start>
						<!-- end time in frames (24fps) -->
						<end>${data.end}</end>
						<in>107892</in>
						<out>107916</out>
						<!-- file id -->
						<file id="${data.fileId}">
							<!-- filename -->
							<name>${data.fileFilename}</name>
							<!-- filename without path: file://localhost/filename.JPG -->
							<pathurl>${data.filePathUrl}</pathurl>
							<media>
								<video>
									<samplecharacteristics>
										<!-- width -->
										<width>${data.fileWidth}</width>
										<!-- height -->
										<height>${data.fileHeight}</height>
									</samplecharacteristics>
								</video>
							</media>
						</file>
						<labels>
							<label2>${data.label2}</label2>
						</labels>
					</clipitem>
`

const generateFinalCutProXml = data =>
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
	<sequence id="${data.sequenceId}">
		<uuid>${data.uuid}</uuid>
    <rate>
      <timebase>24</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
		<media>
			<video>
				<format>
					<samplecharacteristics>
						<rate>
							<timebase>24</timebase>
						</rate>
						<!-- WIDTH -->
						<width>${data.width}</width>
						<!-- HEIGHT -->
						<height>${data.height}</height>
						<anamorphic>FALSE</anamorphic>
						<pixelaspectratio>square</pixelaspectratio>
						<fielddominance>none</fielddominance>
						<colordepth>24</colordepth>
					</samplecharacteristics>
				</format>
				<track>${data.clipItems.map(clipItem).join('\n')}
					<!-- END OF CLIPS -->
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
				<track>
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
				<track>
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
				</track>
			</video>
			<audio>
				<numOutputChannels>2</numOutputChannels>
				<format>
					<samplecharacteristics>
						<depth>16</depth>
						<samplerate>48000</samplerate>
					</samplecharacteristics>
				</format>
				<outputs>
					<group>
						<index>1</index>
						<numchannels>1</numchannels>
						<downmix>0</downmix>
						<channel>
							<index>1</index>
						</channel>
					</group>
					<group>
						<index>2</index>
						<numchannels>1</numchannels>
						<downmix>0</downmix>
						<channel>
							<index>2</index>
						</channel>
					</group>
				</outputs>
				<track>
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>1</outputchannelindex>
				</track>
				<track>
					<enabled>TRUE</enabled>
					<locked>FALSE</locked>
					<outputchannelindex>2</outputchannelindex>
				</track>
			</audio>
		</media>
	</sequence>
</xmeml>
`

const generateFinalCutProData = boardData => {
  let [height, width] = boardFileImageSize(boardData)

  let clipItems = []
  let currFrame = 0
  let index = 1
  for (let board of boardData.boards) {
    let fileFilename = board.url
        // filename without path: file://localhost/filename.JPG
        filePathUrl = `file://localhost/${board.url}`

    let lastFrame = msecsToFrames(24, board.duration),
        endFrame = Math.round(currFrame + lastFrame)

    let clipItem = {
      start: currFrame,
      end: endFrame,

      id: `clipitem-${index}`,
      masterClipId: `masterclip-${index}`,

      // set name if dialogue or action, otherwise filename
      name: board.dialogue
              ? board.dialogue
              : board.action
                ? board.action
                : fileFilename,

      description: board.notes
                     ? board.notes
                     : '',

      duration: 1294705, // ???
      timebase: 24,

      fileId: `file-${index}`,
      fileFilename,
      filePathUrl,

      fileWidth: 5760, // ???
      fileHeight: 3840, // ???
      fileWidth: width,
      fileHeight: height,

      label2: 'Lavender'
    }
    clipItems.push(clipItem)
    currFrame = endFrame
    index++
  }

  return {
    sequenceId: 'sequence-1',
    uuid: util.uuid4(),
    width: width,
    height: height,
    clipItems: clipItems
  }
}

module.exports = {
  generateFinalCutProData,
  generateFinalCutProXml
}
