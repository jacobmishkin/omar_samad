'use strict';

// Init style shamelessly stolen from jQuery http://jquery.com
var Froogaloop = function () {
    // Define a local copy of Froogaloop
    function Froogaloop(iframe) {
        // The Froogaloop object is actually just the init constructor
        return new Froogaloop.fn.init(iframe);
    }

    var eventCallbacks = {},
        hasWindowEvent = false,
        isReady = false,
        slice = Array.prototype.slice,
        playerDomain = '';

    Froogaloop.fn = Froogaloop.prototype = {
        element: null,

        init: function init(iframe) {
            if (typeof iframe === "string") {
                iframe = document.getElementById(iframe);
            }

            this.element = iframe;

            // Register message event listeners
            playerDomain = getDomainFromUrl(this.element.getAttribute('src'));

            return this;
        },

        /*
         * Calls a function to act upon the player.
         *
         * @param {string} method The name of the Javascript API method to call. Eg: 'play'.
         * @param {Array|Function} valueOrCallback params Array of parameters to pass when calling an API method
         *                                or callback function when the method returns a value.
         */
        api: function api(method, valueOrCallback) {
            if (!this.element || !method) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                params = !isFunction(valueOrCallback) ? valueOrCallback : null,
                callback = isFunction(valueOrCallback) ? valueOrCallback : null;

            // Store the callback for get functions
            if (callback) {
                storeCallback(method, callback, target_id);
            }

            postMessage(method, params, element);
            return self;
        },

        /*
         * Registers an event listener and a callback function that gets called when the event fires.
         *
         * @param eventName (String): Name of the event to listen for.
         * @param callback (Function): Function that should be called when the event fires.
         */
        addEvent: function addEvent(eventName, callback) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null;

            storeCallback(eventName, callback, target_id);

            // The ready event is not registered via postMessage. It fires regardless.
            if (eventName != 'ready') {
                postMessage('addEventListener', eventName, element);
            } else if (eventName == 'ready' && isReady) {
                callback.call(null, target_id);
            }

            return self;
        },

        /*
         * Unregisters an event listener that gets called when the event fires.
         *
         * @param eventName (String): Name of the event to stop listening for.
         */
        removeEvent: function removeEvent(eventName) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                removed = removeCallback(eventName, target_id);

            // The ready event is not registered
            if (eventName != 'ready' && removed) {
                postMessage('removeEventListener', eventName, element);
            }
        }
    };

    /**
     * Handles posting a message to the parent window.
     *
     * @param method (String): name of the method to call inside the player. For api calls
     * this is the name of the api method (api_play or api_pause) while for events this method
     * is api_addEventListener.
     * @param params (Object or Array): List of parameters to submit to the method. Can be either
     * a single param or an array list of parameters.
     * @param target (HTMLElement): Target iframe to post the message to.
     */
    function postMessage(method, params, target) {
        if (!target.contentWindow.postMessage) {
            return false;
        }

        var url = target.getAttribute('src').split('?')[0],
            data = JSON.stringify({
            method: method,
            value: params
        });

        if (url.substr(0, 2) === '//') {
            url = window.location.protocol + url;
        }

        target.contentWindow.postMessage(data, url);
    }

    /**
     * Event that fires whenever the window receives a message from its parent
     * via window.postMessage.
     */
    function onMessageReceived(event) {
        var data, method;

        try {
            data = JSON.parse(event.data);
            method = data.event || data.method;
        } catch (e) {
            //fail silently... like a ninja!
        }

        if (method == 'ready' && !isReady) {
            isReady = true;
        }

        // Handles messages from moogaloop only
        if (event.origin != playerDomain) {
            return false;
        }

        var value = data.value,
            eventData = data.data,
            target_id = target_id === '' ? null : data.player_id,
            callback = getCallback(method, target_id),
            params = [];

        if (!callback) {
            return false;
        }

        if (value !== undefined) {
            params.push(value);
        }

        if (eventData) {
            params.push(eventData);
        }

        if (target_id) {
            params.push(target_id);
        }

        return params.length > 0 ? callback.apply(null, params) : callback.call();
    }

    /**
     * Stores submitted callbacks for each iframe being tracked and each
     * event for that iframe.
     *
     * @param eventName (String): Name of the event. Eg. api_onPlay
     * @param callback (Function): Function that should get executed when the
     * event is fired.
     * @param target_id (String) [Optional]: If handling more than one iframe then
     * it stores the different callbacks for different iframes based on the iframe's
     * id.
     */
    function storeCallback(eventName, callback, target_id) {
        if (target_id) {
            if (!eventCallbacks[target_id]) {
                eventCallbacks[target_id] = {};
            }
            eventCallbacks[target_id][eventName] = callback;
        } else {
            eventCallbacks[eventName] = callback;
        }
    }

    /**
     * Retrieves stored callbacks.
     */
    function getCallback(eventName, target_id) {
        if (target_id) {
            return eventCallbacks[target_id][eventName];
        } else {
            return eventCallbacks[eventName];
        }
    }

    function removeCallback(eventName, target_id) {
        if (target_id && eventCallbacks[target_id]) {
            if (!eventCallbacks[target_id][eventName]) {
                return false;
            }
            eventCallbacks[target_id][eventName] = null;
        } else {
            if (!eventCallbacks[eventName]) {
                return false;
            }
            eventCallbacks[eventName] = null;
        }

        return true;
    }

    /**
     * Returns a domain's root domain.
     * Eg. returns http://vimeo.com when http://vimeo.com/channels is sbumitted
     *
     * @param url (String): Url to test against.
     * @return url (String): Root domain of submitted url
     */
    function getDomainFromUrl(url) {
        if (url.substr(0, 2) === '//') {
            url = window.location.protocol + url;
        }

        var url_pieces = url.split('/'),
            domain_str = '';

        for (var i = 0, length = url_pieces.length; i < length; i++) {
            if (i < 3) {
                domain_str += url_pieces[i];
            } else {
                break;
            }
            if (i < 2) {
                domain_str += '/';
            }
        }

        return domain_str;
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    // Give the init function the Froogaloop prototype for later instantiation
    Froogaloop.fn.init.prototype = Froogaloop.fn;

    // Listens for the message event.
    // W3C
    if (window.addEventListener) {
        window.addEventListener('message', onMessageReceived, false);
    }
    // IE
    else {
            window.attachEvent('onmessage', onMessageReceived);
        }

    // Expose froogaloop to the global object
    return window.Froogaloop = window.$f = Froogaloop;
}();
'use strict';

