threejs-starter-kit
===================

My current worlflow for quick Three.js prototypes.

![screenshot](/screenshot.png)

## Usage
After cloning install all node dependencies
```bash
npm i
```

Then launch the main task to open the livereload server  
```bash
npm start
```

You are good to go !

## Deployment
```bash
npm run build
```
Then put the content of the `dist` folder on your server.
You can also just run use [now](https://zeit.co/now) for a quick deployment.

I usually include debug tools only in development mode. This can be done by using the `DEVELOPMENT` environment variable that is set by wepack.
```js
if (DEVELOPMENT) {
  const gui = require('guigui') // will not be included in production
}
```

## Features
- ES6 with [Babel](http://babeljs.io) and [Webpack](https://webpack.org)
- [Glslify](https://github.com/glslify/glslify) webpack loader
- Postprocessing with [vanruesc/postprocessing](https://github.com/vanruesc/postprocessing)
- My personnal [GUI](http://github.com/superguigui/guigui#dev)
- Extandable asset loader
- Environment variable to exclude debug stuff in production build
- Basic config for [now](https://zeit.co/now) deployment
- Simple setup with my ideal file structure

## File Structure and coding style
I like to create "Objects" classes in `src/objects` that contain elements from my scene. They usually extend `THREE.Object3D` so that they can be added to a parent, have positions and rotations etc... I also sometime extend `THREE.Mesh` directly but it can be a bit restrictive since in that case you need to prepare all geometries and material in the constructor before the call to `super()` without being able to use `this`.

Also i like to avoid using the `THREE` global keyword and instead I import only the components that I need from `three`. This is pointless (for now) but it might be useful in the tree-shaking future / alternate reality.
```js
import { Object3D, Mesh, MeshBasicMaterial } from 'three'
```
