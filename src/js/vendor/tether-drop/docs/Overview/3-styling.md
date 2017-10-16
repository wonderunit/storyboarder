## Stying Drops

Drop creates a basic HTML structure:

```html
<div class="drop-element">
  <div class="drop-content">
    <!-- Your content -->
  </div>
</div>
```

It adds the `drop-open` class when the drop is opened.

All of [Tether's](/tether) classes get added as well, using the `drop-` prefix.

### Animation

To facilitate animation, Drop stratigically adds and removes three classes
when a drop is opened:

- `drop-open` is added when the drop is opened and removed when it should be hidden.
Use `drop-open` if you don't need animation.
- `drop-after-open` is added in the next event loop tick after the drop is opened.
Start your CSS transitions when `drop-after-open` appears.
- `drop-open-transitionend` is added immediately, but not removed until the `transitionend`
event fires on the drop. Use `drop-open-transitionend` to control the showing and hiding
of your element when using an animation.

A simple CSS setup which demonstrates the method:

```css
.drop-element {
  // Set the initial state for our animation
  opacity: 0;
}
.drop-element.drop-open-transitionend {
  // Show our drop while it's open and while the transition is going on
  display: block;
}
.drop-element.drop-after-open {
  -webkit-transition: opacity 1s;
  -o-transition: opacity 1s;
  -moz-transition: opacity 1s;
  -ms-transition: opacity 1s;
  transition: opacity 1s;

  opacity: 1;
}
```

Be sure to include `.drop-element` in all of your selectors, as all classes get added to both
the element and the target.

### Themes

Drop ships with two animated themes and one non-animated one.  They are available in the
sass and css directories of the project.

If you look at the Sass, you'll notice that we make use of mixins which allow you to configure
many elements of the theme to make it suit your application.
