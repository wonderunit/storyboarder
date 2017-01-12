/* 
TODO:
  menu checks for speaking, auto play on update, loop

  go through and extract more stats out of the script

  draw sections in timelines

  render times

  render stats

  advance marker to correct place
  
  drag and drop file

  hook up icons

  -=-=-=-

  time of day overlays
  scroll to right scene if not visible
  welcome screen
  stats window
  save settings to prefs
*/ 

var remote = nodeRequire('electron').remote 
var ipc = nodeRequire('electron').ipcRenderer
const {shell} = nodeRequire('electron')

const FountainDataParser = nodeRequire('./js/fountain-data-parser')
const Color = nodeRequire('../node_modules/color-js/color')
const moment = nodeRequire('moment')

let scriptData
let locations
let characters

let currentNode = 0
let currentSceneNode = 0
let playbackMode = false
let playheadTimer
let updateTimer
let frameDuration

let speakingMode = true
let utter = new SpeechSynthesisUtterance()
let startSpeakingTime
let delayTime = 0
let currentSpeaker = ''

let loopMode = 0
let playWhenUpdate = true

let totalWordCount

// var currentNode = 0
// var playbackMode = false
// var playbackType = 0
var frameTimer
// var updateTimer 
// var imageTimer

// var colorList = ["6dcff6", "f69679", "00bff3", "f26c4f", "fff799", "c4df9b", "f49ac1", "8393ca", "82ca9c", "f5989d", "605ca8", "a3d39c", "fbaf5d", "fff568", "3cb878", "fdc689", "5674b9", "8781bd", "7da7d9", "a186be", "acd373", "7accc8", "1cbbb4", "f9ad81", "bd8cbf", "7cc576", "f68e56", "448ccb"];


$(document).ready(function() {
  // scriptData = remote.getGlobal('sharedObj').scriptData
  // locations = remote.getGlobal('sharedObj').locations
  // characters = remote.getGlobal('sharedObj').characters
  // assignColors()

  // currentNode = 0
  // advanceFrame(0)
  // //togglePlayback()

  // renderOutline()
  // renderTimeline()
  // renderSceneTimeline()
  // renderFrame()
  // controls
  reloadDocument()
  //renderTimeline()
  //advanceFrame(0)
})

let stopPlaying = () => {
  clearTimeout(frameTimer)
  playbackMode = false
  utter.onend = null
  ipc.send('resumeSleep')
  clearTimeout(updateTimer)
  speechSynthesis.cancel()
}

let togglePlayback = function() {
  playbackMode = !playbackMode
  if (playbackMode) {
    // prevent from sleeping
    ipc.send('preventSleep')

    // begin playing
    if (speakingMode) {
      playSpeechAdvance(true)
    } else {
      playAdvance(true)
    }
  } else {
    // stop playing
    stopPlaying()
  }
}

let playAdvance = function(first) {
  //clearTimeout(playheadTimer)
  clearTimeout(frameTimer)
  if (!first) {
    advanceFrame(1)
  }

  frameTimer = setTimeout(playAdvance, frameDuration)
}

