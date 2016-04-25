/**
 * @file
 * Drupal behavior preprocesor.
 *
 * Author: Chris Albrecht (chris [at] lullabot [dot] com).
 * Version: 0.2.0
 */

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
        Drupal._attachBehavior(this, name, context, settings);
      }
    });
  };

  /**
   * Attach a single behavior.
   *
   * @param name
   * @param context
   * @param settings
   */
  Drupal.attachBehavior = function(name, context, settings) {
    context = context || document;
    settings = settings || Drupal.settings;

    if (typeof Drupal.behaviors[name] === 'object' && $.isFunction(Drupal.behaviors[name].attach)) {
      Drupal._attachBehavior(Drupal.behaviors[name], name, context, settings);
    }
  };

  /**
   * Detach a single behavior.
   *
   * @param name
   * @param context
   * @param settings
   * @param trigger
   */
  Drupal.detachBehavior = function(name, context, settings, trigger) {
    context = context || document;
    settings = settings || Drupal.settings;
    trigger = trigger || 'unload';

    if (typeof Drupal.behaviors[name] === 'object' && $.isFunction(Drupal.behaviors[name].detach)) {
      this.detach(context, settings, trigger);
    }
  };

  /**
   * Private function to perform the behavior attachment.
   *
   * @param behavior
   * @param name
   * @param context
   * @param settings
   * @private
   */
  Drupal._attachBehavior = function(behavior, name, context, settings) {
    if (typeof behavior.preprocess !== 'undefined' && behavior.preprocess === true) {
      try {
        Drupal.preprocessBehavior(behavior, context, settings);
        behavior.attach(context, settings);
      }
      catch (err) {
        var str = err.toString();

        // Process the errors thrown from the preprocessor.  Pass other
        // exceptions on through for normal processing.
        if (str.indexOf('[PREPROCESS]') === 0) {
          if (behavior.settings.debug) {
            console.warn("Drupal Behavior '" + name + "' was not attached. " + str);
          }
        }
        else {
          throw err;
        }
      }
    }
    else {
      behavior.attach(context, settings);
    }
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
   * 2. Checks for required DOM elements.
   *    Define the elements your behavior will manipulate and the preprocessor
   *    will check to make sure they exist if they are required and will prevent
   *    the behavior from being attached if they don't.  A helper method is also
   *    added to load the element by simply specifying the name you gave it, to
   *    help keep the 'attach' method from becoming littered with jQuery
   *    wrappers.
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
   * - elements: Array of objects defining the elements to preload, keyed on a
   *     name.
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
    var errPrefix = '[PREPROCESS] ';

    // Set defaults.
    behavior.settings = behavior.settings || {};
    behavior.elements = behavior.elements || {};

    // Add the global default settings.
    behavior.settings = $.extend({debug: false}, behavior.settings);

    // Store the context for loading elements.
    behavior.context = context;

    // Merge Drupal.settings as defined in the behavior.
    if (typeof behavior.drupalSettings === 'object') {
      var inlineSettings = getChainedValue(settings, behavior.drupalSettings);
      if (typeof inlineSettings === 'object') {
        $.extend(behavior.settings, inlineSettings);
      }
      else {
        throw errPrefix + 'Drupal.settings.' + behavior.drupalSettings + ' is not an object.';
      }
    }

    // Check required elements.
    for (var e in behavior.elements) {
      behavior.elements[e].required = behavior.elements[e].required || false;

      if (behavior.elements[e].required && $(behavior.elements[e].selector, context).length === 0) {
        throw errPrefix + "Required element '" + e + "' was not found.";
      }
    }

    // Add a hidden method to load an element using the predefined array.
    $.extend(behavior, {
      getElement: function(name) {
        if (typeof this.elements[name] !== 'undefined') {
          return $(this.elements[name].selector, this.context);
        }
        else {
          throw errPrefix + "Requested element '" + name + "' could not be loaded as it is not defined in the 'elements' property.";
        }
      }
    });

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
