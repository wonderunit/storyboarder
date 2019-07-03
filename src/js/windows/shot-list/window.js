__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true }

const React = require('react')
const ReactDOM = require('react-dom')

const h = require('../../utils/h')

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const {
  getSceneFolderName,

  getCameraSetups,
  getShotListForScene,
  getShotListForProject
} = require('../../models/shot-list')

const CameraPlot = ({ imagesPath, filename, camera }) => {
  let src = path.join('..', '..', '..', '..', imagesPath, filename)
  return h([
    'div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr'
      }
    }, [
      [
        'div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '1rem 0',
            alignSelf: 'start'
          }
        }, [
          ['div', 'fov'],
          ['div', camera.fov],

          ['div', 'height'],
          ['div', camera.height],

          ['div', 'pos'],
          ['div', `${camera.x} ${camera.y}`]
        ]
      ],
      [
        'div', {
          style: {
            border: '2px solid black'
          }
        }, [
          'img', { src, width: '100%' }
        ]
      ]
    ]
  ])
}

const ShotListBeat = ({ shot, beat, imagesPath }) => {
  let posterframe = `board-${beat.number}-${beat.uid}-posterframe.jpg`
  let src = path.join('..', '..', '..', '..', imagesPath, posterframe)
  let camera = beat.camera
  return h([

      'div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr'
        }
      }, [
        [
          'div', {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              padding: '1rem 0',
              alignSelf: 'start'
            }
          }, [
            [
              ['div', 'adjustments:'],
              ['div']
            ],
            camera.fov ? [
              ['div', 'fov'],
              ['div', camera.fov]
            ] : [],
            camera.height ? [
              ['div', 'height'],
              ['div', camera.height]
            ] : [],
            (camera.x && camera.y) ? [
              ['div', 'pos'],
              ['div', `${camera.x} ${camera.y}`]
            ] : []
          ]
        ],
        ['img', { src, width: '50%' }]
      ]

  ])
}

const ShotListShot = ({ shot, imagesPath }) => {
  let posterframe = `board-${shot.number}-${shot.uid}-posterframe.jpg`
  let src = path.join('..', '..', '..', '..', imagesPath, posterframe)
  return h([
    'div', { style: { marginBottom: 40 } }, [
      ['div.shot-list-report__camera-setup', [
        ['div', `Camera Setup #${shot.setupNumber}`],
        [CameraPlot, { imagesPath, filename: `board-${shot.number}-${shot.uid}-camera-plot.png`, camera: shot }],

        [
          'div', {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr'
            }
          }, [
            ['div', {style: { padding: '1rem 0' }}, ''], // Shot
            ['img', { src, width: '100%' }]
          ]
        ],

        shot.beats.map(beat =>
          [ShotListBeat, { shot, beat, imagesPath }]
        )
      ]]
    ]
  ])
}

const ShotListProjectScene = ({ scriptFilePath, scene }) => {
  let folderName = getSceneFolderName({
    synopsis: scene.synopsis,
    slugline: scene.slugline,
    scene_number: scene.number,
    scene_id: scene.id
  })

  let imagesPath = path.join(
    path.dirname(scriptFilePath), 'storyboards', folderName, 'images')

  return h([
    'div', [
      ['div', `Shot ${scene.number}`],
      ['div', `${scene.synopsis || scene.slugline}`],
      [ShotListScene, { scene, imagesPath }]
    ]
  ])
}

const ShotListScene = ({ scene, imagesPath }) => {
  return h([
    'div', [
      ['div', 
        scene.shots.map(([shot]) => { // ???
          return [ShotListShot, { shot, imagesPath }]
        })
      ]
    ]
  ])
}

const ShotListReport = ({}) => {
  let scriptFilePath = path.join(
    'test', 'fixtures', 'projects', 'multi-scene', 'multi-scene.fountain')
  let list = getShotListForProject(scriptFilePath)
  return h([
    'div.shot-list-report', list.scenes.map(scene => [ShotListProjectScene, { scriptFilePath, scene }])
  ])
}

let div = document.createElement('div')
document.body.appendChild(div)
ReactDOM.render(
  h([
    'div.container', [ShotListReport]
  ]),
  div
)
