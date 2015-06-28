;
(function() {
    /** Used to determine if values are of the language type `Object`. */
    var objectTypes = {
        'function': true,
        'object': true
    };
    /** Detect free variable `exports`. */
    var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
    /** Detect free variable `module`. */
    var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
    /** Detect free variable `global` from Node.js. */
    var freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;
    /** Detect free variable `self`. */
    var freeSelf = objectTypes[typeof self] && self && self.Object && self;
    /** Detect free variable `window`. */
    var freeWindow = objectTypes[typeof window] && window && window.Object && window;
    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;
    /**
     * Used as a reference to the global object.
     *
     * The `this` value is used if it's the global object to avoid Greasemonkey's
     * restricted `window` object, otherwise the `window` object is used.
     */
    var root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

    function runInContext(context) {
        // Avoid issues with some ES3 environments that attempt to use values, named
        // after built-in constructors like `Object`, for the creation of literals.
        // ES5 clears this up by stating that literals must use built-in constructors.
        // See https://es5.github.io/#x11.1.5 for more details.
        context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;
        var utils = {};
        utils.events = {
            addHandler: function(element, type, handler) {
                if (element.addEventListener) {
                    element.addEventListener(type, handler, false);
                } else if (element.attachEvent) {
                    element.attachEvent("on" + type, handler);
                } else {
                    element["on" + type] = handler;
                }
            },
            removeHandler: function(element, type, handler) {
                if (element.removeEventListener) {
                    element.removeEventListener(type, handler, false);
                } else if (element.detachEvent) {
                    element.detachEvent("on" + type, handler);
                } else {
                    element["on" + type] = null;
                }
            },
            getEvent: function(event) {
                return event ? event : window.event;
            },
            getTarget: function(event) {
                return event.target || event.srcElement;
            },
            preventDefault: function(event) {
                if (event.preventDefault) {
                    event.preventDefault();
                } else {
                    event.returnValue = false;
                }
            },
            stopPropagation: function(event) {
                if (event.stopPropagation) {
                    event.stopPropagation();
                } else {
                    event.cancelBubble = true;
                }
            },
            getRelatedTarget: function(event) {
                if (event.relatedTarget) {
                    return event.relatedTarget;
                } else if (event.toElement) {
                    return event.toElement;
                } else if (event.fromElement) {
                    return event.fromElement;
                } else {
                    return null;
                }
            },
            getWheelDelta: function(event) {
                if (event.wheelDelta) {
                    return event.wheelDelta;
                } else {
                    return -event.detail * 40
                }
            },
            getCharCode: function(event) {
                if (typeof event.charCode == 'number') {
                    return event.charCode;
                } else {
                    return event.keyCode;
                }
            }
        };
        utils.curry = function(fn) {
            var slice = [].slice,
                args = slice.call(arguments, 1);
            return function() {
                return fn.apply(this, args.concat(slice.call(arguments)));
            };
        };

        utils.curry_bind = function(fn, that) {
          var slice = [].slice,
              args = slice.call(arguments, 2);
          return function () {
            return fn.apply(that, args.concat(slice.call(arguments)));
          };
        };

        // http://ejohn.org/blog/partial-functions-in-javascript/
        utils.partial = function(fn){
            var args = Array.prototype.slice.call(arguments, 1);
            return function(){
              var arg = 0;
              for ( var i = 0; i < args.length && arg < arguments.length; i++ ) {
                if ( args[i] === undefined ) {
                  args[i] = arguments[arg++];
                };
              };
              return fn.apply(this, args);
            };
          };
        
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        utils.debounce = function(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this,
                    args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

        /**
         * the pubsub is a publisher/subscriber system to demonstrate
         * use of Function.call and Function.apply.
         * http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
         */

        var pubsub = {};

        /**
         * pubsub.subscribers is an object where each key is an event
         * and each value is an array of callback functions associated
         * with a particular event.
         */
        pubsub.subscribers = {
          'some_event': [
            function () { console.log("some_event occured!"); }
          ]
        };

        /**
         * pubsub.publish calls all the callbacks associated with a
         * particular event (the first argument), passing each callback
         * any further arguments supplied to publish.
         */

        pubsub.publish = function () {
          // arguments is not an array.
          // use `[].slice.call` to turn it into a proper one.
          // See: http://s.phuu.net/SiRS7W
          var args = [].slice.call(arguments, 0);

          // pull the event off the front of the array of arguments.
          var event = args.shift();

          // If we have no subscribers to this event, initialise it.
          // Note, we could just return here.
          if( !pubsub.subscribers[event] ) pubsub.subscribers[event] = [];

          // Run through all the subscriber callbacks to the event and
          // fire them using `apply`. This runs the cb with a set of
          // arguments from the args array.
          // See: http://s.phuu.net/SiSkTC
          pubsub.subscribers[event].forEach(function (cb) {
            cb.apply(this, args);
          });
        };

        /**
         * pubsub.subscribe adds a callback an event's list
         */

        pubsub.subscribe = function (event, cb) {
          // first, if this is a new event, set up a new list in the
          // subscribers object.
          if( !pubsub.subscribers[event] ) {
            pubsub.subscribers[event] = [];
          }
          // next, push the supplied callback into the list to be
          // called when the object is published
          pubsub.subscribers[event].push(cb);
        };

        utils.pubsub = pubsub;

        return utils;
    }
    // Export US.
    var US = runInContext();
    // Some AMD build optimizers like r.js check for condition patterns like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        // Expose US to the global object when an AMD loader is present to avoid
        // errors in cases where US is loaded by a script tag and not intended
        // as an AMD module. See http://requirejs.org/docs/errors.html#mismatch for
        // more details.
        root.US = US;
        // Define as an anonymous module so, through path mapping, it can be
        // referenced as the "underscore" module.
        define(function() {
            return US;
        });
    }
    // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
    else if (freeExports && freeModule) {
        // Export for Node.js or RingoJS.
        if (moduleExports) {
            (freeModule.exports = US).US = US;
        }
        // Export for Rhino with CommonJS support.
        else {
            freeExports.US = US;
        }
    } else {
        // Export for a browser or Rhino.
        root.US = US;
    }
}.call(this));