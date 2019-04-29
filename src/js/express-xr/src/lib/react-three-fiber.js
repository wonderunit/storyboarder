import _extends from '@babel/runtime/helpers/esm/extends';
import _objectWithoutPropertiesLoose from '@babel/runtime/helpers/esm/objectWithoutPropertiesLoose';
import * as THREE from 'three-new';
import { Raycaster, Vector2, OrthographicCamera, PerspectiveCamera, WebGLRenderer, Scene, Vector3, Math as Math$1 } from 'three-new';
import React, { useRef, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import Reconciler from 'react-reconciler';
import { unstable_now, unstable_scheduleCallback, unstable_cancelCallback, unstable_runWithPriority, unstable_IdlePriority } from 'scheduler';

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
const roots = new Map();
const emptyObject = {};
const is = {
  obj: a => a === Object(a),
  str: a => typeof a === 'string',
  num: a => typeof a === 'number',
  und: a => a === void 0,
  arr: a => Array.isArray(a),

  equ(a, b) {
    // Wrong type, doesn't match
    if (typeof a !== typeof b) return false; // Atomic, just compare a against b

    if (is.str(a) || is.num(a) || is.obj(a)) return a === b; // Array, shallow compare first to see if it's a match

    if (is.arr(a) && a == b) return true; // Last resort, go through keys

    let i;

    for (i in a) if (!(i in b)) return false;

    for (i in b) if (a[i] !== b[i]) return false;

    return is.und(i) ? a === b : true;
  }

};
let globalEffects = [];
function addEffect(callback) {
  globalEffects.push(callback);
}
let running = false;

function renderLoop(t) {
  running = true;
  let repeat = 0; // Run global effects

  globalEffects.forEach(effect => effect(t) && repeat++);
  roots.forEach(root => {
    const state = root.containerInfo.__state;
    const _state$current = state.current,
          invalidateFrameloop = _state$current.invalidateFrameloop,
          frames = _state$current.frames,
          active = _state$current.active,
          ready = _state$current.ready,
          subscribers = _state$current.subscribers,
          manual = _state$current.manual,
          scene = _state$current.scene,
          gl = _state$current.gl,
          camera = _state$current.camera;
    gl.setAnimationLoop(() => {
      // If the frameloop is invalidated, do not run another frame
      if (active && ready && (!invalidateFrameloop || frames > 0)) {
        // Decrease frame count
        state.current.frames = Math.max(0, state.current.frames - 1);
        repeat += !invalidateFrameloop ? 1 : state.current.frames; // Run local effects

        subscribers.forEach(fn => fn(state.current, t)); // Render content

        if (!manual) gl.render(scene, camera);
      }
    });
  }); // if (repeat !== 0) return requestAnimationFrame(renderLoop)
  // Flag end of operation

  running = false;
}

function invalidate(state, frames) {
  if (frames === void 0) {
    frames = 1;
  }

  if (state && state.current) state.current.frames = frames;else if (state === true) roots.forEach(root => root.containerInfo.__state.current.frames = frames);

  if (!running) {
    running = true; // requestAnimationFrame(renderLoop)

    renderLoop();
  }
}
let catalogue = {};
const apply = objects => catalogue = _extends({}, catalogue, objects);
function applyProps(instance, newProps, oldProps, interpolateArray, container) {
  if (oldProps === void 0) {
    oldProps = {};
  }

  if (interpolateArray === void 0) {
    interpolateArray = false;
  }

  // Filter equals, events and reserved props
  const sameProps = Object.keys(newProps).filter(key => is.equ(newProps[key], oldProps[key]));
  const handlers = Object.keys(newProps).filter(key => typeof newProps[key] === 'function' && key.startsWith('on'));
  const filteredProps = [...sameProps, 'children', 'key', 'ref'].reduce((acc, prop) => {
    let _ = acc[prop],
        rest = _objectWithoutPropertiesLoose(acc, [prop].map(_toPropertyKey));

    return rest;
  }, newProps);

  if (Object.keys(filteredProps).length > 0) {
    Object.entries(filteredProps).forEach((_ref) => {
      let key = _ref[0],
          value = _ref[1];

      if (!handlers.includes(key)) {
        let root = instance;
        let target = root[key];

        if (key.includes('-')) {
          const entries = key.split('-');
          target = entries.reduce((acc, key) => acc[key], instance); // If the target is atomic, it forces us to switch the root

          if (!(target && target.set)) {
            const _entries$reverse = entries.reverse(),
                  name = _entries$reverse[0],
                  reverseEntries = _entries$reverse.slice(1);

            root = reverseEntries.reverse().reduce((acc, key) => acc[key], instance);
            key = name;
          }
        } // Special treatment for objects with support for set/copy


        if (target && target.set && target.copy) {
          if (target.constructor.name === value.constructor.name) target.copy(value);else if (Array.isArray(value)) target.set(...value);else target.set(value); // Else, just overwrite the value
        } else root[key] = value;

        invalidateInstance(instance);
      }
    }); // Prep interaction handlers

    if (handlers.length) {
      // Add interactive object to central container
      if (container && instance.raycast && !(handlers.length === 1 && handlers[0] === 'onUpdate')) container.__interaction.push(instance);
      instance.__handlers = handlers.reduce((acc, key) => _extends({}, acc, {
        [key.charAt(2).toLowerCase() + key.substr(3)]: newProps[key]
      }), {});
    } // Call the update lifecycle when it is being updated


    if (!container) updateInstance(instance);
  }
}

function invalidateInstance(instance) {
  if (instance.__container && instance.__container.__state) invalidate(instance.__container.__state);
}

function updateInstance(instance) {
  if (instance.__handlers && instance.__handlers.update) instance.__handlers.update(instance);
}

function createInstance(type, _ref2, container) {
  let _ref2$args = _ref2.args,
      args = _ref2$args === void 0 ? [] : _ref2$args,
      props = _objectWithoutPropertiesLoose(_ref2, ["args"]);

  let name = `${type[0].toUpperCase()}${type.slice(1)}`;
  let instance;
  if (type === 'primitive') instance = props.object;else {
    const target = catalogue[name] || THREE[name];
    instance = is.arr(args) ? new target(...args) : new target(args);
  } // Apply initial props

  instance.__objects = [];
  instance.__container = container;
  applyProps(instance, props, {}, false, container);
  return instance;
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child);else {
      parentInstance.__objects.push(child);

      child.parent = parentInstance; // The attach attribute implies that the object attaches itself on the parent

      if (child.attach) parentInstance[child.attach] = child;else if (child.attachArray) {
        if (!is.arr(parentInstance[child.attachArray])) parentInstance[child.attachArray] = [];
        parentInstance[child.attachArray].push(child);
      } else if (child.attachObject) {
        if (!is.obj(parentInstance[child.attachObject[0]])) parentInstance[child.attachObject[0]] = {};
        parentInstance[child.attachObject[0]][child.attachObject[1]] = child;
      }
    }
    updateInstance(child);
    invalidateInstance(child);
  }
}