/**
 * File js-enabled.js
 *
 * If Javascript is enabled, replace the <body> class "no-js".
 */
document.body.className = document.body.className.replace('no-js', 'js');
'use strict';

/**
 * File modal.js
 *
 * Deal with multiple modals and their media.
 */
window.wdsModal = {};

(function (window, $, app) {
	// Constructor.
	app.init = function () {
		app.cache();

		if (app.meetsRequirements()) {
			app.bindEvents();
		}
	};

	// Cache all the things.
	app.cache = function () {
		app.$c = {
			'body': $('body')
		};
	};

	// Do we meet the requirements?
	app.meetsRequirements = function () {
		return $('.modal-trigger').length;
	};

	// Combine all events.
	app.bindEvents = function () {
		// Trigger a modal to open.
		app.$c.body.on('click touchstart', '.modal-trigger', app.openModal);

		// Trigger the close button to close the modal.
		app.$c.body.on('click touchstart', '.close', app.closeModal);

		// Allow the user to close the modal by hitting the esc key.
		app.$c.body.on('keydown', app.escKeyClose);

		// Allow the user to close the modal by clicking outside of the modal.
		app.$c.body.on('click touchstart', 'div.modal-open', app.closeModalByClick);
	};

	// Open the modal.
	app.openModal = function () {
		// Figure out which modal we're opening and store the object.
		var $modal = $($(this).data('target'));

		// Display the modal.
		$modal.addClass('modal-open');

		// Add body class.
		app.$c.body.addClass('modal-open');
	};

	// Close the modal.
	app.closeModal = function () {
		// Figure the opened modal we're closing and store the object.
		var $modal = $($('div.modal-open .close').data('target'));

		// Find the iframe in the $modal object.
		var $iframe = $modal.find('iframe');

		// Get the iframe src URL.
		var url = $iframe.attr('src');

		// Remove the source URL, then add it back, so the video can be played again later.
		$iframe.attr('src', '').attr('src', url);

		// Finally, hide the modal.
		$modal.removeClass('modal-open');

		// Remove the body class.
		app.$c.body.removeClass('modal-open');
	};

	// Close if "esc" key is pressed.
	app.escKeyClose = function (event) {
		if (27 === event.keyCode) {
			app.closeModal();
		}
	};

	// Close if the user clicks outside of the modal
	app.closeModalByClick = function (event) {
		// If the parent container is NOT the modal dialog container, close the modal
		if (!$(event.target).parents('div').hasClass('modal-dialog')) {
			app.closeModal();
		}
	};

	// Engage!
	$(app.init);
})(window, jQuery, window.wdsModal);

// Load the yt iframe api js file from youtube.
// NOTE THE IFRAME URL MUST HAVE 'enablejsapi=1' appended to it.
// example: src="http://www.youtube.com/embed/M7lc1UVf-VE?enablejsapi=1"
var tag = document.createElement('script');
tag.id = 'iframe-yt';
tag.src = 'https://www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// This var and function have to be available globally due to yt js iframe api.
var player;
function onYouTubeIframeAPIReady() {
	var modal = jQuery('div.modal-open');
	var iframeid = modal.find('iframe').attr('id');

	player = new YT.Player(iframeid, {
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		}
	});
}

function onPlayerReady(event) {}

function onPlayerStateChange() {
	jQuery(window).focus();
}
'use strict';

/**
 * File skip-link-focus-fix.js.
 *
 * Helps with accessibility for keyboard only users.
 *
 * Learn more: https://git.io/vWdr2
 */
(function () {
	var isWebkit = navigator.userAgent.toLowerCase().indexOf('webkit') > -1,
	    isOpera = navigator.userAgent.toLowerCase().indexOf('opera') > -1,
	    isIe = navigator.userAgent.toLowerCase().indexOf('msie') > -1;

	if ((isWebkit || isOpera || isIe) && document.getElementById && window.addEventListener) {
		window.addEventListener('hashchange', function () {
			var id = location.hash.substring(1),
			    element;

			if (!/^[A-z0-9_-]+$/.test(id)) {
				return;
			}

			element = document.getElementById(id);

			if (element) {
				if (!/^(?:a|select|input|button|textarea)$/i.test(element.tagName)) {
					element.tabIndex = -1;
				}

				element.focus();
			}
		}, false);
	}
})();
'use strict';

/**
 * File window-ready.js
 *
 * Add a "ready" class to <body> when window is ready.
 */
