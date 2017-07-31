const {ipcRenderer, shell, remote} = require('electron')
const prefModule = require('electron').remote.require('./prefs.js')
const pdf = require('pdfjs-dist')
const worksheetPrinter = require('./worksheet-printer.js')
const storyTips = new(require('./story-tips'))
const child_process = require('child_process')
const app = require('electron').remote.app
const os = require('os')
const path = require('path')

let paperSize
let aspectRatio
let rows
let cols
let spacing

let currentScene
let scriptData
// on change save preferences

window.pdf = pdf
document.querySelector('#close-button').onclick = (e) => {
  ipcRenderer.send('playsfx', 'negative')
  let window = remote.getCurrentWindow()
  window.hide()
}

document.querySelector('#print-button').onclick = (e) => {
  ipcRenderer.send('playsfx', 'positive')
  // PRINT
  print()
  let window = remote.getCurrentWindow()
  window.hide()
}

const print = () => {
  let cmd

  switch (os.platform()) {
    case 'darwin':
      cmd = 'lpr -o landscape -#' + document.querySelector('#copies').value + ' ' + path.join(app.getPath('temp'), 'worksheetoutput.pdf') 
      break
    case 'linux':
      cmd = 'lp -n ' + document.querySelector('#copies').value + ' ' +  path.join(app.getPath('temp'), 'worksheetoutput.pdf')
      break
    case 'win32':
      cmd = path.join(app.getAppPath(), 'src', 'data', 'app', 'SumatraPDF.exe') + ' -print-to-default -print-settings "' + document.querySelector('#copies').value + 'x" ' + path.join(app.getPath('temp'), 'worksheetoutput.pdf')
      break
  }

  ipcRenderer.send('analyticsEvent', 'Board', 'print', null, document.querySelector('#copies').value)

  let output = child_process.execSync(cmd)
}

document.querySelector('#paper-size').addEventListener('change', (e) => {
  paperSize = e.target.value
  generateWorksheet()
  prefModule.set('printingWindowState.paperSize', paperSize)
})

document.querySelector('#row-number').addEventListener('change', (e) => {
  rows = e.target.value
  generateWorksheet()
  prefModule.set('printingWindowState.rows', rows)
})

document.querySelector('#column-number').addEventListener('change', (e) => {
  cols = e.target.value
  generateWorksheet()
  prefModule.set('printingWindowState.cols', cols)
})

document.querySelector('#spacing').addEventListener('change', (e) => {
  spacing = e.target.value
  generateWorksheet()
  prefModule.set('printingWindowState.spacing', spacing)
})

const loadWindow = () => {
  let prefs = prefModule.getPrefs('print window')

  let printingWindowState

  if (!prefs.printingWindowState) {
    printingWindowState = {
      paperSize: 'LTR',
      rows: 5,
      cols: 3,
      spacing: 15
    }
    prefModule.set('printingWindowState', printingWindowState)
  } else {
    printingWindowState = prefs.printingWindowState
  }

  paperSize = printingWindowState.paperSize
  rows = printingWindowState.rows
  cols = printingWindowState.cols
  spacing = printingWindowState.spacing

  document.querySelector('#paper-size').value = paperSize
  document.querySelector('#row-number').value = rows
  document.querySelector('#column-number').value = cols
  document.querySelector('#spacing').value = spacing

  worksheetPrinter.on('generated', (path)=>{

    // Disable workers to avoid yet another cross-origin issue (workers need
    // the URL of the script to be loaded, and dynamically loading a cross-origin
    // script does not work).
     PDFJS.disableWorker = true;

    // The workerSrc property shall be specified.
    //console.log(require('pdfjs-dist/build/pdf.worker.js'))

    PDFJS.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.js'

    // Using DocumentInitParameters object to load binary data.
    var loadingTask = PDFJS.getDocument(path);
    loadingTask.promise.then(function(pdf) {
      console.log('PDF loaded');
      
      // Fetch the first page
      var pageNumber = 1;
      pdf.getPage(pageNumber).then(function(page) {
        console.log('Page loaded');
        
        var scale = 1.5;
        var viewport = page.getViewport(scale);

        // Prepare canvas using PDF page dimensions
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        var renderTask = page.render(renderContext);
        renderTask.then(function () {
          document.querySelector('#preview').src = canvas.toDataURL()
          document.querySelector('#paper').style.transform = 'rotate3d(1, 0, 1, ' + ((Math.random() * 4)-2) + 'deg)'
          console.log('Page rendered');
        });
      });
    }, function (reason) {
      // PDF loading error
      console.error(reason);
    });

    console.log(remote.getCurrentWindow().webContents.getPrinters())
    //document.querySelector("#preview").src = 'zoinks.png'
    console.log(path)
  })
}

const generateWorksheet = () => {
  console.log(paperSize, aspectRatio, rows, cols, spacing, currentScene, storyTips.getTipString(), scriptData)
  worksheetPrinter.generate(paperSize, aspectRatio, rows, cols, spacing, currentScene, storyTips.getTipString(), scriptData)
}

loadWindow()

ipcRenderer.on('worksheetData', (event, _aspectRatio, _currentScene, _scriptData) => {
  aspectRatio = _aspectRatio
  currentScene = _currentScene
  scriptData = _scriptData
  generateWorksheet()
})

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }