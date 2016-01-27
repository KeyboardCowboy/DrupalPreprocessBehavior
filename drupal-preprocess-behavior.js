(function ($) {
  "use strict";

  /**
   * Override Drupal.attachBehaviors to add a preprocessor.
   *
   * @param context
   * @param settings
   */
  Drupal.attachBehaviors = function (context, settings) {
    context = context || document;
    settings = settings || Drupal.settings;
    // Execute all of them.
    $.each(Drupal.behaviors, function (name) {
      if ($.isFunction(this.attach)) {
        if (typeof this.preprocess !== 'undefined' && this.preprocess === true) {
          try {
            Drupal.preprocessBehavior(this, context, settings);
            this.attach(context, settings);
          }
          catch (err) {
            if (this.settings.debug) {
              console.warn("Drupal Behavior '" + name + "' was not attached. " + err);
            }
          }
        }
        else {
          this.attach(context, settings);
        }
      }
    });
  };

  /**
   * Preprocess a Drupal behavior.
   *
   * Behaviors are a very loose structure tying Drupal to jQuery.  This attempts
   * to simplify and add structure to some basic concepts from OOP and common
   * usages in Drupal Behaviors.
   *
   * What it does:
   * 1. Autoloads settings.
   *    If you have a module adding JS settings to the dom, simply add a line to
   *    the behavior telling it where those settings can be found.
   *
   * 2. Preloads DOM elements.
   *    Most behaviors manipulate DOM elements in some way.  Instead of
   *    littering the 'attach()' method with jQuery selectors, define them in
   *    the behavior and they will be loaded for you and ready to go.
   *
   * 3. Prevents unnecessary loading.
   *    No javascript file should be included on any page that doesn't need it.
   *    Drupal Behaviors are no different.  However, if they are being included
   *    on a page that may not include the DOM elements required for it to run,
   *    the preprocessor can identify that and prevent Drupal from attaching
   *    the behavior.
   *
   * 4. Provides debugging information.
   *    Can't figure out why your behavior is not performing?  Debugging
   *    information is built into the preprocessor.
   *
   * How it works:
   * Example
   *   @code
   *   Drupal.behaviors.myBehavior = {
   *     // Allow the behavior to be preprocessed.
   *     preprocess: true,
   *
   *     // Provide an array of elements to preload.
   *     elements: [
   *       {name: 'loginForm', 'selector': '#user-login-form', required: true}
   *     ],
   *
   *     // Tell the preprocessor where to load settings from.
   *     drupalSettings: 'myModule.myBehaviorSettings',
   *
   *     // The attach method still provides the context and settings params if
   *     // you need them.
   *     attach: function(context, settings) {
   *       this.$loginForm.css('background-color', 'red');
   *     }
   *   };
   *   @endcode
   *
   * Additional behavior parameters:
   * - preprocess: Boolean to preprocess this behavior.
   * - drupalSettings: String representing the path to the settings object for
   *     the behavior.
   * - elements: Array of objects defining the elements to preload.
   *   - name (required): The name of the element used to assign it as a
   *     property on the behavior.  Elements are added to the behavior using a
   *     dollar symbol prefixed to the name.  For example, if you name the
   *     element 'inputForm' then you can access this element in the behavior
   *     as 'this.$inputForm'.
   *   - selector (required): The css selector used to find the element(s).
   *   - context (optional): Tell the element to use a previously defined
   *     element as a context to limit the scope for this element.
   *   - required (optional): Tell the preprocessor that this element is
   *     required for it to work and to not attached the behavior if it does not.
   *
   * @param behavior
   *   The behavior being preprocessed.
   * @param context
   *   The document context or other passed into the behavior.
   * @param settings
   *   The Drupal.settings object or other passed into the behavior.
   */
  Drupal.preprocessBehavior = function(behavior, context, settings) {
    // Add a local settings object if one is not set.
    behavior.settings = behavior.settings || {};

    // Add the global default settings.
    behavior.settings = $.extend({debug: false}, behavior.settings);

    // Merge Drupal.settings as defined in the behavior.
    if (behavior.drupalSettings.length > 0) {
      var inlineSettings = getChainedValue(settings, behavior.drupalSettings);
      if (typeof inlineSettings === 'object') {
        $.extend(behavior.settings, inlineSettings);
      }
      else {
        throw 'Drupal.settings.' + behavior.drupalSettings + ' is not an object.';
      }
    }

    // Load the DOM elements needed for the behavior to work.
    for (var e in behavior.elements) {
      behavior.elements[e].required = behavior.elements[e].required || false;
      behavior.elements[e].context = behavior.elements[e].context || false;
      var element = behavior.elements[e];
      var elementName = '$' + element.name;
      var elementContextName = element.context ? '$' + element.context : false;

      // Store the element.
      if (element.context && (typeof behavior[elementContextName] !== 'undefined')) {
        behavior[elementName] = $(element.selector, behavior[elementContextName]);
      }
      else {
        behavior[elementName] = $(element.selector);
      }

      // Check for requirements.
      if (element.required && behavior[elementName].length === 0) {
        throw 'Required element ' + elementName + ' was not found.';
      }
    }

    /**
     * Safely extract a value from deep inside an object.
     *
     * @param root
     *   The root object to extract from.
     * @param chain
     *   The chained parameter we want to retrieve as a string.
     * @returns {*}
     *   The value of the parameter or false if it is not defined.
     */
    function getChainedValue(root, chain) {
      var parts = chain.split('.');
      var value = root;

      for (var p in parts) {
        if (typeof value[parts[p]] !== 'undefined') {
          value = value[parts[p]];
        }
        else {
          return false;
        }
      }

      return value;
    }
  };
})(jQuery);