window.wdsWindowReady = {};
(function (window, $, app) {
	// Constructor.
	app.init = function () {
		app.cache();
		app.bindEvents();
	};

	// Cache document elements.
	app.cache = function () {
		app.$c = {
			'window': $(window),
			'body': $(document.body)
		};
	};

	// Combine all events.
	app.bindEvents = function () {
		app.$c.window.load(app.addBodyClass);
	};

	// Add a class to <body>.
	app.addBodyClass = function () {
		app.$c.body.addClass('ready');
	};

	// Engage!
	$(app.init);
})(window, jQuery, window.wdsWindowReady);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZyb29nYWxvb3AubWluLmpzIiwianMtZW5hYmxlZC5qcyIsIm1vZGFsLmpzIiwic2tpcC1saW5rLWZvY3VzLWZpeC5qcyIsIndpbmRvdy1yZWFkeS5qcyJdLCJuYW1lcyI6WyJGcm9vZ2Fsb29wIiwiaWZyYW1lIiwiZm4iLCJpbml0IiwiZXZlbnRDYWxsYmFja3MiLCJoYXNXaW5kb3dFdmVudCIsImlzUmVhZHkiLCJzbGljZSIsIkFycmF5IiwicHJvdG90eXBlIiwicGxheWVyRG9tYWluIiwiZWxlbWVudCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJnZXREb21haW5Gcm9tVXJsIiwiZ2V0QXR0cmlidXRlIiwiYXBpIiwibWV0aG9kIiwidmFsdWVPckNhbGxiYWNrIiwic2VsZiIsInRhcmdldF9pZCIsImlkIiwicGFyYW1zIiwiaXNGdW5jdGlvbiIsImNhbGxiYWNrIiwic3RvcmVDYWxsYmFjayIsInBvc3RNZXNzYWdlIiwiYWRkRXZlbnQiLCJldmVudE5hbWUiLCJjYWxsIiwicmVtb3ZlRXZlbnQiLCJyZW1vdmVkIiwicmVtb3ZlQ2FsbGJhY2siLCJ0YXJnZXQiLCJjb250ZW50V2luZG93IiwidXJsIiwic3BsaXQiLCJkYXRhIiwiSlNPTiIsInN0cmluZ2lmeSIsInZhbHVlIiwic3Vic3RyIiwid2luZG93IiwibG9jYXRpb24iLCJwcm90b2NvbCIsIm9uTWVzc2FnZVJlY2VpdmVkIiwiZXZlbnQiLCJwYXJzZSIsImUiLCJvcmlnaW4iLCJldmVudERhdGEiLCJwbGF5ZXJfaWQiLCJnZXRDYWxsYmFjayIsInVuZGVmaW5lZCIsInB1c2giLCJsZW5ndGgiLCJhcHBseSIsInVybF9waWVjZXMiLCJkb21haW5fc3RyIiwiaSIsIm9iaiIsImNvbnN0cnVjdG9yIiwiaXNBcnJheSIsInRvU3RyaW5nIiwiYWRkRXZlbnRMaXN0ZW5lciIsImF0dGFjaEV2ZW50IiwiJGYiLCJib2R5IiwiY2xhc3NOYW1lIiwicmVwbGFjZSIsIndkc01vZGFsIiwiJCIsImFwcCIsImNhY2hlIiwibWVldHNSZXF1aXJlbWVudHMiLCJiaW5kRXZlbnRzIiwiJGMiLCJvbiIsIm9wZW5Nb2RhbCIsImNsb3NlTW9kYWwiLCJlc2NLZXlDbG9zZSIsImNsb3NlTW9kYWxCeUNsaWNrIiwiJG1vZGFsIiwiYWRkQ2xhc3MiLCIkaWZyYW1lIiwiZmluZCIsImF0dHIiLCJyZW1vdmVDbGFzcyIsImtleUNvZGUiLCJwYXJlbnRzIiwiaGFzQ2xhc3MiLCJqUXVlcnkiLCJ0YWciLCJjcmVhdGVFbGVtZW50Iiwic3JjIiwiZmlyc3RTY3JpcHRUYWciLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInBhcmVudE5vZGUiLCJpbnNlcnRCZWZvcmUiLCJwbGF5ZXIiLCJvbllvdVR1YmVJZnJhbWVBUElSZWFkeSIsIm1vZGFsIiwiaWZyYW1laWQiLCJZVCIsIlBsYXllciIsImV2ZW50cyIsIm9uUGxheWVyUmVhZHkiLCJvblBsYXllclN0YXRlQ2hhbmdlIiwiZm9jdXMiLCJpc1dlYmtpdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsInRvTG93ZXJDYXNlIiwiaW5kZXhPZiIsImlzT3BlcmEiLCJpc0llIiwiaGFzaCIsInN1YnN0cmluZyIsInRlc3QiLCJ0YWdOYW1lIiwidGFiSW5kZXgiLCJ3ZHNXaW5kb3dSZWFkeSIsImxvYWQiLCJhZGRCb2R5Q2xhc3MiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQSxJQUFJQSxhQUFjLFlBQVU7QUFDeEI7QUFDQSxhQUFTQSxVQUFULENBQW9CQyxNQUFwQixFQUE0QjtBQUN4QjtBQUNBLGVBQU8sSUFBSUQsV0FBV0UsRUFBWCxDQUFjQyxJQUFsQixDQUF1QkYsTUFBdkIsQ0FBUDtBQUNIOztBQUVELFFBQUlHLGlCQUFpQixFQUFyQjtBQUFBLFFBQ0lDLGlCQUFpQixLQURyQjtBQUFBLFFBRUlDLFVBQVUsS0FGZDtBQUFBLFFBR0lDLFFBQVFDLE1BQU1DLFNBQU4sQ0FBZ0JGLEtBSDVCO0FBQUEsUUFJSUcsZUFBZSxFQUpuQjs7QUFNQVYsZUFBV0UsRUFBWCxHQUFnQkYs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RCxDQUFOLEVBQTRFO0FBQzNFNUcsYUFBUTZHLFFBQVIsR0FBbUIsQ0FBQyxDQUFwQjtBQUNBOztBQUVEN0csWUFBUWlHLEtBQVI7QUFDQTtBQUNELEdBakJELEVBaUJHLEtBakJIO0FBa0JBO0FBQ0QsQ0F6QkQ7OztBQ1BBOzs7OztBQUtBbEUsT0FBTytFLGNBQVAsR0FBd0IsRUFBeEI7QUFDQSxDQUFFLFVBQVcvRSxNQUFYLEVBQW1CNkIsQ0FBbkIsRUFBc0JDLEdBQXRCLEVBQTRCO0FBQzdCO0FBQ0FBLEtBQUlyRSxJQUFKLEdBQVcsWUFBWTtBQUN0QnFFLE1BQUlDLEtBQUo7QUFDQUQsTUFBSUcsVUFBSjtBQUNBLEVBSEQ7O0FBS0E7QUFDQUgsS0FBSUMsS0FBSixHQUFZLFlBQVk7QUFDdkJELE1BQUlJLEVBQUosR0FBUztBQUNSLGFBQVVMLEVBQUc3QixNQUFILENBREY7QUFFUixXQUFRNkIsRUFBRzNELFNBQVN1RCxJQUFaO0FBRkEsR0FBVDtBQUlBLEVBTEQ7O0FBT0E7QUFDQUssS0FBSUcsVUFBSixHQUFpQixZQUFZO0FBQzVCSCxNQUFJSSxFQUFKLENBQU9sQyxNQUFQLENBQWNnRixJQUFkLENBQW9CbEQsSUFBSW1ELFlBQXhCO0FBQ0EsRUFGRDs7QUFJQTtBQUNBbkQsS0FBSW1ELFlBQUosR0FBbUIsWUFBWTtBQUM5Qm5ELE1BQUlJLEVBQUosQ0FBT1QsSUFBUCxDQUFZZ0IsUUFBWixDQUFzQixPQUF0QjtBQUNBLEVBRkQ7O0FBSUE7QUFDQVosR0FBR0MsSUFBSXJFLElBQVA7QUFDQSxDQTNCRCxFQTJCS3VDLE1BM0JMLEVBMkJhaUQsTUEzQmIsRUEyQnFCakQsT0FBTytFLGNBM0I1QiIsImZpbGUiOiJwcm9qZWN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSW5pdCBzdHlsZSBzaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBqUXVlcnkgaHR0cDovL2pxdWVyeS5jb21cbnZhciBGcm9vZ2Fsb29wID0gKGZ1bmN0aW9uKCl7XG4gICAgLy8gRGVmaW5lIGEgbG9jYWwgY29weSBvZiBGcm9vZ2Fsb29wXG4gICAgZnVuY3Rpb24gRnJvb2dhbG9vcChpZnJhbWUpIHtcbiAgICAgICAgLy8gVGhlIEZyb29nYWxvb3Agb2JqZWN0IGlzIGFjdHVhbGx5IGp1c3QgdGhlIGluaXQgY29uc3RydWN0b3JcbiAgICAgICAgcmV0dXJuIG5ldyBGcm9vZ2Fsb29wLmZuLmluaXQoaWZyYW1lKTtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnRDYWxsYmFja3MgPSB7fSxcbiAgICAgICAgaGFzV2luZG93RXZlbnQgPSBmYWxzZSxcbiAgICAgICAgaXNSZWFkeSA9IGZhbHNlLFxuICAgICAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZSxcbiAgICAgICAgcGxheWVyRG9tYWluID0gJyc7XG5cbiAgICBGcm9vZ2Fsb29wLmZuID0gRnJvb2dhbG9vcC5wcm90b3R5cGUgPSB7XG4gICAgICAgIGVsZW1lbnQ6IG51bGwsXG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24oaWZyYW1lKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlmcmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIGlmcmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlmcmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IGlmcmFtZTtcblxuICAgICAgICAgICAgLy8gUmVnaXN0ZXIgbWVzc2FnZSBldmVudCBsaXN0ZW5lcnNcbiAgICAgICAgICAgIHBsYXllckRvbWFpbiA9IGdldERvbWFpbkZyb21VcmwodGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnc3JjJykpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKlxuICAgICAgICAgKiBDYWxscyBhIGZ1bmN0aW9uIHRvIGFjdCB1cG9uIHRoZSBwbGF5ZXIuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgVGhlIG5hbWUgb2YgdGhlIEphdmFzY3JpcHQgQVBJIG1ldGhvZCB0byBjYWxsLiBFZzogJ3BsYXknLlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufSB2YWx1ZU9yQ2FsbGJhY2sgcGFyYW1zIEFycmF5IG9mIHBhcmFtZXRlcnMgdG8gcGFzcyB3aGVuIGNhbGxpbmcgYW4gQVBJIG1ldGhvZFxuICAgICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgbWV0aG9kIHJldHVybnMgYSB2YWx1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGFwaTogZnVuY3Rpb24obWV0aG9kLCB2YWx1ZU9yQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5lbGVtZW50IHx8ICFtZXRob2QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VsZi5lbGVtZW50LFxuICAgICAgICAgICAgICAgIHRhcmdldF9pZCA9IGVsZW1lbnQuaWQgIT09ICcnID8gZWxlbWVudC5pZCA6IG51bGwsXG4gICAgICAgICAgICAgICAgcGFyYW1zID0gIWlzRnVuY3Rpb24odmFsdWVPckNhbGxiYWNrKSA/IHZhbHVlT3JDYWxsYmFjayA6IG51bGwsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBpc0Z1bmN0aW9uKHZhbHVlT3JDYWxsYmFjaykgPyB2YWx1ZU9yQ2FsbGJhY2sgOiBudWxsO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSB0aGUgY2FsbGJhY2sgZm9yIGdldCBmdW5jdGlvbnNcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHN0b3JlQ2FsbGJhY2sobWV0aG9kLCBjYWxsYmFjaywgdGFyZ2V0X2lkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcG9zdE1lc3NhZ2UobWV0aG9kLCBwYXJhbXMsIGVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLypcbiAgICAgICAgICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyIGFuZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgd2hlbiB0aGUgZXZlbnQgZmlyZXMuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBldmVudE5hbWUgKFN0cmluZyk6IE5hbWUgb2YgdGhlIGV2ZW50IHRvIGxpc3RlbiBmb3IuXG4gICAgICAgICAqIEBwYXJhbSBjYWxsYmFjayAoRnVuY3Rpb24pOiBGdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgZXZlbnQgZmlyZXMuXG4gICAgICAgICAqL1xuICAgICAgICBhZGRFdmVudDogZnVuY3Rpb24oZXZlbnROYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VsZi5lbGVtZW50LFxuICAgICAgICAgICAgICAgIHRhcmdldF9pZCA9IGVsZW1lbnQuaWQgIT09ICcnID8gZWxlbWVudC5pZCA6IG51bGw7XG5cblxuICAgICAgICAgICAgc3RvcmVDYWxsYmFjayhldmVudE5hbWUsIGNhbGxiYWNrLCB0YXJnZXRfaWQpO1xuXG4gICAgICAgICAgICAvLyBUaGUgcmVhZHkgZXZlbnQgaXMgbm90IHJlZ2lzdGVyZWQgdmlhIHBvc3RNZXNzYWdlLiBJdCBmaXJlcyByZWdhcmRsZXNzLlxuICAgICAgICAgICAgaWYgKGV2ZW50TmFtZSAhPSAncmVhZHknKSB7XG4gICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoJ2FkZEV2ZW50TGlzdGVuZXInLCBldmVudE5hbWUsIGVsZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZXZlbnROYW1lID09ICdyZWFkeScgJiYgaXNSZWFkeSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGFyZ2V0X2lkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLypcbiAgICAgICAgICogVW5yZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIgdGhhdCBnZXRzIGNhbGxlZCB3aGVuIHRoZSBldmVudCBmaXJlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIGV2ZW50TmFtZSAoU3RyaW5nKTogTmFtZSBvZiB0aGUgZXZlbnQgdG8gc3RvcCBsaXN0ZW5pbmcgZm9yLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlRXZlbnQ6IGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VsZi5lbGVtZW50LFxuICAgICAgICAgICAgICAgIHRhcmdldF9pZCA9IGVsZW1lbnQuaWQgIT09ICcnID8gZWxlbWVudC5pZCA6IG51bGwsXG4gICAgICAgICAgICAgICAgcmVtb3ZlZCA9IHJlbW92ZUNhbGxiYWNrKGV2ZW50TmFtZSwgdGFyZ2V0X2lkKTtcblxuICAgICAgICAgICAgLy8gVGhlIHJlYWR5IGV2ZW50IGlzIG5vdCByZWdpc3RlcmVkXG4gICAgICAgICAgICBpZiAoZXZlbnROYW1lICE9ICdyZWFkeScgJiYgcmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlKCdyZW1vdmVFdmVudExpc3RlbmVyJywgZXZlbnROYW1lLCBlbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHBvc3RpbmcgYSBtZXNzYWdlIHRvIHRoZSBwYXJlbnQgd2luZG93LlxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZCAoU3RyaW5nKTogbmFtZSBvZiB0aGUgbWV0aG9kIHRvIGNhbGwgaW5zaWRlIHRoZSBwbGF5ZXIuIEZvciBhcGkgY2FsbHNcbiAgICAgKiB0aGlzIGlzIHRoZSBuYW1lIG9mIHRoZSBhcGkgbWV0aG9kIChhcGlfcGxheSBvciBhcGlfcGF1c2UpIHdoaWxlIGZvciBldmVudHMgdGhpcyBtZXRob2RcbiAgICAgKiBpcyBhcGlfYWRkRXZlbnRMaXN0ZW5lci5cbiAgICAgKiBAcGFyYW0gcGFyYW1zIChPYmplY3Qgb3IgQXJyYXkpOiBMaXN0IG9mIHBhcmFtZXRlcnMgdG8gc3VibWl0IHRvIHRoZSBtZXRob2QuIENhbiBiZSBlaXRoZXJcbiAgICAgKiBhIHNpbmdsZSBwYXJhbSBvciBhbiBhcnJheSBsaXN0IG9mIHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHRhcmdldCAoSFRNTEVsZW1lbnQpOiBUYXJnZXQgaWZyYW1lIHRvIHBvc3QgdGhlIG1lc3NhZ2UgdG8uXG4gICAgICovXG4gICAgZnVuY3Rpb24gcG9zdE1lc3NhZ2UobWV0aG9kLCBwYXJhbXMsIHRhcmdldCkge1xuICAgICAgICBpZiAoIXRhcmdldC5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdXJsID0gdGFyZ2V0LmdldEF0dHJpYnV0ZSgnc3JjJykuc3BsaXQoJz8nKVswXSxcbiAgICAgICAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcmFtc1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHVybC5zdWJzdHIoMCwgMikgPT09ICcvLycpIHtcbiAgICAgICAgICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIHVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldC5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKGRhdGEsIHVybCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXZlbnQgdGhhdCBmaXJlcyB3aGVuZXZlciB0aGUgd2luZG93IHJlY2VpdmVzIGEgbWVzc2FnZSBmcm9tIGl0cyBwYXJlbnRcbiAgICAgKiB2aWEgd2luZG93LnBvc3RNZXNzYWdlLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG9uTWVzc2FnZVJlY2VpdmVkKGV2ZW50KSB7XG4gICAgICAgIHZhciBkYXRhLCBtZXRob2Q7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgICAgbWV0aG9kID0gZGF0YS5ldmVudCB8fCBkYXRhLm1ldGhvZDtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKSAge1xuICAgICAgICAgICAgLy9mYWlsIHNpbGVudGx5Li4uIGxpa2UgYSBuaW5qYSFcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXRob2QgPT0gJ3JlYWR5JyAmJiAhaXNSZWFkeSkge1xuICAgICAgICAgICAgaXNSZWFkeSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGVzIG1lc3NhZ2VzIGZyb20gbW9vZ2Fsb29wIG9ubHlcbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPSBwbGF5ZXJEb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2YWx1ZSA9IGRhdGEudmFsdWUsXG4gICAgICAgICAgICBldmVudERhdGEgPSBkYXRhLmRhdGEsXG4gICAgICAgICAgICB0YXJnZXRfaWQgPSB0YXJnZXRfaWQgPT09ICcnID8gbnVsbCA6IGRhdGEucGxheWVyX2lkLFxuXG4gICAgICAgICAgICBjYWxsYmFjayA9IGdldENhbGxiYWNrKG1ldGhvZCwgdGFyZ2V0X2lkKSxcbiAgICAgICAgICAgIHBhcmFtcyA9IFtdO1xuXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZlbnREYXRhKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChldmVudERhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldF9pZCkge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2godGFyZ2V0X2lkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJhbXMubGVuZ3RoID4gMCA/IGNhbGxiYWNrLmFwcGx5KG51bGwsIHBhcmFtcykgOiBjYWxsYmFjay5jYWxsKCk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZXMgc3VibWl0dGVkIGNhbGxiYWNrcyBmb3IgZWFjaCBpZnJhbWUgYmVpbmcgdHJhY2tlZCBhbmQgZWFjaFxuICAgICAqIGV2ZW50IGZvciB0aGF0IGlmcmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBldmVudE5hbWUgKFN0cmluZyk6IE5hbWUgb2YgdGhlIGV2ZW50LiBFZy4gYXBpX29uUGxheVxuICAgICAqIEBwYXJhbSBjYWxsYmFjayAoRnVuY3Rpb24pOiBGdW5jdGlvbiB0aGF0IHNob3VsZCBnZXQgZXhlY3V0ZWQgd2hlbiB0aGVcbiAgICAgKiBldmVudCBpcyBmaXJlZC5cbiAgICAgKiBAcGFyYW0gdGFyZ2V0X2lkIChTdHJpbmcpIFtPcHRpb25hbF06IElmIGhhbmRsaW5nIG1vcmUgdGhhbiBvbmUgaWZyYW1lIHRoZW5cbiAgICAgKiBpdCBzdG9yZXMgdGhlIGRpZmZlcmVudCBjYWxsYmFja3MgZm9yIGRpZmZlcmVudCBpZnJhbWVzIGJhc2VkIG9uIHRoZSBpZnJhbWUnc1xuICAgICAqIGlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHN0b3JlQ2FsbGJhY2soZXZlbnROYW1lLCBjYWxsYmFjaywgdGFyZ2V0X2lkKSB7XG4gICAgICAgIGlmICh0YXJnZXRfaWQpIHtcbiAgICAgICAgICAgIGlmICghZXZlbnRDYWxsYmFja3NbdGFyZ2V0X2lkXSkge1xuICAgICAgICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW3RhcmdldF9pZF0gPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW3RhcmdldF9pZF1bZXZlbnROYW1lXSA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZXZlbnRDYWxsYmFja3NbZXZlbnROYW1lXSA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHN0b3JlZCBjYWxsYmFja3MuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0Q2FsbGJhY2soZXZlbnROYW1lLCB0YXJnZXRfaWQpIHtcbiAgICAgICAgaWYgKHRhcmdldF9pZCkge1xuICAgICAgICAgICAgcmV0dXJuIGV2ZW50Q2FsbGJhY2tzW3RhcmdldF9pZF1bZXZlbnROYW1lXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBldmVudENhbGxiYWNrc1tldmVudE5hbWVdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2FsbGJhY2soZXZlbnROYW1lLCB0YXJnZXRfaWQpIHtcbiAgICAgICAgaWYgKHRhcmdldF9pZCAmJiBldmVudENhbGxiYWNrc1t0YXJnZXRfaWRdKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZW50Q2FsbGJhY2tzW3RhcmdldF9pZF1bZXZlbnROYW1lXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW3RhcmdldF9pZF1bZXZlbnROYW1lXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoIWV2ZW50Q2FsbGJhY2tzW2V2ZW50TmFtZV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmVudENhbGxiYWNrc1tldmVudE5hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBkb21haW4ncyByb290IGRvbWFpbi5cbiAgICAgKiBFZy4gcmV0dXJucyBodHRwOi8vdmltZW8uY29tIHdoZW4gaHR0cDovL3ZpbWVvLmNvbS9jaGFubmVscyBpcyBzYnVtaXR0ZWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB1cmwgKFN0cmluZyk6IFVybCB0byB0ZXN0IGFnYWluc3QuXG4gICAgICogQHJldHVybiB1cmwgKFN0cmluZyk6IFJvb3QgZG9tYWluIG9mIHN1Ym1pdHRlZCB1cmxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXREb21haW5Gcm9tVXJsKHVybCkge1xuICAgICAgICBpZiAodXJsLnN1YnN0cigwLCAyKSA9PT0gJy8vJykge1xuICAgICAgICAgICAgdXJsID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgdXJsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHVybF9waWVjZXMgPSB1cmwuc3BsaXQoJy8nKSxcbiAgICAgICAgICAgIGRvbWFpbl9zdHIgPSAnJztcblxuICAgICAgICBmb3IodmFyIGkgPSAwLCBsZW5ndGggPSB1cmxfcGllY2VzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihpPDMpIHtkb21haW5fc3RyICs9IHVybF9waWVjZXNbaV07fVxuICAgICAgICAgICAgZWxzZSB7YnJlYWs7fVxuICAgICAgICAgICAgaWYoaTwyKSB7ZG9tYWluX3N0ciArPSAnLyc7fVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRvbWFpbl9zdHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNGdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuICEhKG9iaiAmJiBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNhbGwgJiYgb2JqLmFwcGx5KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH1cblxuICAgIC8vIEdpdmUgdGhlIGluaXQgZnVuY3Rpb24gdGhlIEZyb29nYWxvb3AgcHJvdG90eXBlIGZvciBsYXRlciBpbnN0YW50aWF0aW9uXG4gICAgRnJvb2dhbG9vcC5mbi5pbml0LnByb3RvdHlwZSA9IEZyb29nYWxvb3AuZm47XG5cbiAgICAvLyBMaXN0ZW5zIGZvciB0aGUgbWVzc2FnZSBldmVudC5cbiAgICAvLyBXM0NcbiAgICBpZiAod2luZG93LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbk1lc3NhZ2VSZWNlaXZlZCwgZmFsc2UpO1xuICAgIH1cbiAgICAvLyBJRVxuICAgIGVsc2Uge1xuICAgICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoJ29ubWVzc2FnZScsIG9uTWVzc2FnZVJlY2VpdmVkKTtcbiAgICB9XG5cbiAgICAvLyBFeHBvc2UgZnJvb2dhbG9vcCB0byB0aGUgZ2xvYmFsIG9iamVjdFxuICAgIHJldHVybiAod2luZG93LkZyb29nYWxvb3AgPSB3aW5kb3cuJGYgPSBGcm9vZ2Fsb29wKTtcblxufSkoKTsiLCIvKipcbiAqIEZpbGUganMtZW5hYmxlZC5qc1xuICpcbiAqIElmIEphdmFzY3JpcHQgaXMgZW5hYmxlZCwgcmVwbGFjZSB0aGUgPGJvZHk+IGNsYXNzIFwibm8tanNcIi5cbiAqL1xuZG9jdW1lbnQuYm9keS5jbGFzc05hbWUgPSBkb2N1bWVudC5ib2R5LmNsYXNzTmFtZS5yZXBsYWNlKCAnbm8tanMnLCAnanMnICk7XG4iLCIvKipcbiAqIEZpbGUgbW9kYWwuanNcbiAqXG4gKiBEZWFsIHdpdGggbXVsdGlwbGUgbW9kYWxzIGFuZCB0aGVpciBtZWRpYS5cbiAqL1xud2luZG93Lndkc01vZGFsID0ge307XG5cbiggZnVuY3Rpb24gKCB3aW5kb3csICQsIGFwcCApIHtcblx0Ly8gQ29uc3RydWN0b3IuXG5cdGFwcC5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHRcdGFwcC5jYWNoZSgpO1xuXG5cdFx0aWYgKCBhcHAubWVldHNSZXF1aXJlbWVudHMoKSApIHtcblx0XHRcdGFwcC5iaW5kRXZlbnRzKCk7XG5cdFx0fVxuXHR9O1xuXG5cdC8vIENhY2hlIGFsbCB0aGUgdGhpbmdzLlxuXHRhcHAuY2FjaGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0YXBwLiRjID0ge1xuXHRcdFx0J2JvZHknOiAkKCAnYm9keScgKVxuXHRcdH07XG5cdH07XG5cblx0Ly8gRG8gd2UgbWVldCB0aGUgcmVxdWlyZW1lbnRzP1xuXHRhcHAubWVldHNSZXF1aXJlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuICQoICcubW9kYWwtdHJpZ2dlcicgKS5sZW5ndGg7XG5cdH07XG5cblx0Ly8gQ29tYmluZSBhbGwgZXZlbnRzLlxuXHRhcHAuYmluZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBUcmlnZ2VyIGEgbW9kYWwgdG8gb3Blbi5cblx0XHRhcHAuJGMuYm9keS5vbiggJ2NsaWNrIHRvdWNoc3RhcnQnLCAnLm1vZGFsLXRyaWdnZXInLCBhcHAub3Blbk1vZGFsICk7XG5cblx0XHQvLyBUcmlnZ2VyIHRoZSBjbG9zZSBidXR0b24gdG8gY2xvc2UgdGhlIG1vZGFsLlxuXHRcdGFwcC4kYy5ib2R5Lm9uKCAnY2xpY2sgdG91Y2hzdGFydCcsICcuY2xvc2UnLCBhcHAuY2xvc2VNb2RhbCApO1xuXG5cdFx0Ly8gQWxsb3cgdGhlIHVzZXIgdG8gY2xvc2UgdGhlIG1vZGFsIGJ5IGhpdHRpbmcgdGhlIGVzYyBrZXkuXG5cdFx0YXBwLiRjLmJvZHkub24oICdrZXlkb3duJywgYXBwLmVzY0tleUNsb3NlICk7XG5cblx0XHQvLyBBbGxvdyB0aGUgdXNlciB0byBjbG9zZSB0aGUgbW9kYWwgYnkgY2xpY2tpbmcgb3V0c2lkZSBvZiB0aGUgbW9kYWwuXG5cdFx0YXBwLiRjLmJvZHkub24oICdjbGljayB0b3VjaHN0YXJ0JywgJ2Rpdi5tb2RhbC1vcGVuJywgYXBwLmNsb3NlTW9kYWxCeUNsaWNrICk7XG5cdH07XG5cblx0Ly8gT3BlbiB0aGUgbW9kYWwuXG5cdGFwcC5vcGVuTW9kYWwgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gRmlndXJlIG91dCB3aGljaCBtb2RhbCB3ZSdyZSBvcGVuaW5nIGFuZCBzdG9yZSB0aGUgb2JqZWN0LlxuXHRcdHZhciAkbW9kYWwgPSAkKCAkKCB0aGlzICkuZGF0YSggJ3RhcmdldCcgKSApO1xuXG5cdFx0Ly8gRGlzcGxheSB0aGUgbW9kYWwuXG5cdFx0JG1vZGFsLmFkZENsYXNzKCAnbW9kYWwtb3BlbicgKTtcblxuXHRcdC8vIEFkZCBib2R5IGNsYXNzLlxuXHRcdGFwcC4kYy5ib2R5LmFkZENsYXNzKCAnbW9kYWwtb3BlbicgKTtcblx0fTtcblxuXHQvLyBDbG9zZSB0aGUgbW9kYWwuXG5cdGFwcC5jbG9zZU1vZGFsID0gZnVuY3Rpb24gKCkge1xuXHRcdC8vIEZpZ3VyZSB0aGUgb3BlbmVkIG1vZGFsIHdlJ3JlIGNsb3NpbmcgYW5kIHN0b3JlIHRoZSBvYmplY3QuXG5cdFx0dmFyICRtb2RhbCA9ICQoICQoICdkaXYubW9kYWwtb3BlbiAuY2xvc2UnICkuZGF0YSggJ3RhcmdldCcgKSApO1xuXG5cdFx0Ly8gRmluZCB0aGUgaWZyYW1lIGluIHRoZSAkbW9kYWwgb2JqZWN0LlxuXHRcdHZhciAkaWZyYW1lID0gJG1vZGFsLmZpbmQoICdpZnJhbWUnICk7XG5cblx0XHQvLyBHZXQgdGhlIGlmcmFtZSBzcmMgVVJMLlxuXHRcdHZhciB1cmwgPSAkaWZyYW1lLmF0dHIoICdzcmMnICk7XG5cblx0XHQvLyBSZW1vdmUgdGhlIHNvdXJjZSBVUkwsIHRoZW4gYWRkIGl0IGJhY2ssIHNvIHRoZSB2aWRlbyBjYW4gYmUgcGxheWVkIGFnYWluIGxhdGVyLlxuXHRcdCRpZnJhbWUuYXR0ciggJ3NyYycsICcnICkuYXR0ciggJ3NyYycsIHVybCApO1xuXG5cdFx0Ly8gRmluYWxseSwgaGlkZSB0aGUgbW9kYWwuXG5cdFx0JG1vZGFsLnJlbW92ZUNsYXNzKCAnbW9kYWwtb3BlbicgKTtcblxuXHRcdC8vIFJlbW92ZSB0aGUgYm9keSBjbGFzcy5cblx0XHRhcHAuJGMuYm9keS5yZW1vdmVDbGFzcyggJ21vZGFsLW9wZW4nICk7XG5cdH07XG5cblx0Ly8gQ2xvc2UgaWYgXCJlc2NcIiBrZXkgaXMgcHJlc3NlZC5cblx0YXBwLmVzY0tleUNsb3NlID0gZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRpZiAoIDI3ID09PSBldmVudC5rZXlDb2RlICkge1xuXHRcdFx0YXBwLmNsb3NlTW9kYWwoKTtcblx0XHR9XG5cdH07XG5cblx0Ly8gQ2xvc2UgaWYgdGhlIHVzZXIgY2xpY2tzIG91dHNpZGUgb2YgdGhlIG1vZGFsXG5cdGFwcC5jbG9zZU1vZGFsQnlDbGljayA9IGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0Ly8gSWYgdGhlIHBhcmVudCBjb250YWluZXIgaXMgTk9UIHRoZSBtb2RhbCBkaWFsb2cgY29udGFpbmVyLCBjbG9zZSB0aGUgbW9kYWxcblx0XHRpZiAoICEkKCBldmVudC50YXJnZXQgKS5wYXJlbnRzKCAnZGl2JyApLmhhc0NsYXNzKCAnbW9kYWwtZGlhbG9nJyApICkge1xuXHRcdFx0YXBwLmNsb3NlTW9kYWwoKTtcblx0XHR9XG5cdH07XG5cblx0Ly8gRW5nYWdlIVxuXHQkKCBhcHAuaW5pdCApO1xufSApKCB3aW5kb3csIGpRdWVyeSwgd2luZG93Lndkc01vZGFsICk7XG5cbi8vIExvYWQgdGhlIHl0IGlmcmFtZSBhcGkganMgZmlsZSBmcm9tIHlvdXR1YmUuXG4vLyBOT1RFIFRIRSBJRlJBTUUgVVJMIE1VU1QgSEFWRSAnZW5hYmxlanNhcGk9MScgYXBwZW5kZWQgdG8gaXQuXG4vLyBleGFtcGxlOiBzcmM9XCJodHRwOi8vd3d3LnlvdXR1YmUuY29tL2VtYmVkL003bGMxVVZmLVZFP2VuYWJsZWpzYXBpPTFcIlxudmFyIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xudGFnLmlkID0gJ2lmcmFtZS15dCc7XG50YWcuc3JjID0gJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGknO1xudmFyIGZpcnN0U2NyaXB0VGFnID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdO1xuZmlyc3RTY3JpcHRUYWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGFnLCBmaXJzdFNjcmlwdFRhZyk7XG5cbi8vIFRoaXMgdmFyIGFuZCBmdW5jdGlvbiBoYXZlIHRvIGJlIGF2YWlsYWJsZSBnbG9iYWxseSBkdWUgdG8geXQganMgaWZyYW1lIGFwaS5cbnZhciBwbGF5ZXI7XG5mdW5jdGlvbiBvbllvdVR1YmVJZnJhbWVBUElSZWFkeSgpIHtcblx0dmFyIG1vZGFsID0galF1ZXJ5KCdkaXYubW9kYWwtb3BlbicpO1xuXHR2YXIgaWZyYW1laWQgPSBtb2RhbC5maW5kKCdpZnJhbWUnKS5hdHRyKCdpZCcpO1xuXG5cdHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoIGlmcmFtZWlkICwge1xuXHRcdGV2ZW50czoge1xuXHRcdFx0J29uUmVhZHknOiBvblBsYXllclJlYWR5LFxuXHRcdFx0J29uU3RhdGVDaGFuZ2UnOiBvblBsYXllclN0YXRlQ2hhbmdlXG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gb25QbGF5ZXJSZWFkeShldmVudCkge1xuXG59XG5cbmZ1bmN0aW9uIG9uUGxheWVyU3RhdGVDaGFuZ2UoKSB7XG5cdGpRdWVyeSggd2luZG93ICkuZm9jdXMoKTtcbn1cbiIsIi8qKlxuICogRmlsZSBza2lwLWxpbmstZm9jdXMtZml4LmpzLlxuICpcbiAqIEhlbHBzIHdpdGggYWNjZXNzaWJpbGl0eSBmb3Iga2V5Ym9hcmQgb25seSB1c2Vycy5cbiAqXG4gKiBMZWFybiBtb3JlOiBodHRwczovL2dpdC5pby92V2RyMlxuICovXG4oIGZ1bmN0aW9uICgpIHtcblx0dmFyIGlzV2Via2l0ID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoICd3ZWJraXQnICkgPiAtMSxcblx0XHRpc09wZXJhID0gbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoICdvcGVyYScgKSA+IC0xLFxuXHRcdGlzSWUgPSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5kZXhPZiggJ21zaWUnICkgPiAtMTtcblxuXHRpZiAoICggaXNXZWJraXQgfHwgaXNPcGVyYSB8fCBpc0llICkgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoICdoYXNoY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIGlkID0gbG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoIDEgKSxcblx0XHRcdFx0ZWxlbWVudDtcblxuXHRcdFx0aWYgKCAhKCAvXltBLXowLTlfLV0rJC8gKS50ZXN0KCBpZCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggaWQgKTtcblxuXHRcdFx0aWYgKCBlbGVtZW50ICkge1xuXHRcdFx0XHRpZiAoICEoIC9eKD86YXxzZWxlY3R8aW5wdXR8YnV0dG9ufHRleHRhcmVhKSQvaSApLnRlc3QoIGVsZW1lbnQudGFnTmFtZSApICkge1xuXHRcdFx0XHRcdGVsZW1lbnQudGFiSW5kZXggPSAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGVsZW1lbnQuZm9jdXMoKTtcblx0XHRcdH1cblx0XHR9LCBmYWxzZSApO1xuXHR9XG59ICkoKTtcbiIsIi8qKlxuICogRmlsZSB3aW5kb3ctcmVhZHkuanNcbiAqXG4gKiBBZGQgYSBcInJlYWR5XCIgY2xhc3MgdG8gPGJvZHk+IHdoZW4gd2luZG93IGlzIHJlYWR5LlxuICovXG53aW5kb3cud2RzV2luZG93UmVhZHkgPSB7fTtcbiggZnVuY3Rpb24gKCB3aW5kb3csICQsIGFwcCApIHtcblx0Ly8gQ29uc3RydWN0b3IuXG5cdGFwcC5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHRcdGFwcC5jYWNoZSgpO1xuXHRcdGFwcC5iaW5kRXZlbnRzKCk7XG5cdH07XG5cblx0Ly8gQ2FjaGUgZG9jdW1lbnQgZWxlbWVudHMuXG5cdGFwcC5jYWNoZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRhcHAuJGMgPSB7XG5cdFx0XHQnd2luZG93JzogJCggd2luZG93ICksXG5cdFx0XHQnYm9keSc6ICQoIGRvY3VtZW50LmJvZHkgKVxuXHRcdH07XG5cdH07XG5cblx0Ly8gQ29tYmluZSBhbGwgZXZlbnRzLlxuXHRhcHAuYmluZEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcblx0XHRhcHAuJGMud2luZG93LmxvYWQoIGFwcC5hZGRCb2R5Q2xhc3MgKTtcblx0fTtcblxuXHQvLyBBZGQgYSBjbGFzcyB0byA8Ym9keT4uXG5cdGFwcC5hZGRCb2R5Q2xhc3MgPSBmdW5jdGlvbiAoKSB7XG5cdFx0YXBwLiRjLmJvZHkuYWRkQ2xhc3MoICdyZWFkeScgKTtcblx0fTtcblxuXHQvLyBFbmdhZ2UhXG5cdCQoIGFwcC5pbml0ICk7XG59ICkoIHdpbmRvdywgalF1ZXJ5LCB3aW5kb3cud2RzV2luZG93UmVhZHkgKTtcbiJdfQ==