function insertBefore(parentInstance, child, beforeChild) {
  if (child) {
    if (child.isObject3D) {
      child.parent = parentInstance;
      child.dispatchEvent({
        type: 'added'
      }); // TODO: the order is out of whack if data objects are present, has to be recalculated

      const index = parentInstance.children.indexOf(beforeChild);
      parentInstance.children = [...parentInstance.children.slice(0, index), child, ...parentInstance.children.slice(index)];
      updateInstance(child);
    } else appendChild(parentInstance, child); // TODO: order!!!


    invalidateInstance(child);
  }
}

function removeChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) {
      parentInstance.remove(child);
    } else {
      child.parent = undefined;
      parentInstance.__objects = parentInstance.__objects.filter(x => x !== child); // Remove attachment

      if (child.attach) parentInstance[child.attach] = undefined;else if (child.attachArray) parentInstance[child.attachArray] = parentInstance[child.attachArray].filter(x => x !== child);else if (child.attachObject) parentInstance[child.attachObject[0]][child.attachObject[1]] = undefined;
    }

    invalidateInstance(child);
    unstable_runWithPriority(unstable_IdlePriority, () => {
      // Remove child objects
      child.__objects.forEach(nestedChild => removeChild(child, nestedChild)); // Dispose item


      if (child.dispose) child.dispose(); // TODO: remove events

      delete child.__container;
      delete child.__objects;
    });
  }
}

const Renderer = Reconciler({
  now: unstable_now,
  createInstance,
  removeChild,
  appendChild,
  insertBefore,
  supportsMutation: true,
  isPrimaryRenderer: false,
  schedulePassiveEffects: unstable_scheduleCallback,
  cancelPassiveEffects: unstable_cancelCallback,
  appendInitialChild: appendChild,
  appendChildToContainer: appendChild,
  removeChildFromContainer: removeChild,
  insertInContainerBefore: insertBefore,

  commitUpdate(instance, updatePayload, type, oldProps, newProps, fiber) {
    if (instance.isObject3D) {
      applyProps(instance, newProps, oldProps);
    } else {
      // This is a data object, let's extract critical information about it
      const parent = instance.parent;

      const _newProps$args = newProps.args,
            argsNew = _newProps$args === void 0 ? [] : _newProps$args,
            restNew = _objectWithoutPropertiesLoose(newProps, ["args"]);

      const _oldProps$args = oldProps.args,
            argsOld = _oldProps$args === void 0 ? [] : _oldProps$args,
            restOld = _objectWithoutPropertiesLoose(oldProps, ["args"]); // If it has new props or arguments, then it needs to be re-instanciated
      // TODO, are colors falsely detected here?


      if (argsNew.some((value, index) => value !== argsOld[index])) {
        // Next we create a new instance and append it again
        const newInstance = createInstance(type, newProps, instance.__container);
        removeChild(parent, instance);
        appendChild(parent, newInstance) // This evil hack switches the react-internal fiber node
        // https://github.com/facebook/react/issues/14983
        // https://github.com/facebook/react/pull/15021
        ;
        [fiber, fiber.alternate].forEach(fiber => {
          if (fiber !== null) {
            fiber.stateNode = newInstance;

            if (fiber.ref) {
              if (typeof fiber.ref === 'function') fiber.ref(newInstance);else fiber.ref.current = newInstance;
            }
          }
        });
      } else {
        // Otherwise just overwrite props
        applyProps(instance, restNew, restOld);
      }
    }
  },

  getPublicInstance(instance) {
    return instance;
  },

  getRootHostContext(rootContainerInstance) {
    return emptyObject;
  },

  getChildHostContext(parentHostContext, type) {
    return emptyObject;
  },

  createTextInstance() {},

  finalizeInitialChildren(instance, type, props, rootContainerInstance) {
    return false;
  },

  prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, hostContext) {
    return emptyObject;
  },

  shouldDeprioritizeSubtree(type, props) {
    return false;
  },

  prepareForCommit() {},

  resetAfterCommit() {},

  shouldSetTextContent(props) {
    return false;
  }

});
function render(element, container, state) {
  let root = roots.get(container);

  if (!root) {
    root = Renderer.createContainer(container);
    container.__state = state;
    roots.set(container, root);
  }

  Renderer.updateContainer(element, root, null, undefined);
  return Renderer.getPublicRootInstance(root);
}
function unmountComponentAtNode(container) {
  const root = roots.get(container);
  if (root) Renderer.updateContainer(null, root, null, () => roots.delete(container));
}

const stateContext = React.createContext();

function useMeasure() {
  const ref = useRef();

  const _useState = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0
  }),
        bounds = _useState[0],
        set = _useState[1];

  const _useState2 = useState(() => new ResizeObserver((_ref) => {
    let entry = _ref[0];
    return set(entry.contentRect);
  })),
        ro = _useState2[0];

  useEffect(() => {
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref.current]);
  return [{
    ref
  }, bounds];
}

