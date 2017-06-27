const exporterFcp = require('../../src/js/exporters/final-cut-pro.js')

const data = {
  sequenceId: 'sequence-1',
  uuid: '78d90ce4-d256-4427-8f11-0da41017efb8',
  width: 1200,
  height: 1000,
  clipItems: [
    {
      id: 'clipitem-1',
      masterClipId: 'masterclip-1',
      name: 'Special stuff!', // set name if dialogue or action, otherwise filename
      description: '',
      duration: 1294705,
      timebase: 24,
      start: 0,
      end: 24,
      fileId: 'file-1',
      fileName: '7S6A4465.JPG',
      filePathUrl: 'file://localhost/7S6A4465.JPG', // filename without path: file://localhost/filename.JPG
      fileWidth: 5760,
      fileHeight: 3840,
      label2: 'Lavender'
    },
    {
			id: 'clipitem-2',
			masterClipId: 'masterclip-2',
			name: 'Special stuff 2!',
			description: 'Special  22222222 stuff dfs asdfasd fasd fa!',
			duration: 1294705,
			timebase: 24,
			start: 24,
			start: 48,
			fileId: 'file-2',
			fileName: '7S6A4555.JPG',
      filePathUrl: 'file://localhost/7S6A4555.JPG',
      fileWidth: 5760,
      fileHeight: 3840,
      label2: 'Lavender'
    }
  ]
}

console.log(
  exporterFcp.generateFinalCutProXml(data)
)