let playSpeechAdvance = function(first) {
  //clearTimeout(frameTimer)
  clearTimeout(updateTimer)
    
  if (playbackMode) {
    if (!first) {
      advanceFrame(1)
    } else {
      advanceFrame(0)
    }

    utter.pitch = 0.65;
    utter.rate = 1.1;

    switch (scriptData[currentNode].type) {
      case 'title':
        let string = []
        string.push(scriptData[currentNode].text.toLowerCase().replace(/<\/?[^>]+(>|$)/g, "") + '. ')
        if (scriptData[currentNode].credit) {
          string.push(scriptData[currentNode].credit + ' ')
        }
        if (scriptData[currentNode].author) {
          string.push(scriptData[currentNode].author + ' ')
        }
        if (scriptData[currentNode].authors) {
          string.push(scriptData[currentNode].authors + ' ')
        }
          
        utter.text = string.join('')
        delayTime = 2000
        break
      case 'section':
        utter.text = scriptData[currentNode].text.toLowerCase()
        delayTime = 2000
        break
      case 'scene':
        if (currentSceneNode > -1) {
          switch (scriptData[currentNode]['script'][currentSceneNode].type) {
            case 'scene_padding':
              utter.text = ''
              playSpeechAdvance()
              break
            case 'scene_heading':
              utter.text = scriptData[currentNode]['script'][currentSceneNode].text.toLowerCase().replace("mr.", "mister").replace("int. ", "interior, ").replace("ext. ", "exterior, ")
              currentSpeaker = ''
              delayTime = 1000
              break
            case 'action':
              utter.text = scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, "")
              currentSpeaker = ''
              delayTime = 500
              break
            case 'parenthetical':
            case 'dialogue':
              let string = []

              if (scriptData[currentNode].type == 'dialogue') {
                delayTime = 1000
              } else {
                delayTime = 500
              }
              if (currentSpeaker !== scriptData[currentNode]['script'][currentSceneNode].character) {
                str = scriptData[currentNode]['script'][currentSceneNode].character.toLowerCase().replace("mr.", "mister").replace("(o.s.)", ", offscreen, ").replace("(v.o.)", ", voiceover, ").replace("(cont'd)", ", continued, ").replace("(cont’d)", ", continued, ") + ', '
                string.push(str)
                currentSpeaker = scriptData[currentNode]['script'][currentSceneNode].character
              }
              string.push(scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, ""))
              utter.text = string.join('')
              break
            case 'transition':
              utter.text = scriptData[currentNode]['script'][currentSceneNode].text.replace(/<\/?[^>]+(>|$)/g, "")
              break
            case 'section':
              utter.text = ''
              playSpeechAdvance()
              break
          }
        }
        break
    }

    utter.onend = function(event) { 
      //console.log(((new Date().getTime())-startSpeakingTime)/utter.text.length)
      speechSynthesis.cancel()
      if (playbackMode) {
        setTimeout(playSpeechAdvance, delayTime) 
      }
    }
    
    speechSynthesis.speak(utter);
    startSpeakingTime = new Date().getTime()
  }
}

let gotoFrame = (nodeNumber) => {
  currentNode = Number(nodeNumber)
  currentSceneNode = 0
  advanceFrame(0)
}

let advanceFrame = function(direction, keyboard) {
  let differentScene = false
  switch (scriptData[currentNode]['type']) {
    case 'title':
      currentNode += direction
      break
    case 'section':
      currentNode += direction
      break
    case 'scene':
      currentSceneNode += direction
      if (currentSceneNode < 0) {
        currentNode = Math.max(0, currentNode-1)
        if (scriptData[currentNode]['script']) {
          currentSceneNode = scriptData[currentNode]['script'].length -1
        } else {
          currentSceneNode = 0
        }
        differentScene = true
      }
      if (currentSceneNode > (scriptData[currentNode]['script'].length -1)) {
        // if loop scene then repeat
        if (loopMode == 2) {
          if (speakingMode) {
            utter.text = ". . . End of scene."
            speechSynthesis.speak(utter);
            delayTime = 5000
            currentSceneNode = -1
          } else {
            currentSceneNode = 0
          }
        } else {
          // go to next node
          currentNode++
          currentSceneNode = 0
        }
      }
      break
  }
  currentNode = Math.max(0, currentNode)

  let currentSceneTime = 0
  let totalSceneTime = 0
  let currentMovieTime = 0
  let totalMovieTime = 0
  let currentSceneNumber = 0
  let currentPageNumber = 0
  let currentPercentage = 0
  let currentSceneDuration = 0
  let currentScenePageCount = 0
  let currentSceneWordCount = 0
  let totalPageCount = 0
  let totalSceneCount = 0

  switch (scriptData[currentNode]['type']) {
    case 'title':
      renderSceneTimeline()
      $('body').css('background', 'black')
      $("#content .slugline").html('')
      let html = []
      html.push(scriptData[currentNode].text + '<br/>')
      if (scriptData[currentNode].credit) {
        html.push('<span class="credit">' + scriptData[currentNode].credit + '</span><br/>')
      }
      if (scriptData[currentNode].author) {
        html.push('<span class="credit">' + scriptData[currentNode].author + '</span><br/>')
      }
      if (scriptData[currentNode].authors) {
        html.push('<span class="credit">' + scriptData[currentNode].authors + '</span><br/>')
      }
      $("#content .content-line").html(html.join(''))
      frameDuration = scriptData[currentNode].duration
      $('#controls #movie-timeline .marker').css('left', 0)
    
      currentMovieTime = scriptData[currentNode].time
      currentPageNumber = scriptData[currentNode].page
      break
    case 'section':
      renderSceneTimeline()
      $('body').css('background', 'black')
      $("#content .slugline").html('')
      $("#content .content-line").html(scriptData[currentNode].text)
      frameDuration = scriptData[currentNode].duration
      currentMovieTime = scriptData[currentNode].time
      currentPageNumber = scriptData[currentNode].page
      break
    case 'scene':
      if (currentSceneNode == 0 || differentScene) {
        renderSceneTimeline()
        if (scriptData[currentNode].slugline) {
          $("#content .slugline").html(scriptData[currentNode].scene_number + ': ' + scriptData[currentNode].slugline)
        } else {
          $("#content .slugline").html('')
        }
        $("#content .content-line").html('')  
        $('body').css('background', getSceneColor(scriptData[currentNode].slugline))

        // draw marker
        let percentage = (scriptData[currentNode].time - 2000)/(scriptData[scriptData.length-1].time+scriptData[scriptData.length-1].duration - 2000)
        let width = $('#controls #scene-timeline #scene-timeline-content').width()
        $('#controls #movie-timeline .marker').css('left', width*percentage)



        //console.log("-=-=-=-=- NEW SCENE -=-=-=-=-=-")
      }
      if (currentSceneNode > -1) {
        switch(scriptData[currentNode]['script'][currentSceneNode].type) {
          case 'action':
            $("#content .content-line").html(scriptData[currentNode]['script'][currentSceneNode].text)
            break
          case 'dialogue':
          case 'parenthetical':
            let html = []
            html.push(scriptData[currentNode]['script'][currentSceneNode].character + ': <br/>')
            html.push(scriptData[currentNode]['script'][currentSceneNode].text)
            $("#content .content-line").html(html.join(''))
            break
          case 'transition':
            $("#content .content-line").html(scriptData[currentNode]['script'][currentSceneNode].text)
            break
          case 'scene_heading':
            if (keyboard) {
              advanceFrame(direction)
            }
            break
        }

        // draw marker
        let percentage = (scriptData[currentNode]['script'][currentSceneNode].time-(scriptData[currentNode].time-2000))/scriptData[currentNode].duration
        let width = $('#controls #scene-timeline #scene-timeline-content').width()
        $('#controls #scene-timeline .marker').css('left', width*percentage)

        frameDuration = scriptData[currentNode]['script'][currentSceneNode].duration

      }

      currentSceneTime = scriptData[currentNode]['script'][currentSceneNode].time-scriptData[currentNode].time
      totalSceneTime = scriptData[currentNode].duration

      currentMovieTime = scriptData[currentNode]['script'][currentSceneNode].time
      currentPageNumber = scriptData[currentNode]['script'][currentSceneNode].page

      break
  }

  switch (scriptData[scriptData.length-1].type) {
    case 'title':
    case 'section':
      totalPageCount = scriptData[scriptData.length-1].page
      totalMovieTime = scriptData[scriptData.length-1].time + scriptData[scriptData.length-1].duration
      break
    case 'scene':
      let lastNode = scriptData[scriptData.length-1]['script'][scriptData[scriptData.length-1]['script'].length-1]
      totalPageCount = lastNode.page
      totalMovieTime = lastNode.time + lastNode.duration
      break
  }

  currentSceneNumber = scriptData[currentNode].scene_number || 0
  totalSceneCount = scriptData[scriptData.length-1].scene_number
  
  currentPercentage = Math.round((currentMovieTime/totalMovieTime)*100)

  currentScenePageCount = Math.ceil((totalSceneTime/totalMovieTime)*totalPageCount*10/5)*5/10
  currentSceneWordCount = scriptData[currentNode].word_count || 0

  $('#scene-timeline .left-block').html(msToTime(currentSceneTime))
  $('#scene-timeline .right-block').html(msToTime(totalSceneTime))

  $('#movie-timeline .left-block').html(msToTime(currentMovieTime))
  $('#movie-timeline .right-block').html(msToTime(totalMovieTime))
 
  $('#playback #left-stats').html('SCENE ' + currentSceneNumber + ', PAGE ' + currentPageNumber + ', ' + currentPercentage + '%<br/>' + msToTime(totalSceneTime) + ' MINS, ' + currentScenePageCount + ' PAGES, ' + currentSceneWordCount + ' WORDS')

  $('#playback #right-stats').html(totalSceneCount + ' SCENES, ' + totalPageCount + ' PAGES<br/>' + totalWordCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' WORDS')






}

let assignColors = function () {
  let angle = 0
  for (var node of locations) {
    angle += (360/4)+7
    c = Color("#00FF00").shiftHue(angle).desaturateByRatio(.1).darkenByRatio(0.65).blend(Color('white'), 0.4).saturateByRatio(.7)
    node.push(c.toCSS())
  }
}

let getSceneColor = function (sceneString) {
  if (sceneString) {
    let location = sceneString.split(' - ')
    if (location.length > 1) {
      location.pop()
    }
    location = location.join(' - ')
    return (locations.find(function (node) { return node[0] == location })[2])
  }
  return ('black')
}

let getCharacterOrder = function (characterString) {
  let character = characterString.split('(')[0].split(' AND ')[0].trim()
  return characters.indexOf(characters.find(function (node) { return node[0] == character }))
}

let renderSceneTimeline = () => {
  let html = []
  let currentCharacter
  let characterList = []

  html.push('<div class="marker-holder"><div class="marker">s</div></div>')
  switch (scriptData[currentNode].type) {
    case 'title':
    case 'section':
      html.push('<div style="flex: ' + scriptData[currentNode].duration + ';"></div>')
      break
    case 'scene':
      for (var node of scriptData[currentNode]['script'] ) {
        switch (node.type) {
          case 'scene_padding':
            html.push('<div style="flex: ' + node.duration + ';"></div>')
            break
          case 'action':
            currentCharacter = ''
            html.push('<div style="flex: ' + node.duration + '; top: 8px;" class="action"><span>' + node.text + '</span></div>')
            break
          case 'dialogue':
          case 'parenthetical':
            let character = node.character.split('(')[0].split(' AND ')[0].trim()
            if (characterList.indexOf(character) == -1) {
              characterList.push(character)
            }
            let index = characterList.indexOf(character)
            let importanceIndex = getCharacterOrder(character)

            html.push('<div style="flex: ' + node.duration + '; top: ' + ((index+2)*8) + 'px;" class="character')

            if (node.type == 'dialogue') {
            } else {
              html.push(' parenthetical ')
            }

            if (importanceIndex == 0) {
              html.push(' primary ')
            }
            if (importanceIndex == 1) {
              html.push(' secondary ')
            }
            if (importanceIndex == 2) {
              html.push(' thirdary ')
            }
            if (importanceIndex == 3) {
              html.push(' fourthary ')
            }


            html.push('"><span>')

            if (currentCharacter !== character) {
              html.push(character)
            }
            currentCharacter = character

            html.push('</span></div>')

            break
          case 'transition':
            currentCharacter = ''
            html.push('<div style="flex: ' + node.duration + ';"></div>')
            break
        }
      }
      break
  }
  $('#controls #scene-timeline #scene-timeline-content').html(html.join(''))
}

let renderTimeline = () => {
  let html = []
  html.push('<div class="marker-holder"><div class="marker"></div></div>')
  for (var node of scriptData ) {
    if (node.type !== 'section') {
      html.push('<div style="flex: ' + node.duration + ';"></div>')
    }
  }
  $('#controls #movie-timeline #movie-timeline-content').html(html.join(''))
}

let renderOutline = function() {
  let html = []
  let angle = 0
  let i = 0
  html.push('<div id="outline-spacer"></div><div id="outline-gradient"></div>')
  for (var node of scriptData ) {
    switch (node.type) {
      case 'title':
        html.push('<div class="title node" data-node="' + i + '"><span class="title-text">' + node.text + '</span>')
        if (node.author) {
          html.push('<span class="author">' + node.author + '</span>')
        }
        if (node.authors) {
          html.push('<span class="author">' + node.authors + '</span>')
        }
        html.push('</div>')
        break
      case 'section':
        html.push('<div class="section node" data-node="' + i + '">' + node.text + '</div>')
        break
      case 'scene':
        if (node.slugline) {
          html.push('<div class="scene node" data-node="' + i + '" style="background:' + getSceneColor(node.slugline) + '">')
        }
        if (node.slugline) {
          html.push('<span class="slugline">' + node.scene_number + '. ' + node.slugline + '</span>')
        }
        if (node.synopsis) {
          html.push('<span class="synopsis">' + node.synopsis + '</span>')
        }
        // time, duration, page, word_count
        html.push('</div>')
        break
    }
    i++
  }

  $('#outline').html(html.join(''))

  $("#outline .node").unbind('click').click((e)=>{
    stopPlaying()
    gotoFrame(e.currentTarget.dataset.node)
  })
}


let msToTime = (s)=> {
  if(!s) s = 0
  s = Math.max(0, s)
  function addZ(n) {
    return (n<10? '0':'') + n;
  }
  var ms = (s % 1000);
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;
  if (hrs) {
    return hrs + ':' + addZ(mins) + ':' + addZ(secs);
  } else {
    return mins + ':' + addZ(secs); //+ '.' + ms.toString().substring(0,1);
  }
};

window.onkeydown = function(e) {
    if(e.keyCode == 32 && e.target == document.body) {
        togglePlayback()
        e.preventDefault()
        //return false;
    }
}
//   $('.status').css('width', '0%')
//   var outlineData = remote.getGlobal('sharedObj').outlineData;

//   currentNode = Math.max(currentNode + direction,0);

//   if (outlineData[currentNode].type == 'section') {
//     currentNode = Math.max(currentNode + direction,1);
//   }

//   remote.getGlobal('sharedObj')['currentNode'] = currentNode

//   var sceneCount = 0;
//   var currentScene = 0;
//   var currentTime = 0;
//   var totalTime = 0;
//   var currentSection = '';


//   for (var i = 0; i < outlineData.length; i++) {
//     if (outlineData[i].type !== 'section') {
//       sceneCount++
//       if (i == currentNode) {
//         currentScene = sceneCount;
//       }
//       if (outlineData[i].timing) {
//         totalTime += Number(outlineData[i].timing)
//       } else {
//         totalTime += 90;
//       }
//       if (i < currentNode) {
//         currentTime = totalTime;
//       }

//     } else {
//       if (i < currentNode) {
//         currentSection = outlineData[i].text;
//       }
//     }
//   }

//   $('body').css('background', 'linear-gradient(#' + colorList[(currentNode+1) % colorList.length] + ', #' + colorList[Math.max(currentNode-1,0) % colorList.length] + ')')

//   $(".scene.current").removeClass('current')
//   $(".scene[data-id='" + currentNode + "']").addClass('current');


//   $('#scenemarker').text(currentSection + ': ' + currentScene + ' / ' + sceneCount + ' ' + msToTime(currentTime*1000) + ' / ' + msToTime(totalTime*1000))


//   clearTimeout(imageTimer)
//   if (remote.getGlobal('sharedObj').outlineData[currentNode].image.length > 0) {
//     currentImage = 0
//     if (playbackMode) {
//       imageInterval = Math.max(remote.getGlobal('sharedObj').outlineData[currentNode].description.length*69+600,2500)/remote.getGlobal('sharedObj').outlineData[currentNode].image.length
//       imageTimer = setTimeout(advanceImage, imageInterval)
//     }
//     $("#posterimage").attr("src",remote.getGlobal('sharedObj').documentPath + "/" + remote.getGlobal('sharedObj').outlineData[currentNode].image[0]);
//     $('#posterimage').show()
//   } else {
//     $('#posterimage').hide()
//   }


//   if (remote.getGlobal('sharedObj').outlineData[currentNode].text) { 
//     $('#caption').text(remote.getGlobal('sharedObj').outlineData[currentNode].text)
//   } else {
//     $('#caption').text('')
//   }
//   if (remote.getGlobal('sharedObj').outlineData[currentNode].description) { 
//     $('#description').html(remote.getGlobal('sharedObj').outlineData[currentNode].description) 
//   } else {
//     $('#description').text('')
//   }
//   if (remote.getGlobal('sharedObj').outlineData[currentNode].slugline) { 
//     $('#slugline').text(remote.getGlobal('sharedObj').outlineData[currentNode].slugline) 
//   } else {
//     $('#slugline').text('')
//   }
//   if (remote.getGlobal('sharedObj').outlineData[currentNode].timing) { 
//     $('#timing').text(remote.getGlobal('sharedObj').outlineData[currentNode].timing) 
//   } else {
//     $('#timing').text('')
//   }

 

// }