const Canvas = React.memo((_ref2) => {
  let children = _ref2.children,
      gl = _ref2.gl,
      camera = _ref2.camera,
      orthographic = _ref2.orthographic,
      raycaster = _ref2.raycaster,
      style = _ref2.style,
      pixelRatio = _ref2.pixelRatio,
      _ref2$invalidateFrame = _ref2.invalidateFrameloop,
      invalidateFrameloop = _ref2$invalidateFrame === void 0 ? false : _ref2$invalidateFrame,
      onCreated = _ref2.onCreated,
      rest = _objectWithoutPropertiesLoose(_ref2, ["children", "gl", "camera", "orthographic", "raycaster", "style", "pixelRatio", "invalidateFrameloop", "onCreated"]);

  // Local, reactive state
  const canvas = useRef();

  const _useState3 = useState(false),
        ready = _useState3[0],
        setReady = _useState3[1];

  const _useMeasure = useMeasure(),
        bind = _useMeasure[0],
        size = _useMeasure[1];

  const _useState4 = useState(() => {
    const ray = new Raycaster();
    if (raycaster) applyProps(ray, raycaster, {});
    return ray;
  }),
        defaultRaycaster = _useState4[0];

  const _useState5 = useState(() => new Vector2()),
        mouse = _useState5[0];

  const _useState6 = useState(() => {
    const cam = orthographic ? new OrthographicCamera(0, 0, 0, 0, 0.1, 1000) : new PerspectiveCamera(75, 0, 0.1, 1000);
    cam.position.z = 5;
    if (camera) applyProps(cam, camera, {});
    return cam;
  }),
        defaultCam = _useState6[0],
        _setDefaultCamera = _useState6[1]; // Public state


  const state = useRef({
    ready: false,
    subscribers: [],
    manual: false,
    active: true,
    canvas: undefined,
    gl: undefined,
    camera: undefined,
    scene: undefined,
    size: undefined,
    canvasRect: undefined,
    frames: 0,
    viewport: undefined,
    captured: undefined,
    subscribe: (fn, main) => {
      state.current.subscribers.push(fn);
      return () => state.current.subscribers = state.current.subscribers.filter(s => s !== fn);
    },
    setManual: takeOverRenderloop => {
      state.current.manual = takeOverRenderloop;

      if (takeOverRenderloop) {
        // In manual mode items shouldn't really be part of the internal scene which has adverse effects
        // on the camera being unable to update without explicit calls to updateMatrixWorl()
        state.current.scene.children.forEach(child => state.current.scene.remove(child));
      }
    },
    setDefaultCamera: cam => {
      state.current.camera = cam;

      _setDefaultCamera(cam);
    },
    invalidate: () => invalidate(state)
  }); // This is used as a clone of the current state, to be distributed through context and useThree

  const sharedState = useRef(state.current); // Writes locals into public state for distribution among subscribers, context, etc

  useEffect(() => {
    state.current.ready = ready;
    state.current.size = size;
    state.current.camera = defaultCam;
    state.current.invalidateFrameloop = invalidateFrameloop;
  }, [invalidateFrameloop, ready, size, defaultCam]); // Component mount effect, creates the webGL render context

  useEffect(() => {
    state.current.gl = new WebGLRenderer(_extends({
      canvas: canvas.current,
      antialias: true,
      alpha: true
    }, gl));
    if (pixelRatio) state.current.gl.setPixelRatio(pixelRatio);
    state.current.gl.setClearAlpha(0);
    state.current.canvas = canvas.current;
    state.current.scene = new Scene();
    state.current.scene.__interaction = [];
    state.current.scene.__objects = []; // Start render-loop

    invalidate(state); // Clean-up


    return () => {
      state.current.active = false;
      unmountComponentAtNode(state.current.scene);
    };
  }, []); // Adjusts default camera

  useEffect(() => {
    state.current.aspect = size.width / size.height || 0;

    if (state.current.camera.isOrthographicCamera) {
      state.current.viewport = {
        width: size.width,
        height: size.height,
        factor: 1
      };
    } else {
      const target = new Vector3(0, 0, 0);
      const distance = state.current.camera.position.distanceTo(target);
      const fov = Math$1.degToRad(state.current.camera.fov); // convert vertical fov to radians

      const height = 2 * Math.tan(fov / 2) * distance; // visible height

      const width = height * state.current.aspect;
      state.current.viewport = {
        width,
        height,
        factor: size.width / width
      };
    }

    state.current.canvasRect = bind.ref.current.getBoundingClientRect();

    if (ready) {
      state.current.gl.setSize(size.width, size.height);

      if (state.current.camera.isOrthographicCamera) {
        state.current.camera.left = size.width / -2;
        state.current.camera.right = size.width / 2;
        state.current.camera.top = size.height / 2;
        state.current.camera.bottom = size.height / -2;
      } else {
        state.current.camera.aspect = state.current.aspect;
        state.current.camera.radius = (size.width + size.height) / 4;
      }

      state.current.camera.updateProjectionMatrix();

      invalidate(state);
    } // Only trigger the context provider when necessary


    sharedState.current = _extends({}, state.current);
  }, [ready, size, defaultCam]); // This component is a bridge into the three render context, when it gets rendererd
  // we know we are ready to compile shaders, call subscribers, etc

  const IsReady = useCallback(() => {
    const activate = useCallback(() => void (setReady(true), invalidate(state)), []);
    useEffect(() => {
      if (onCreated) {
        const result = onCreated(state.current);
        if (result.then) return void result.then(activate);
      }

      activate();
    }, []);
    return null;
  }, []); // Render v-dom into scene

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      render(React.createElement(stateContext.Provider, {
        value: sharedState.current
      }, React.createElement(IsReady, null), typeof children === 'function' ? children(state.current) : children), state.current.scene, state);
    }
  });
  /** Sets up defaultRaycaster */

  const prepareRay = useCallback(event => {
    const canvasRect = state.current.canvasRect;
    const x = (event.clientX - canvasRect.left) / (canvasRect.right - canvasRect.left) * 2 - 1;
    const y = -((event.clientY - canvasRect.top) / (canvasRect.bottom - canvasRect.top)) * 2 + 1;
    mouse.set(x, y);
    defaultRaycaster.setFromCamera(mouse, state.current.camera);
  }, []);
  /** Intersects interaction objects using the event input */

  const intersect = useCallback(function (event, prepare) {
    if (prepare === void 0) {
      prepare = true;
    }

    if (prepare) prepareRay(event);
    const intersects = defaultRaycaster.intersectObjects(state.current.scene.__interaction, true);
    const hits = [];

    for (let intersect of intersects) {
      let object = intersect.object; // Bubble event up

      while (object) {
        if (object.__handlers) hits.push(_extends({}, intersect, {
          object
        }));
        object = object.parent;
      }
    }

    return hits;
  });
  /**  Handles intersections by forwarding them to handlers */

  const handleIntersects = useCallback((event, fn) => {
    prepareRay(event); // If the interaction is captured, take the last known hit instead of raycasting again

    const hits = state.current.captured && event.type !== 'click' && event.type !== 'wheel' ? state.current.captured : intersect(event, false);

    if (hits.length) {
      const point = new Vector3(event.clientX / state.current.size.width * 2 - 1, -(event.clientY / state.current.size.height) * 2 + 1, 0).unproject(state.current.camera);

      for (let hit of hits) {
        let stopped = {
          current: false
        };
        fn(_extends({}, Object.assign({}, event), hit, {
          stopped,
          point,
          ray: defaultRaycaster.ray,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => stopped.current = true
        }));
        if (stopped.current === true) break;
      }
    }

    return hits;
  }, []);
  const handlePointer = useCallback(name => event => {
    if (!state.current.ready) return;
    handleIntersects(event, data => {
      const object = data.object;
      const handlers = object.__handlers;
      if (handlers[name]) handlers[name](data);
    });
  }, []);
  const hovered = useRef({});
  const handlePointerMove = useCallback(event => {
    if (!state.current.ready) return;
    const hits = handleIntersects(event, data => {
      const object = data.object;
      const handlers = object.__handlers; // Call mouse move

      if (handlers.pointerMove) handlers.pointerMove(data); // Check if mouse enter is present

      if (handlers.pointerOver) {
        if (!hovered.current[object.uuid]) {
          // If the object wasn't previously hovered, book it and call its handler
          hovered.current[object.uuid] = data;
          handlers.pointerOver(_extends({}, data, {
            type: 'pointerover'
          }));
        } else if (hovered.current[object.uuid].stopped.current) {
          // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
          data.stopPropagation(); // In fact, wwe can safely remove them from the cache

          Object.values(hovered.current).forEach(data => {
            if (data.object.uuid !== object.uuid) {
              if (data.object.__handlers.pointerOut) data.object.__handlers.pointerOut(_extends({}, data, {
                type: 'pointerout'
              }));
              delete hovered.current[data.object.uuid];
            }
          });
        }
      }
    }); // Take care of unhover

    handlePointerCancel(event, hits);
  }, []);
  const handlePointerCancel = useCallback((event, hits) => {
    if (!hits) hits = handleIntersects(event, () => null);
    Object.values(hovered.current).forEach(data => {
      if (!hits.length || !hits.find(i => i.object === data.object)) {
        if (data.object.__handlers.pointerOut) data.object.__handlers.pointerOut(_extends({}, data, {
          type: 'pointerout'
        }));
        delete hovered.current[data.object.uuid];
      }
    });
  }, []); // Render the canvas into the dom

  return React.createElement("div", _extends({}, bind, {
    onClick: handlePointer('click'),
    onWheel: handlePointer('wheel'),
    onPointerDown: handlePointer('pointerDown'),
    onPointerUp: handlePointer('pointerUp'),
    onPointerLeave: event => handlePointerCancel(event, []),
    onPointerMove: handlePointerMove // On capture intersect and remember the last known position
    ,
    onGotPointerCapture: event => state.current.captured = intersect(event, false) // On lost capture remove the captured hit
    ,
    onLostPointerCapture: event => (state.current.captured = undefined, handlePointerCancel(event))
  }, rest, {
    style: _extends({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }, style)
  }), React.createElement("canvas", {
    ref: canvas,
    style: {
      display: 'block'
    }
  }));
});

