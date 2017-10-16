(function() {
  var init, isMobile, setupExamples, setupHero, _Drop;

  _Drop = Drop.createContext({
    classPrefix: 'drop'
  });

  isMobile = $(window).width() < 567;

  init = function() {
    setupHero();
    return setupExamples();
  };

  setupHero = function() {
    var drop;
    return drop = new _Drop({
      target: $('.hero .drop-target')[0],
      classes: 'drop-theme-arrows-bounce-dark drop-hero',
      position: 'bottom center',
      constrainToWindow: false,
      constrainToScrollParent: false,
      openOn: 'always',
      content: '<h1>Drop.js</h1>\n<h2>The fast and capable<br/>dropdown library<br/><small style="opacity: 0.6; margin-top: 1em; display: block">Built on <a href="/tether/docs/welcome" target="_blank" style="color: inherit">Tether</a>.</small></h2>\n<p>\n    <a class="button" href="http://github.com/HubSpot/drop">★ On Github</a>\n</p>'
    });
  };

  setupExamples = function() {
    return $('.example').each(function() {
      var $example, $target, content, drop, openOn, theme;
      $example = $(this);
      theme = $example.data('theme');
      openOn = $example.data('open-on') || 'click';
      $target = $example.find('.drop-target');
      $target.addClass(theme);
      content = $example.find('.drop-content').html();
      return drop = new _Drop({
        target: $target[0],
        classes: theme,
        position: 'bottom center',
        constrainToWindow: true,
        constrainToScrollParent: false,
        openOn: openOn,
        content: content
      });
    });
  };

  init();

}).call(this);