// var playAdvance = function(first) {
//   clearTimeout(frameTimer)
//   clearTimeout(updateTimer);
//   if(!first){
//     advanceFrame(1);
//   }
//   var outlineData = remote.getGlobal('sharedObj').outlineData;
  
//   if (playbackType < 2) {
//     var mult
//     if (playbackType == 1) {
//       mult = 4;
//     } else {
//       mult = 1;
//     }
//     if (outlineData[currentNode].timing) {
//       timing = Number(outlineData[currentNode].timing)*1000/mult
//     } else {
//       timing = 90*1000/mult
//     }
//   } else {
//     timing = 2000;
//   }


//   startSceneTime = new Date().getTime()
//   endSceneTime = startSceneTime + timing

//   frameTimer = setTimeout(playAdvance, timing)
//   updateTimer = setTimeout(updateTime, 20)
// };









// var updateTime = function() {
//   clearTimeout(updateTimer);


//   var per = ((new Date().getTime()-startSceneTime)/(endSceneTime-startSceneTime)*100).toFixed(2)

//   $('.status').css('width', String(per) + '%')


//   if (playbackMode) {
//     updateTimer = setTimeout(updateTime, 20)
//   } else {
//   }
// }

var reloadDocument = (update) => {
  
  scriptData = remote.getGlobal('sharedObj').scriptData
  locations = remote.getGlobal('sharedObj').locations
  characters = remote.getGlobal('sharedObj').characters

  totalWordCount = 0
  for (var node of scriptData) {
    if (node.word_count) totalWordCount += node.word_count
  }

  assignColors()
  if (update) {
    currentSceneNode = 0
    renderOutline()
    renderTimeline()
    renderSceneTimeline()
    togglePlayback()

  } else {
    currentNode = 0
    currentSceneNode = 0
    renderOutline()
    renderTimeline()
    renderSceneTimeline()
    advanceFrame(0)
  }
}

ipc.on('reload', (event, update, updatedScene) => {
  stopPlaying()
  currentSceneNode = 0
  if (updatedScene) {
    currentNode = updatedScene
  }
  
  if (update) {
    setTimeout(()=>{reloadDocument(true); advanceFrame(0)}, 1000)
  } else {
    advanceFrame(0)
    reloadDocument()
  }

})

ipc.on('togglePlayback', (event, arg) => {
  togglePlayback()
})


// document.ondragover = document.ondrop = function(ev) {
//   ev.preventDefault()
// }

// document.body.ondrop = function(ev) {
//   console.log(ev.dataTransfer.files[0].path)
//   // if image
//   // copy to document path
//   // save new outline text

//   // if text
//   // open the text file
//   // save pref for the last opened file

//   ev.preventDefault()
// }

// function msToTime(s) {
//   function addZ(n) {
//     return (n<10? '0':'') + n;
//   }
//   var ms = (s % 1000);
//   s = (s - ms) / 1000;
//   var secs = s % 60;
//   s = (s - secs) / 60;
//   var mins = s % 60;
//   var hrs = (s - mins) / 60;
//   if (hrs) {
//     return hrs + ':' + addZ(mins) + ':' + addZ(secs);
//   } else {
//     return mins + ':' + addZ(secs); //+ '.' + ms.toString().substring(0,1);
//   }
// };


// from external commands

ipc.on('goPrevious', (event, arg)=> {
  stopPlaying()
  advanceFrame(-1, true)
})

ipc.on('goPreviousScene', (event, arg)=> {
  stopPlaying()
  if (currentSceneNode > 0) {
    currentSceneNode = 0
  } else {
    currentNode = Math.max(currentNode-1, 0)
    currentSceneNode = 0
  }
  advanceFrame(0, true)
})

ipc.on('goNext', (event, arg)=> {
  stopPlaying()
  advanceFrame(1, true)
})

ipc.on('goNextScene', (event, arg)=> {
  stopPlaying()
  currentNode++
  currentSceneNode = 0
  advanceFrame(0, true)
})

ipc.on('goBeginning', (event, arg)=> {
  stopPlaying()
  currentNode = 0
  currentSceneNode = 0
  advanceFrame(0, true)
})

ipc.on('toggleSpeaking', (event, arg) => {
  speakingMode = !speakingMode
  if (speakingMode) {
    togglePlayback()
  } else {
    stopPlaying()
  }
})