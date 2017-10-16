## Embedding Drop in Other Libraries

Drop is designed to be embeddable in other JavaScript libraries. For example, our
[tooltip library](/tooltip) includes an embedded copy of Drop.

### Classes

You probably want to change the classes to use your library's name to prefix its classes,
rather than using `'drop-`'.  Drop also adds a class to the body whenever any drop is opened;
by changing the prefix you are ensuring that your library's classes don't conflict with
another usage of Drop on the page.

To do this, call the `Drop.createContext` method.  It will return you a context-aware
`Drop` object you can use to make subsequent calls.

For example:

```coffeescript
_Drop = Drop.createContext
  classPrefix: 'tooltip'
```

Then, when you are creating a drop, use the returned object:

```coffeescript
drop = new _Drop
```

You can also pass `createContext` any default options you'd like to apply to
drops you create:

```coffeescript
_Drop = Drop.createContext
  classPrefix: 'tooltip'
  defaults:
    attach: 'top right'
```
