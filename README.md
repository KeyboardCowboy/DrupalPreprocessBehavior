# DrupalPreprocessBehavior

Behaviors are a very loose structure tying Drupal to jQuery.  This attempts
to simplify and add structure to some basic concepts from OOP and common
usages in Drupal Behaviors.

## What it does:
1. **Autoloads settings.**  
   If you have a module adding JS settings to the dom, simply add a line to
   the behavior telling it where those settings can be found.
   
1. **Preloads DOM elements.**  
   Most behaviors manipulate DOM elements in some way.  Instead of
   littering the 'attach()' method with jQuery selectors, define them in
   the behavior and they will be loaded for you and ready to go.
   
1. **Prevents unnecessary loading.**  
   No javascript file should be included on any page that doesn't need it.
   Drupal Behaviors are no different.  However, if they are being included
   on a page that may not include the DOM elements required for it to run,
   the preprocessor can identify that and prevent Drupal from attaching
   the behavior.
   
1. **Provides debugging information.**  
   Can't figure out why your behavior is not performing?  Debugging
   information is built into the preprocessor.

## How it works:
**Load the Library and Add Some Custom Settings**
  ```php
  /**
   * Implements hook_page_alter().
   *
   * @param $page
   */
  function my_module_page_alter(&$page) {
    $settings = array(
      'myModule' => array(
        'myBehaviorSettings' => array(
          'currentTime' => time(),
          'staticValue' => 'Chris',
        ),
      ),
    );
  
    $page['content']['#attached']['libraries_load'][] = array('DrupalPreprocessBehavior');
    $page['content']['#attached']['js'][] = array(
      'type' => 'setting',
      'data' => $settings,
    );
  }
  
  /**
   * Implements hook_library().
   */
  function my_module_libraries_info() {
    // Behavior preprocessor.
    $libraries['DrupalPreprocessBehavior'] = array(
      'name' => 'Behavior Preprocessor',
      'version' => '0.1.0',
      'files' => array(
        'js' => array(
          'drupal-preprocess-behavior.js',
        ),
      ),
      'vendor url' => 'https://github.com/KeyboardCowboy/DrupalPreprocessBehavior',
      'download url' => 'https://raw.githubusercontent.com/KeyboardCowboy/DrupalPreprocessBehavior/master/drupal-preprocess-behavior.js',
    );
  
    return $libraries;
  }
  ```

**Create Your Behavior**  
  ```javascript
  Drupal.behaviors.myBehavior = {
    // Allow the behavior to be preprocessed.
    preprocess: true,
    
    // Provide an array of elements to preload.
    elements: [
      {name: 'loginForm', 'selector': '#user-login-form', required: true}
    ],

    // Tell the preprocessor where to load settings from.
    drupalSettings: 'myModule.myBehaviorSettings',

    // The attach method still provides the context and settings params if
    // you need them.
    attach: function(context, settings) {
      this.$loginForm.css('background-color', 'red');
      alert(this.settings.staticValue + ' says the time is ' + this.settings.currentTime);
    }
  };
  ```

## Additional behavior parameters:
- `preprocess`: Boolean to preprocess this behavior.
- `drupalSettings`: String representing the path to the settings object for
    the behavior.
- `elements`: Array of objects defining the elements to preload.
  - `name` (required): The name of the element used to assign it as a
    property on the behavior.  Elements are added to the behavior using a
    dollar symbol prefixed to the name.  For example, if you name the
    element 'inputForm' then you can access this element in the behavior
    as 'this.$inputForm'.
  - `selector` (required): The css selector used to find the element(s).
  - `context` (optional): Tell the element to use a previously defined
    element as a context to limit the scope for this element.
  - `required` (optional): Tell the preprocessor that this element is
    required for it to work and to not attached the behavior if it does not.

A `settings` parameter will be added to the behavior containing the default
values from the preprocessor and the values from the Drupal.settings object
defined by the behavior if it was set.

## Additional Features
- `Drupal.attachBehavior()` to attach a single behavior.
- `Drupal.detachBehavior()` to detach a single behavior.
