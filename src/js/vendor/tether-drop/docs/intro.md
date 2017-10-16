<link rel="stylesheet" href="/drop/dist/css/drop-theme-basic.css" />
<link rel="stylesheet" href="/drop/dist/css/drop-theme-arrows-bounce.css" />
<link rel="stylesheet" href="/drop/dist/css/drop-theme-arrows-bounce-dark.css" />
<script src="/drop/bower_components/tether/dist/js/tether.js"></script>
<script src="/drop/dist/js/drop.min.js"></script>
<script>
  $(function(){
    $('.drop-target').each(function(){
      var options = $.extend({}, {
        target: this,
        classes: 'drop-theme-arrows-bounce-dark',
        position: 'bottom left',
        constrainToWindow: true,
        constrainToScrollParent: true,
        openOn: 'click'
      }, $(this).data('options'));

      new Drop(options);
    })
  });
</script>

## Drop

Drop is a JavaScript and CSS library for creating dropdowns and other popups attached to elements on the page. Drop uses [Tether.js](http://github.hubspot.com/tether) to efficiently position its elements.

Thank you for considering Drop. We believe it's the best way of creating dropdown-style elements available right now.

### Features

Because Drop is built on [Tether](http://github.hubspot.com/tether), you get all of the benefits of its efficient and powerful positioning.

- Drops automatically reposition on page resizes and scrolls, reorienting to stay in view.
- Drop uses GPU accelerated positioning to maintain 60fps scrolling, even with dozens or hundreds of drops on screen and complex animation
- Drops can be nested within other drops
- Drops can be attached to any of 12 attachment points on the target, or you can leverage the full power of Tether to position your drop anywhere.
- Drops can be configured to open when the user clicks, hovers, or focuses an element.
- Drop is maintained by developers at [HubSpot](http://github.hubspot.com) who care about making it do everything you need.

### Dependencies

Tether

### Browser Support

IE9+ and all modern browsers

### Initialization

To initialize a drop, create a `Drop` instance:

```coffeescript
drop = new Drop
  target: document.querySelector('.drop-target')
  content: 'Welcome to the future!'
  position: 'bottom left'
  openOn: 'click'
```

You can also create Drops from a custom "context," allowing you to style Drops within that context with CSS
classes prefixed with an arbitrary string. By default, that `classPrefix` is `drop`. To define a new context:

```coffeescript
MyDropContext = Drop.createContext
  classPrefix: 'my-drop'

drop = new MyDropContext
  target: document.querySelector('.my-drop-target')
  content: 'Welcome to my new Drop context!'
```

Any Drops created within this context would be styled with classes like `my-drop-open` and `my-drop-content`
instead of `drop-open` and `drop-content`. Additionally, any options that would be set via `data-drop`
attributes in the default context would be set via `data-my-drop` instead.

### Methods

These methods can be called on the `Drop` instance returned when creating a drop.

#### `open()`

Opens the drop. Specifically, this adds `drop-open` and other classes to the drop.

#### `close()`

Closes the drop. Specifically, this removes `drop-open` and other classes from the drop. Closed drops will still remain in the DOM.

#### `remove()`

Remove the drop from the DOM.  The drop will be readded when it's next opened.  It can be used as an alternative to `close`.

#### `toggle()`

Will close the drop if opened, and open if closed.

#### `isOpened()`

Returns true if the drop is opened.

#### `position()`

Reposition the drop.  Call if you change the content of the drop or the position of the element it's attached to.

#### `destroy()`

Remove the drop along with all of its event bindings.  Calling any method after `destroy` is undefined.

### Options

The following options can be passed to the drop constructor:

#### `target`

The element (or a selector for an element) the Drop should stay adjacent to on the page.  An action on this element, such as
a click or hover, can be set to open the drop.

#### `content`

The content that should be rendered into the Drop.  Can be:

- A DOM element
- An HTML string
- A function that returns an HTML string or a DOM element.  `content()` is called on each open, with the drop instance passed as the first argument.

If this option is not set, it defaults to the value of the `data-${classPrefix}` (normally `data-drop`)
attribute on the target element.

#### `position`

Position specifies the attachment point (on the target) to attach the drop to. Options include:

```coffeescript
'top left'
'left top'
'left middle'
'left bottom'
'bottom left'
'bottom center'
'bottom right'
'right bottom'
'right middle'
'right top'
'top right'
'top center'
```

If this option is not set, it defaults to the value of the `data-${classPrefix}-position` (normally
`data-drop-position`) attribute on the target element.

More information about attachment can be found in the [Tether documentation](http://tether.io).

#### `openOn`

Specifies what event on the target opens the drop. If you set this to `undefined` or `null` you will need to manually call `.open()` and `.close()` on the `drop` instance.
`'always'` will open the drop immediately when it's rendered and leave it open.

```coffeescript
'click'
'hover'
'focus'
'always'
```

If this option is not set, it defaults to the value of the `data-${classPrefix}-openOn` (normally
`data-drop-openOn`) attribute on the target element.

#### `constrainToWindow`

If set to `true`, uses [Tether's](http://github.hubspot.com/tether) `constraints` list to flip the drop when it would otherwise be outside the viewport. This will cause drops with bottom attachments to switch to top when colliding with the bottom of the page and vice-versa. Dropdowns will not pin to the edge of the window if the user scrolls away from the target after opening a drop, but you can add that behavior by adding constraints through the `tetherOptions` option.

```coffeescript
true
false
```

#### `constrainToScrollParent`

Similar to `constrainToWindow` but for the target element's first scroll parent: the first parent that has `overflow: auto` or `overflow: scroll` set, or the body, whichever comes first.

#### `classes`

Additional class names to be added to the drop. These can be set to apply a theme (for example, [`drop-theme-arrows-bounce-dark`](https://github.com/HubSpot/drop/blob/master/css/drop-theme-arrows-bounce-dark.css)) and/or they can be set to apply custom styling to child elements of the drop.

#### `remove`

Set to `true` if you'd like the drop element to be removed from the DOM when the drop is closed and recreated when it's opened.

```coffeescript
true
false
```

#### `beforeClose`

Function that is run before closing the drop. If the function returns `false`, the closing of the drop will be prevented. Useful if you only want to programatically close the drop.

#### `hoverOpenDelay`

Amount of time (in milliseconds) to delay opening the drop after `mouseover`

#### `hoverCloseDelay`

Amount of time (in milliseconds) to delay closing the drop after `mouseout`

#### `focusDelay`

Amount of time (in milliseconds) to delay opening the drop after `focus`

#### `blurDelay`

Amount of time (in milliseconds) to delay closing the drop after `blur`

#### `openDelay`

Sets both the `hoverOpenDelay` and `focusDelay`

#### `closeDelay`

Sets both the `hoverCloseDelay` and `blurDelay`

#### `tetherOptions`

Additional options can be passed to customize Drop even further. These will get passed to the underlying Tether instance used to position the drop. See the the [Tether documentation](http://tether.io) for more information.  Set to `false` to disable Tether.

#### Defaults

The default option values are:

```coffeescript
defaultOptions =
    position: 'bottom left'
    openOn: 'click'
    constrainToWindow: true
    constrainToScrollParent: true
    classes: ''
    hoverOpenDelay: 0
    hoverCloseDelay: 50
    focusDelay: 0
    blurDelay: 50
    tetherOptions: {}
```

### Events

The drop instance has a few additional methods which are used for event binding:

- `on(eventName, handler, [ctx])`
- `off(eventName, [handler])`
- `once(eventName, handelr, [ctx])`

The following events are fired:

- `open`
- `close`

### Changing Content

You can access the DOM element which contains the drop's content at `.content`.  If you manipulate this content, make sure to call `.position()` to ensure that the
drop remains positioned correctly.

### Body Class

Drop adds a class to the body whenever a drop is open.  It defaults to `drop-open`. See the [Embedding documentation](http://github.hubspot.com/drop/overview/embedding_drop/) for more details.