function useRender(fn, takeOverRenderloop) {
  const _useContext = useContext(stateContext),
        subscribe = _useContext.subscribe,
        setManual = _useContext.setManual; // This calls into the host to inform it whether the render-loop is manual or not


  useMemo(() => takeOverRenderloop && setManual(true), [takeOverRenderloop]);
  useEffect(() => {
    // Subscribe to the render-loop
    const unsubscribe = subscribe(fn, takeOverRenderloop);
    return () => {
      // Call subscription off on unmount
      unsubscribe();
      if (takeOverRenderloop) setManual(false);
    };
  }, []);
}
function useThree() {
  const _useContext2 = useContext(stateContext),
        subscribe = _useContext2.subscribe,
        props = _objectWithoutPropertiesLoose(_useContext2, ["subscribe"]);

  return props;
}
function useUpdate(callback, dependents, optionalRef) {
  const _useContext3 = useContext(stateContext),
        invalidate = _useContext3.invalidate;

  let ref = useRef();
  if (optionalRef) ref = optionalRef;
  useEffect(() => {
    callback(ref.current);
    invalidate();
  }, dependents);
  return ref;
}
function useResource(optionalRef) {
  let ref = useRef();
  if (optionalRef) ref = optionalRef;

  const _useState = useState(),
        resource = _useState[0],
        set = _useState[1];

  useEffect(() => void set(ref.current), [ref.current]);
  return resource;
}

export { Canvas, addEffect, invalidate, render, unmountComponentAtNode, apply, applyProps, useRender, useThree, useUpdate, useResource };
