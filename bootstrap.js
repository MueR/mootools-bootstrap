/**
 * Created by Bas Scholts on 28/05/2015.
 */

if (typeof window.MooTools === 'undefined')
    throw new Error('Mootools-Bootstrap requires Mootools');

window.Bootstrap = {};

var $_support = {transition: false};

(function (){
    function isWindow(e)
    {
        return null != e && e == e.window;
    }

    var transEndEventNames = {
        WebkitTransition: 'webkitTransitionEnd',
        MozTransition: 'transitionend',
        OTransition: 'oTransitionEnd otransitionend',
        transition: 'transitionend'
    };

    function transitionEnd()
    {
        var el = document.createElement('bootstrap')

        for (var name in transEndEventNames) {
            if (el.style[name] !== undefined) {
                return {end: transEndEventNames[name]}
            }
        }

        return false // explicit for ie8 (  ._.)
    };

    var check = function(event){
        var related = event.relatedTarget;
        if (related == null) return true;
        if (!related) return false;
        return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
    };

    var walkUntil = function (element, walk, match, nocash) {
        var el = element[walk];
        var elements = [];
        while (el)
        {
            if (el.nodeType == 1)
            {
                if (!match || Element.match(el, match))
                    break;
                else
                    elements.push(el);
            }
            el = el[walk];
        }
        return new Elements(elements, {ddup: false, cash: !nocash});
    };

    Element.NativeEvents['bstransactionend'] = 2;
    Element.Events['bstransactionend'] = {
        base: 'transitionend',
        condition: check
    };

    //window.addEvent('bsTransitionEnd', function(e){ console.log(e)})

    [Element, Window, Document].invoke('implement', {
        one: function(eventName, selector, callback)
        {
            var isNsEvent = eventName.contains('.');
            selector = selector || false;
            callback = callback || false;
            if (!callback && typeof selector == 'function')
            {
                callback = selector;
                selector = false;
            }
            if (selector)
                eventName = eventName + ':relay(' + selector + ')';
            if (isNsEvent)
                this.addNsEvent(eventName+':once', callback);
            else
                this.addEvent(eventName+':once', callback);
            return this;
        },
        emulateTransitionEnd: function(duration)
        {
            var $el = this;
            var callback = function () { $el.fireEvent('bsTransitionEnd') }
            setTimeout(callback, duration);
            return this;
        },
        getAllPreviousUntil: function(match, nocash){
            return walkUntil(this, 'previousSibling', match, nocash);
        },

        getAllNextUntil: function(match, nocash){
            return walkUntil(this, 'nextSibling', match, nocash);
        },

        getParentsUntil: function(match, nocash){
            return walkUntil(this, 'parentNode', match, nocash);
        }

    });
    (function(){
        $_support.transition = transitionEnd;
        if (!$_support.transition.end) return;


        //Element.NativeEvents.bsTransitionEnd = 0;
        //Element.Events.bsTransitionEnd = {
        //    bindType: $_support.transition.end,
        //    delegateType: $_support.transition.end,
        //    handle: function (e) {
        //        if ($(e.target).match(this))
        //            return e.handleObj.handler.apply(this, arguments)
        //    }
        //}
    })();

    if (document.documentMode >= 9 && document.documentMode <= 11)
    {
        var CustomEvent;

        CustomEvent = function (event, params)
        {
            var evt;
            params = params || {
                bubbles: false,
                cancelable: false,
                detail: undefined
            };
            evt = document.createEvent("CustomEvent");
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
    }
})();

(function () {
    'use strict';
    var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/;
    var isJson = function(str) {
        try { JSON.parse(str) }
        catch (e) { return false }
        return true
    }
    function formatDataProperty(prop)
    {
        return prop.replace('data-', '').camelCase();
    }
    var wrap = function ()
    {
        Event.isDefaultPrevented = function()
        {
            return this.defaultPrevented ||
                this.defaultPrevented == undefined &&
                // Support: Android<4.0
                this.returnValue === false ?
                    true :
                    false;
        };

        [Element, Window, Document].invoke('implement', {
            // Call as element.addNsEvent('event.namespace', function() {});
            addNsEvent: function (name, fn) {
                // Get event type and namespace
                var pseudo = name.split(':'),
                    split = pseudo[0].split('.'),
                    eventName = split[0] + (pseudo.length == 1 ? '' : ':' + pseudo[1]),
                    namespace = pseudo[0].substr(name.indexOf('.')+1);

                // Store the event by its full name including namespace
                this.bindCache = this.bindCache || {};

                if (this.bindCache[name]) {
                    this.bindCache[name].push(fn);
                } else {
                    this.bindCache[name] = [fn];
                }

                // Bind the function to the event
                this.addEvent(eventName, fn);

                return this;
            },

            // Call as element.removeNsEvent('event.namespace');
            removeNsEvent: function (name) {
                // Unbind the specified event
                var eventName = name.split('.')[0],
                    fns = this.bindCache[name],
                    x = 0,
                    fn;

                for (; fn = fns[x++];) {
                    this.removeEvent(eventName, fn);
                }

                return this;
            },

            // Call as element.removeNsEvents('namespace');
            removeNsEvents: function (namespace) {
                var fns,
                    x,
                    fn,
                    self = this;

                Object.each(this.bindCache, function (fns, name) {
                    if (name.contains('.') && name.split('.').getLast() == namespace) {
                        x = 0;
                        for (; fn = fns[x++];) {
                            self.removeEvent(name.split('.')[0], fn);
                        }
                    }
                });

                return this;
            }
        });
        [Document, Element].invoke('implement', {
            data: function (property, force) {
                var data    = this.retrieve('dataCollection'),
                    ii      = 0,
                    len,
                    hasData = false,
                    attribs;

                if (!data || force === true) {
                    data = {};
                    attribs = this.attributes || [];
                    for (len = attribs.length; ii < len; ++ii) {
                        if (attribs[ii].name.indexOf('data-') === 0) {
                            data[formatDataProperty(attribs[ii].name)] = attribs[ii].value.test(rbrace)
                                ? JSON.decode(attribs[ii].value)
                                : attribs[ii].value;

                            hasData = true;
                        }
                    }

                    if (!hasData)
                        data = null;

                    this.store('dataCollection', data);
                }
                else {
                    hasData = true;
                }

                return property ? hasData && data[formatDataProperty(property)] || null : data;
            },
            hasData: function(property, value) {
                return this.hasAttribute('data-'+property);
            },
            setData: function(property, value) {
                this.data(property, value);
            },
            addClasses: function(classNames) {
                classNames = classNames.split(' ');
                for (var i = 0; i < classNames.length; i++)
                    this.classList.add(classNames[i]);
                return this;
            },
            removeClasses: function (classNames) {
                this.className = this.className.replace(new RegExp("\\b(" + classNames.replace(/\s+/g, "|") + ")\\b", "g"), " ").clean();
                return this;
            },
            selfOrParent: function(selector)
            {
                return this.match(selector) ? this : this.getParent(selector);
            },
            closest: function(el)
            {
                var find = this.getElement(el),
                    self = this;
                while (self && !find)
                {
                    self = self.getParent();
                    find = self ? self.getElement(el) : null;
                }
                return find;
            },
            hideElement: function()
            {
                this.toggleClass('hidden', true).set('aria-hidden','true');
            },
            showElement: function()
            {
                this.toggleClass('hidden', false).set('aria-hidden', false);
            },
            toggleElement: function()
            {
                this.hasClass('hidden') ? this.showElement() : this.hideElement();
            },
            val: function()
            {
                return this.get('value')
            },
            attr: function(name, value)
            {
                value = value || null;
                if (value) this.set(name, value);
                if (this[name]) return this.get(name);
            }
        });
        Element.implement({

            height: function()
            {
                return this.getComputedSize().height;
            },
            width: function()
            {
                return this.getComputedSize().width;
            //},
            //scrollTop: function()
            //{
            //    return this.getPosition().y;
            //},
            //scrollLeft: function()
            //{
            //    return this.getPosition().x;
            }
        });
    };
    if (typeof define === 'function' && define.amd)
        define(wrap);
    else
        wrap();
}());


/* ========================================================================
 * Bootstrap.Alert
 * ======================================================================== */
(function() {
    'use strict';

    var dismiss = '[data-dismiss="alert"]';
    var Alert   = function(el) {
        $(el).addEvent('click:relay('+dismiss+')', this.close);
    };

    Alert.VERSION = '3.3.4';

    Alert.TRANSITION_DURATION = 150;

    Alert.prototype.close = function(e) {
        var $this = $(this),
            selector = $this.get('data-target'),
            $parent;

        if (!selector)
        {
            selector = $this.get('href');
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); // IE7
        }

        $parent = $(selector);
        if (!$parent)
            $parent = $$(selector);

        if (e)
            e.preventDefault();
        if (!$parent || !$parent.length)
            $parent = $this.closest('.alert');

        $parent.fireEvent('closed.bs.alert');

        if (e.defaultPrevented) return;

        $parent.removeClass('in');

        function removeElement() {
            $parent.removeEvents().fireEvent('closed.bs.alert').dispose();
        }

        $_support.transition && $parent.hasClass('fade') ?
            $parent.one('bsTransitionEnd', removeElement).emulateTransitionEnd(Alert.TRANSITION_DURATION) :
            removeElement();
    };

    // ALERT PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return function () {
            var $this = $(this),
                data = $this.data('bs.alert');

            if (!data)
                $this.store('bs.alert', (data = new Alert(this)));
            if (typeof option == 'string')
                data[option].call($this);
        }.bind(this)()
    }

    Bootstrap.Alert = Plugin;
    Bootstrap.Alert.Constructor = Alert;

    // ALERT DATA-API
    // ==============

    $(document).addNsEvent('click.bs.alert:relay('+dismiss+')', Alert.prototype.close);
})();


/* ========================================================================
 * Bootstrap.Button
 * ======================================================================== */
(function () {
    'use strict';

    // BUTTON PUBLIC CLASS DEFINITION
    // ==============================

    var Button = function (element, options) {
        this.$element = $(element)
        this.options = Object.merge({}, Button.DEFAULTS, options)
        this.isLoading = false
    }

    Button.VERSION  = '1.0.0';

    Button.DEFAULTS = {
        loadingText: 'loading...'
    };

    Button.prototype.setState = function (state) {
        var d = 'disabled',
            $el = this.$element,
            val = $el.match('input') ? 'val' : 'html',
            data = $el.data();

        state = state + 'Text';

        if (data.resetText == null) $el.data('resetText', $el.get(val).trim());

        setTimeout(function(){
            $el.set(val, (data[state] == null ? this.options[state] : data[state]));

            if (state == 'loadingText')
            {
                this.isLoading = true;
                $el.addClass(d).set(d, d);
            }
            else if (this.isLoading)
            {
                this.isLoading = false;
                $el.removeClass(d).removeAttr(d);
            }
        }.bind(this), 0)
    };

    Button.prototype.toggle = function() {
        var changed = true,
            $parent = this.$element.closest('[data-toggle="buttons"]');
        if ($parent && $parent.length)
        {
            var $input = this.$element.getChildren('input');
            $input.each(function(input){
                if (input.getAttribute('type') == 'radio')
                {
                    if (input.get('checked') && this.$element.hasClass('active'))
                        changed = false;
                    else
                        $parent.getChildren('.active').removeClass('active');
                }
                if (changed)
                    input.get('checked', !this.$element.hasClass('active')).fireEvent('change');
            }.bind(this));
        }
        else
            this.$element.set('aria-pressed', !this.$element.hasClass('active'))

        if (changed)
            this.$element.toggleClass('active')
    };

    // BUTTON PLUGIN DEFINITION
    // ========================

    function Plugin(option) {
        return function () {
            var $this = $(this),
                data = $this.data('button'),
                options = typeof option == 'object' && option;

            if (!data)
                $this.store('bs.button', (data = new Button(this, options)));

            if (option == 'toggle')
                data.toggle();
            else if (option)
                data.setState(option);
        }.bind(this)()
    }

    Bootstrap.Button = Plugin;
    Bootstrap.Button.Constructor = Button;
    Element.prototype.button = Bootstrap.Button;

    // BUTTON DATA-API
    // ===============

    $(document)
        .addNsEvent('click.bs.button.data-api:relay([data-toggle^="button"])', function (e) {
            var $btn = $(e.target)
            if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn');
            Plugin.call($btn, 'toggle');
            e.preventDefault();
        })
        .addNsEvent('focus.bs.button.data-api blur.bs.button.data-api:relay([data-toggle^="button"])', function (e) {
            $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
        });
})();


/* ========================================================================
 * Bootstrap.Collapse
 * ======================================================================== */
(function () {
    'use strict';

    // COLLAPSE PUBLIC CLASS DEFINITION
    // ================================

    var Collapse = function (element, options)
    {
        this.$element = $(element)
        this.options = Object.merge({}, Collapse.DEFAULTS, options)
        this.$trigger = $$('[data-toggle="collapse"][href="#' + element.id + '"],' +
                           '[data-toggle="collapse"][data-target="#' + element.id + '"]');
        this.transitioning = null;

        if (this.options.parent)
        {
            this.$parent = this.getParent();
        }
        else
        {
            this.addAriaAndCollapsedClass(this.$element, this.$trigger);
        }

        if (this.options.toggle)
            this.toggle();
    };

    Collapse.VERSION = '3.3.4';

    Collapse.TRANSITION_DURATION = 350;

    Collapse.DEFAULTS = {
        toggle: true
    };

    Collapse.prototype.dimension = function ()
    {
        return this.$element.hasClass('width') ? 'width' : 'height';
    };

    Collapse.prototype.show = function ()
    {
        if (this.transitioning || this.$element.hasClass('in')) return;

        var activesData,
            actives = this.$parent && this.$parent.getChildren('.panel').getChildren('.in, .collapsing'),
            that = this;

        if (actives && actives.length)
        {
            activesData = actives.data('bs.collapse');
            if (activesData && activesData.transitioning)
                return;
        }

        var startEvent = new CustomEvent('show.bs.collapse');
        this.$element.fireEvent(startEvent);
        if (startEvent.defaultPrevented)
            return;

        if (actives && actives.length)
        {
            Plugin.call(actives, 'hide');
            activesData || actives.data('bs.collapse', null);
        }

        var dimension = this.dimension();
        this.$element.removeClass('collapse').addClass('collapsing').attr('aria-expanded', true);
        this.$trigger.removeClass('collapsed').attr('aria-expanded', true);
        this.transitioning = 1;

        var complete = function (that)
        {
            that.$element.removeClass('collapsing').addClass('collapse in').setStyle(dimension, '');
            that.transitioning = 0;
            that.$element.fireEvent('shown.bs.collapse');
        };

        if (!$_support.transition)
            return complete.call(this);

        var scrollSize = ['scroll', dimension].join('-').camelCase();
        this.$element
            .one('bsTransitionEnd', function(){ complete(that) })
            .emulateTransitionEnd(Collapse.TRANSITION_DURATION).setStyle(dimension, this.$element[scrollSize]);
    };

    Collapse.prototype.hide = function ()
    {
        if (this.transitioning || !this.$element.hasClass('in')) return;

        var startEvent = new CustomEvent('hide.bs.collapse'),
            that = this;
        this.$element.fireEvent(startEvent);
        if (startEvent.defaultPrevented) return;

        var dimension = this.dimension();
        this.$element.setStyle(dimension, this.$element.getStyle(dimension)).offsetHeight;
        this.$element.addClass('collapsing').removeClass('collapse in').attr('aria-expanded', false);
        this.$trigger.addClass('collapsed').attr('aria-expanded', false);
        this.transitioning = 1;

        var complete = function (that)
        {
            that.transitioning = 0
            that.$element.removeClass('collapsing').addClass('collapse').fireEvent('hidden.bs.collapse')
        };

        if (!$_support.transition)
            return complete.call(this);

        this.$element
            .setStyle(dimension, 0)
            .one('bsTransitionEnd', function(){ complete(that) })
            .emulateTransitionEnd(Collapse.TRANSITION_DURATION);
    };

    Collapse.prototype.toggle = function ()
    {
        this[this.$element.hasClass('in') ? 'hide' : 'show']()
    };

    Collapse.prototype.getParent = function ()
    {
        return $$(this.options.parent)[0]
            .getElements('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
            .each(function (element, i) {
                var $element = $(element);
                this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element);
            }.bind(this));
    }

    Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger)
    {
        var isOpen = $element.hasClass('in');

        $element.attr('aria-expanded', isOpen);
        $trigger.toggleClass('collapsed', !isOpen).attr('aria-expanded', isOpen);
    }

    function getTargetFromTrigger($trigger)
    {
        var href,
            target = $trigger.get('data-target') || (href = $trigger.get('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7
        return $$(target)[0]
    }


    // COLLAPSE PLUGIN DEFINITION
    // ==========================

    function Plugin(option)
    {
        return function ()
        {
            var $this = $(this);
            var data = $this.data('bs.collapse');
            var options = Object.merge({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option);

            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false;
            if (!data) $this.store('bs.collapse', (data = new Collapse(this, options)));
            if (typeof option == 'string') data[option]();
        }.bind(this)()
    }

    Bootstrap.Collapse = Plugin;
    Bootstrap.Collapse.Constructor = Collapse;


    // COLLAPSE DATA-API
    // =================

    document.addNsEvent('click.bs.collapse.data-api:relay([data-toggle="collapse"])', function (e) {
        var $this = $(e.target).selfOrParent('[data-toggle="collapse"]');

        if (!$this.attr('data-target'))
            e.preventDefault();

        var $target = getTargetFromTrigger($this);

        var data = $target.data('bs.collapse'),
            option = data ? 'toggle' : $this.data();
        Plugin.call($target, option);
    })

})();



/* ========================================================================
 * Bootstrap.Dropdown
 * ======================================================================== */
(function () {
    'use strict';

    // DROPDOWN PUBLIC CLASS DEFINITION
    // ================================

    var backdrop = '.dropdown-backdrop';
    var toggle   = '[data-toggle="dropdown"]';
    var Dropdown = function (element) {
        $(element).addNsEvent('click.bs.dropdown', this.toggle);
    };

    Dropdown.VERSION = '3.3.4';

    Dropdown.prototype.toggle = function(e) {
        var $this = $(this);

        if ($this.match('.disabled, :disabled')) return;

        var $parent = getParent($this),
            isActive = $parent.hasClass('open');

        clearMenus();

        e.preventDefault()
        e.stopPropagation()

        if (!isActive) {
            if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                // if mobile we use a backdrop because click events don't delegate
                new Element('div.dropdown-backdrop').insert($(this), 'after').addEvent('click', clearMenus)
            }

            var relatedTarget = {relatedTarget: this}
            $parent.fireEvent(e = new CustomEvent('show.bs.dropdown', relatedTarget));

            if (e.defaultPrevented) return;

            $this.fireEvent('focus').attr('aria-expanded', true);
            $parent.toggleClass('open').fireEvent('shown.bs.dropdown', relatedTarget);
        }

        return false;
    };

    Dropdown.prototype.keydown = function (e) {
        if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return;

        var $this = $(this)

        e.preventDefault()
        e.stopPropagation()

        if ($this.match('.disabled, :disabled')) return;

        var $parent = getParent($this),
            isActive = $parent.hasClass('open');

        if ((!isActive && e.which != 27) || (isActive && e.which == 27))
        {
            if (e.which == 27)
                $parent.getChildren(toggle).fireEvent('focus')
            return $this.fireEvent('click')
        }

        var desc = ' li:not(.disabled):visible a',
            $items = $parent.getChildren('[role="menu"]' + desc + ', [role="listbox"]' + desc);

        if (!$items.length) return

        var index = $items.match(e.target);
        if (e.which == 38 && index > 0)
            index--; // up
        if (e.which == 40 && index < $items.length - 1)
            index++; // down
        if (!~index)
            index = 0;
        $items[index].fireEvent('focus')
    };

    function clearMenus(e) {
        if (e && e.which === 3) return;
        $$(backdrop).dispose();
        $$(toggle).each(function (el) {
            var $this = $(el)
            var $parent = getParent($this)
            var relatedTarget = {relatedTarget: this}

            if (!$parent.hasClass('open')) return

            $parent.fireEvent(e = new CustomEvent('hide.bs.dropdown', relatedTarget))

            if (e.defaultPrevented) return

            $this.attr('aria-expanded', 'false')
            $parent.removeClass('open').fireEvent('hidden.bs.dropdown', relatedTarget)
        }.bind(this))
    }

    function getParent($this) {
        var selector = $this.attr('data-target')

        if (!selector)
        {
            selector = $this.attr('href')
            selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        var $parent = selector && $(selector);
        if (!$parent && selector)
            $parent = $$(selector)

        return $parent && $parent.length ? $parent : $this.getParent()
    }

    // DROPDOWN PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return function () {
            var $this = $(this)
            var data = $this.data('bs.dropdown')

            if (!data) $this.store('bs.dropdown', (data = new Dropdown(this)))
            if (typeof option == 'string') data[option].call($this)
        }.bind(this)()
    }

    Bootstrap.Dropdown = Plugin;
    Bootstrap.Dropdown.Constructor = Dropdown;

    // APPLY TO STANDARD DROPDOWN ELEMENTS
    // ===================================

    $(document)
        .addNsEvent('click.bs.dropdown.data-api', clearMenus)
        .addNsEvent('click.bs.dropdown.data-api:relay(.dropdown form)', function (e) { e.stopPropagation() })
        .addNsEvent('click.bs.dropdown.data-api:relay('+toggle+')', Dropdown.prototype.toggle)
        .addNsEvent('keydown.bs.dropdown.data-api:relay('+toggle+')', Dropdown.prototype.keydown)
        .addNsEvent('keydown.bs.dropdown.data-api:relay([role="menu"])', Dropdown.prototype.keydown)
        .addNsEvent('keydown.bs.dropdown.data-api:relay([role="listbox"])', Dropdown.prototype.keydown)
})();


/* ========================================================================
 * Bootstrap.Modal
 * ======================================================================== */

(function () {
    'use strict';

    // MODAL CLASS DEFINITION
    // ======================

    var Modal = function(element, options) {
        this.options = options;
        this.$body = $(document.body);
        this.$element = $(element);
        this.$dialog = this.$element.getElement('.modal-dialog');
        this.$backdrop = null;
        this.isShown = null;
        this.originalBodyPad = null;
        this.scrollbarWidth = 0;
        this.ignoreBackdropClick = false;

        if (this.options.remote)
        {
            this.$element.getElement('.modal-content')
                .load(this.options.remote, function(){
                    this.$element.fireEvent('loaded.bs.modal');
                }.bind(this));
        }
    }

    Modal.VERSION  = '1.0.0';

    Modal.TRANSITION_DURATION = 300;
    Modal.BACKDROP_TRANSITION_DURATION = 150;

    Modal.DEFAULTS = {
        backdrop: true,
        keyboard: true,
        show: true
    };

    Modal.prototype.toggle = function (_relatedTarget) {
        return this.isShown ? this.hide() : this.show(_relatedTarget)
    }

    Modal.prototype.show = function (_relatedTarget) {
        var that = this;
        var e = new CustomEvent('show.bs.modal', {detail: {relatedTarget: _relatedTarget}});

        this.$element.fireEvent(e);

        if (this.isShown || e.defaultPrevented) return;

        this.isShown = true;

        this.checkScrollbar();
        this.setScrollbar();
        this.$body.addClass('modal-open');

        this.escape();
        this.resize();

        this.$element.addNsEvent('click.dismiss.bs.modal:relay([data-dismiss="modal"])', this.hide.bind(this));

        this.$dialog.addNsEvent('mousedown.dismiss.bs.modal:relay([data-dismiss="modal"])', function(){
            that.$element.addNsEvent('mouseup.dismiss.bs.modal:once', function(e){
                if ($(e.target).match(that.$element))
                    that.ignoreBackdropClick = true;
            });
        });

        this.backdrop(function() {
            var transition = that.$element.hasClass('fade');

            if (!that.$element.getParent())
                that.$element.inject(that.body);

            that.$element.show().scrollTop(0);

            that.adjustDialog();

            if (transition) {
                that.$element.offsetWidth; // force reflow
            }

            that.$element.addClass('in').attr('aria-hidden', false);

            that.enforceFocus();

            var e = new CustomEvent('shown.bs.modal', {detail:{relatedTarget: _relatedTarget}});

            transition ?
                that.$dialog
                    .one('bsTransitionEnd', function(){ that.$element.fireEvent('focus').fireEvent(e); })
                    .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
                that.$element.fireEvent('focus').fireEvent(e);
        });
    };

    Modal.prototype.hide = function (e) {
        if (e) e.preventDefault();

        this.$element.fireEvent('hide.bs.modal');

        if (!this.isShown || e.defaultPrevented) return;

        this.isShown = false;

        this.escape();
        this.resize();

        $(document).removeNsEvent('focusin.bs.modal');

        this.$element
            .removeClass('in')
            .attr('aria-hidden', true)
            .removeNsEvent('click.dismiss.bs.modal')
            .removeNsEvent('mouseup.dismiss.bs.modal');

        this.$dialog.removeNsEvent('mousedown.dismiss.bs.modal');


        $_support.transition && this.$element.hasClass('fade') ?
            this.$element.one('bsTransitionEnd', this.hideModal.bind(this)).emulateTransitionEnd(Modal.TRANSITION_DURATION) :
            this.hideModal()
    };

    Modal.prototype.enforceFocus = function () {
        $(document)
            .removeNsEvent('focusin.bs.modal') // guard against infinite focus loop
            .addNsEvent('focusin.bs.modal', function (e) {
                if (this.$element !== e.target && !this.$element.getElements(e.target)) {
                    this.$element.fireEvent('focus')
                }
            }.bind(this));
    };

    Modal.prototype.escape = function () {
        if (this.isShown && this.options.keyboard) {
            this.$element.addNsEvent('keydown.dismiss.bs.modal', function(e) {
                e.which == 27 && this.hide();
            }.bind(this))
        } else if (!this.isShown) {
            this.$element.removeNsEvent('keydown.dismiss.bs.modal')
        }
    };

    Modal.prototype.resize = function () {
        if (this.isShown) {
            $(window).addNsEvent('resize.bs.modal', this.handleUpdate.bind(this))
        } else {
            $(window).removeNsEvent('resize.bs.modal')
        }
    };

    Modal.prototype.hideModal = function () {
        var that = this;
        this.$element.hide();
        this.backdrop(function () {
            that.$body.removeClass('modal-open');
            that.resetAdjustments();
            that.resetScrollbar();
            that.$element.fireEvent('hidden.bs.modal');
        })
    };

    Modal.prototype.removeBackdrop = function () {
        this.$backdrop && this.$backdrop.dispose();
        this.$backdrop = null
    };

    Modal.prototype.backdrop = function (callback) {
        var that = this,
            animate = this.$element.hasClass('fade') ? 'fade' : '';

        if (this.isShown && this.options.backdrop)
        {
            var doAnimate = $_support.transition && animate;

            this.$backdrop = new Element('div.modal-backdrop ' + ((animate != '' ? '.' : '')+animate)).inject(this.$body);

            this.$element.addNsEvent('click.dismiss.bs.modal', function (e) {
                if (this.ignoreBackdropClick) {
                    this.ignoreBackdropClick = false;
                    return;
                }
                if (e.target !== e.currentTarget) return;
                this.options.backdrop == 'static' ? this.$element.focus() : this.hide();
            }.bind(this));

            if (doAnimate) this.$backdrop.offsetWidth; // force reflow

            this.$backdrop.addClass('in');

            if (!callback) return;

            doAnimate ?
                this.$backdrop.one('bsTransitionEnd', callback).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                callback();
        }
        else if (!this.isShown && this.$backdrop)
        {
            this.$backdrop.removeClass('in');

            var callbackRemove = function () {
                that.removeBackdrop();
                callback && callback();
            };
            $_support.transition && this.$element.hasClass('fade') ?
                this.$backdrop.one('bsTransitionEnd', callbackRemove).emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                callbackRemove();
        }
        else if (callback)
        {
            callback();
        }
    };

    Modal.prototype.handleUpdate = function () {
        this.adjustDialog();
    };

    Modal.prototype.adjustDialog = function () {
        var modalIsOverflowing = this.$element.scrollHeight > document.documentElement.clientHeight;

        this.$element.setStyles({
            'padding-left':  !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
            'padding-right': this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
        });
    };

    Modal.prototype.resetAdjustments = function () {
        this.$element.setStyles({'padding-left': '', 'padding-right': ''});
    };

    Modal.prototype.checkScrollbar = function () {
        var fullWindowWidth = window.innerWidth;
        if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
            var documentElementRect = document.documentElement.getBoundingClientRect();
            fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left);
        }
        this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth;
        this.scrollbarWidth = this.measureScrollbar();
    };

    Modal.prototype.setScrollbar = function () {
        var bodyPad = parseInt((this.$body.getStyle('padding-right') || 0), 10);
        this.originalBodyPad = document.body.style.paddingRight || '';
        if (this.bodyIsOverflowing)
            this.$body.getStyle('padding-right', bodyPad + this.scrollbarWidth);
    };

    Modal.prototype.resetScrollbar = function () {
        this.$body.setStyle('padding-right', this.originalBodyPad)
    };

    Modal.prototype.measureScrollbar = function () {
        var scrollDiv = new Element('div.modal-scrollbar-measure').inject(this.$body),
            scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        this.$body.removeChild(scrollDiv);
        return scrollbarWidth;
    };

    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return (function () {
            var $this = $(this);
            var data = $this.data('bs.modal');
            var options = Object.merge({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option);

            if (!data) $this.data('bs.modal', (data = new Modal(this, options)));
            if (typeof option == 'string') data[option](_relatedTarget);
            else if (options.show) data.show(_relatedTarget);
        }.bind(this));
    };

    Bootstrap.Modal = Plugin;
    Bootstrap.Modal.Constructor = Modal;

    // MODAL DATA-API
    // ==============

    $(document).addNsEvent('click.bs.modal.data-api:relay([data-toggle="modal"])', function (e) {
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))); // strip for ie7
        var option = $target.data('bs.modal') ? 'toggle' : Object.merge({remote: !/#/.test(href) && href}, $target.data(), $this.data())

        if ($this.match('a')) e.preventDefault();

        $target.one('show.bs.modal', function (showEvent) {
            if (showEvent.defaultPrevented) return; // only register focus restorer if modal will actually get shown
            $target.one('hidden.bs.modal', function () {
                $this.isVisible() && $this.fireEvent('focus')
            });
        });
        Plugin.call($target, option, this);
    });

})();


/* ========================================================================
 * Bootstrap.Tooltip
 * ======================================================================== */
(function () {
    'use strict';

    // TOOLTIP CLASS DEFINITION
    // ========================

    var Tooltip = function(element, options) {
        this.type = null;
        this.options = null;
        this.enabled = null;
        this.timeout = null;
        this.hoverState = null;
        this.$element = null;

        this.init('tooltip', element, options);
    };

    Tooltip.VERSION  = '3.3.4';

    Tooltip.TRANSITION_DURATION = 150;

    Tooltip.DEFAULTS = {
        animation: true,
        placement: 'top',
        selector: false,
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        container: false,
        viewport: {
            selector: 'body',
            padding: 0
        }
    };

    Tooltip.prototype.init = function (type, element, options) {
        this.enabled = true;
        this.type = type;
        this.$element = $(element);
        this.options = this.getOptions(options);
        this.$viewport = this.options.viewport && $$(this.options.viewport.selector || this.options.viewport)[0];

        if (this.$element instanceof document.constructor && !this.options.selector)
            throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!');

        var triggers = this.options.trigger.split(' '),
            trigger, i;

        for (i = triggers.length; i--;)
        {
            trigger = triggers[i];

            if (trigger == 'click')
            {
                this.$element.addNsEvent('click.' + this.type + ':relay(' + this.options.selector + ')', this.toggle.bind(this));
            }
            else if (trigger != 'manual')
            {
                var eventIn = trigger == 'hover' ? 'mouseenter' : 'focusin',
                    eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout';
                this.element.addNsEvent(eventIn + '.' + this.type + ':relay(' + this.options.selector + ')', this.enter.bind(this));
                this.element.addNsEvent(eventOut + '.' + this.type + ':relay(' + this.options.selector + ')', this.leave.bind(this));
            }
        }

        this.options.selector ?
            (this._options = Object.merge({}, this.options, {trigger: 'manual', selector: ''})) :
            this.fixTitle();
    };

    Tooltip.prototype.getDefaults = function () {
        return Tooltip.DEFAULTS;
    };

    Tooltip.prototype.getOptions = function (options) {
        options = Object.merge({}, this.getDefaults(), this.$element.data(), options);

        if (options.delay && typeof options.delay == 'number')
        {
            options.delay = {
                show: options.delay,
                hide: options.delay
            };
        }

        return options;
    };

    Tooltip.prototype.getDelegateOptions = function () {
        var options = {},
            defaults = this.getDefaults();

        this._options && Object.each(this._options, function (key, value) {
            if (defaults[key] != value) options[key] = value
        });

        return options;
    };

    Tooltip.prototype.enter = function (obj) {
        var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);

        if (self && self.$tip && self.$tip.isVisible()) {
            self.hoverState = 'in';
        }

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
            $(obj.currentTarget).data('bs.' + this.type, self);
        }

        clearTimeout(self.timeout);

        self.hoverState = 'in';

        if (!self.options.delay || !self.options.delay.show) return self.show();

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'in') self.show();
        }, self.options.delay.show);
    };

    Tooltip.prototype.leave = function (obj) {
        var self = obj instanceof this.constructor ? obj : $(obj.currentTarget).data('bs.' + this.type);

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions());
            $(obj.currentTarget).data('bs.' + this.type, self);
        }

        clearTimeout(self.timeout);

        self.hoverState = 'out';

        if (!self.options.delay || !self.options.delay.hide) return self.hide();

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'out') self.hide();
        }, self.options.delay.hide);
    };

    Tooltip.prototype.show = function () {
        var e = new CustomEvent('show.bs.' + this.type);

        if (this.hasContent() && this.enabled)
        {
            this.$element.fireEvent(e);

            var inDom = this.$element.ownerDocument.documentElement.contains(this.$element);
            if (e.defaultPrevented || !inDom) return;

            var that = this,
                $tip = this.tip(),
                tipId = this.getUID(this.type);

            this.setContent();
            $tip.attr('id', tipId);
            this.element.attr('aria-describedby', tipId);

            if (this.options.animation) $tip.addClass('fade');

            var placement = typeof this.options.placement == 'function' ?
                this.options.placement.call(this, $tip, this.$element) :
                this.options.placement;

            var autoToken = /\s?auto?\s?/i,
                autoPlace = autoToken.test(placement);
            if (autoPlace) placement = placement.replace(autoToken, '') || 'top';

            $tip
                .removeEvents()
                .setStyles({top: 0, left: 0, display: 'block'})
                .addClass('placement')
                .data('bs.' + this.type, this);

            this.options.container ? this.options.container.grab($tip) : $tip.insert(this.$element, 'after');

            var pos = this.getPosition(),
                actualWidth = $tip.offsetWidth,
                actualHeight = $tip.offsetHeight;

            if (autoPlace)
            {
                var orgPlacement = placement,
                    $container = this.options.container ? $$(this.options.container)[0] : this.$element.getParent(),
                    containerDim = this.getPosition($container);

                placement = placement == 'bottom' && pos.bottom + actualHeight > containerDim.bottom ? 'top'    :
                            placement == 'top'    && pos.top    - actualHeight < containerDim.top    ? 'bottom' :
                            placement == 'right'  && pos.right  + actualWidth  > containerDim.width  ? 'left'   :
                            placement == 'left'   && pos.left   - actualWidth  < containerDim.left   ? 'right'  :
                            placement;

                $tip.removeClass(orgPlacement).addClass(placement);
            }

            var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
            this.applyPlacement(calculatedOffset, placement);

            var complete = function() {
                var prevHoverState = that.hoverState;
                that.$element.fireEvent('shown.bs.' + that.type);
                that.hoverState = null;
                if (prevHoverState == 'out') that.leave(that);
            }

            $_support.transition && this.$tip.hasClass('fade') ?
                $tip
                    .one('bsTransitionEnd', complete)
                    .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
                complete();
        }
    };

    Tooltip.prototype.applyPlacement = function(offset, placement) {
        var $tip = this.tip(),
            width = $tip.offsetWidth,
            height = $tip.offsetHeight,
            marginTop = $tip.getStyle('margin-top').toInt(),
            marginLeft = $tip.getStyle('margin-left').toInt();

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop)) marginTop = 0;
        if (isNaN(marginLeft)) marginLeft = 0;

        offset.y = offset.top = offset.top + marginTop;
        offset.x = offset.left = offset.left + marginLeft;

        $tip.position({
            offset: offset
        });

        $tip.addClass('in');

        // check to see if placing tip in new offset caused the tip to resize itself
        var actualWidth  = $tip[0].offsetWidth,
            actualHeight = $tip[0].offsetHeight;

        if (placement == 'top' && actualHeight != height)
            offset.top = offset.top + height - actualHeight;

        var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);
        if (delta.left) offset.left = offset.x += delta.left;
        else offset.top = offset.y += delta.top;

        var isVertical = /top|bottom/.test(placement),
            arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight,
            arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight';

        $tip.position({offset: offset});
        this.replaceArrow(arrowDelta, $tip[arrowOffsetPosition], isVertical);
    };

    Tooltip.prototype.replaceArrow = function(delta, dimension, isVertical) {
        this.arrow().setStyles({
            'left': (isVertical ? 50 * (1 - delta / dimension) + '%' : ''),
            'top': (isVertical ? '' : 50 * (1 - delta / dimension) + '%')
        });
    };

    Tooltip.prototype.setContent = function () {
        var $tip = this.tip(),
            title = this.getTitle();

        $tip.getElements('.tooltip-inner').set(this.options.html ? 'html' : 'text', title);
        $tip.removeClasses('fade in top bottom left right');
    }

    Tooltip.prototype.hide = function () {
        var that = this,
            $tip = $(this.$tip),
            e = new CustomEvent('hide.bs.' + this.type);

        function complete() {
            if (that.hoverState != 'in') $tip.dispose()
            that.$element.removeAttr('aria-describedby').fireEvent('hidden.bs.' + that.type);
            callback && callback();
        }

        this.element.fireEvent(e);
        if (e.defaultPrevented) return;

        $tip.removeClass('in');
        $_support.transition && $tip.hasClass('fade') ?
            $tip.one('bsTransitionEnd', complete)
                .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
            complete();

        this.hoverState = null;

        return this;
    };

    Tooltip.prototype.fixTitle = function () {
        var $e = this.$element
        if ($e.attr('title') || typeof ($e.attr('data-original-title')) != 'string') {
            $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
        }
    };

    Tooltip.prototype.hasContent = function () {
        return this.getTitle()
    };

    Tooltip.prototype.getPosition = function ($element) {
        $element = $element || this.$element;

        var el = $element,
            isBody = el.tagName == 'BODY',
            elRect = el.getBoundingClientRect()
        if (elRect.width == null)
        {
            // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
            elRect = Object.merge({}, elRect, {width: elRect.right - elRect.left, height: elRect.bottom - elRect.top})
        }
        var elOffset = isBody ? {top: 0, left: 0} : $element.offset(),
            scroll = {scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop()},
            outerDims = isBody ? {width: $(window).getWidth(), height: $(window).getHeight()} : null

        return Object.merge({}, elRect, scroll, outerDims, elOffset)
    };

    Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
        return placement == 'bottom' ? { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2 } :
               placement == 'top'    ? { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 } :
               placement == 'left'   ? { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth } :
            /* placement == 'right' */ { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }

    };

    Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
        var delta = {top: 0, left: 0};
        if (!this.$viewport) return delta;

        var viewportPadding = this.options.viewport && this.options.viewport.padding || 0,
            viewportDimensions = this.getPosition(this.$viewport);

        if (/right|left/.test(placement))
        {
            var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll,
                bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight;
            if (topEdgeOffset < viewportDimensions.top) // top overflow
                delta.top = viewportDimensions.top - topEdgeOffset;
            else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) // bottom overflow
                delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset;
        }
        else
        {
            var leftEdgeOffset = pos.left - viewportPadding,
                rightEdgeOffset = pos.left + viewportPadding + actualWidth
            if (leftEdgeOffset < viewportDimensions.left) // left overflow
                delta.left = viewportDimensions.left - leftEdgeOffset;
            else if (rightEdgeOffset > viewportDimensions.width) // right overflow
                delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset;
        }

        return delta
    };

    Tooltip.prototype.getTitle = function () {
        var title,
            $e = this.$element,
            o = this.options;
        title = $e.attr('data-original-title') || (typeof o.title == 'function' ? o.title.call($e) : o.title);
        return title;
    };

    Tooltip.prototype.getUID = function (prefix) {
        do { prefix += ~~(Math.random() * 1000000) } while (document.getElementById(prefix));
        return prefix;
    };

    Tooltip.prototype.tip = function () {
        return (this.$tip = this.$tip || $(this.options.template));
    };

    Tooltip.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().getElements('.tooltip-arrow'));
    };

    Tooltip.prototype.enable = function () {
        this.enabled = true;
    };

    Tooltip.prototype.disable = function () {
        this.enabled = false;
    };

    Tooltip.prototype.toggleEnabled = function () {
        this.enabled = !this.enabled;
    };

    Tooltip.prototype.toggle = function (e) {
        var self = this;
        if (e)
        {
            self = $(e.currentTarget).data('bs.' + this.type)
            if (!self)
            {
                self = new this.constructor(e.currentTarget, this.getDelegateOptions());
                $(e.currentTarget).data('bs.' + this.type, self);
            }
        }

        self.tip().hasClass('in') ? self.leave(self) : self.enter(self);
    };

    Tooltip.prototype.destroy = function () {
        var that = this;
        clearTimeout(this.timeout);
        this.hide(function () {
            that.$element.removeEvent('.' + that.type).removeData('bs.' + that.type);
        })
    };

    // TOOLTIP PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return function () {
            var $this = $(this),
                data = $this.data('bs.tooltip'),
                options = typeof option == 'object' && option;

            if (!data && /destroy|hide/.test(option)) return;
            if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)));
            if (typeof option == 'string') data[option]();
        }.bind(this)()
    }

    Bootstrap.Tooltip = Plugin;
    Bootstrap.Tooltip.Constructor = Tooltip;
    Element.prototype.tooltip = Bootstrap.Tooltip;

})();


/* ========================================================================
 * Bootstrap.Popover
 * ======================================================================== */
(function () {
    'use strict';

    // POPOVER CLASS DEFINITION
    // ========================

    var Popover = function(element, options) {
        this.init('popover', element, options);
    };

    if (!Bootstrap.Tooltip) throw new Error('Popover requires Bootstrap.Tooltip');

    Popover.VERSION = '3.3.4';

    Popover.DEFAULTS = Object.merge({}, Bootstrap.Tooltip.DEFAULTS, {
        placement: 'right',
        trigger: 'click',
        content: '',
        template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    });

    Popover.prototype = Object.merge({}, Bootstrap.Tooltip.Constructor.prototype);

    Popover.prototype.constructor = Popover;

    Popover.prototype.getDefaults = function() {
        return Popover.DEFAULTS;
    };

    Popover.prototype.setContent = function() {
        var $tip    = this.tip(),
            title   = this.getTitle(),
            content = this.getContent()

        $tip.getElement('.popover-title').set(this.options.html ? 'html' : 'text', title);
        $tip.getElement('.popover-content').getChildren().dispose();
        if (this.options.html && typeof content != 'string')
            $tip.getElement('.popover-content').adopt(content);
        else
            $tip.getElement('.popover-content').set(this.options.html ? 'html' : 'text',  content);

        $tip.removeClasses('fade top bottom left right in')

        // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
        // this manually by checking the contents.
        if (!$tip.getElement('.popover-title').get('html')) $tip.getElement('.popover-title').hide()
    };

    Popover.prototype.hasContent = function () {
        return this.getTitle() || this.getContent();
    };

    Popover.prototype.getContent = function () {
        var $e = this.$element,
            o = this.options;
        return $e.attr('data-content') || (typeof o.content == 'function' ? o.content.call($e) : o.content);
    };

    Popover.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().find('.arrow'));
    };

    // POPOVER PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return function () {
            var $this = $(this),
                data = $this.data('bs.popover'),
                options = typeof option == 'object' && option;

            if (!data && /destroy|hide/.test(option)) return;
            if (!data) $this.data('bs.popover', (data = new Popover(this, options)));
            if (typeof option == 'string') data[option]();
        }.bind(this)();
    }

    Bootstrap.Popover = Plugin;
    Bootstrap.Popover.Constructor = Popover;
    Element.prototype.popover = Bootstrap.Popover;
})();


/* ========================================================================
 * Bootstrap.Tab
 * ======================================================================== */
(function () {
    'use strict';

    // TAB CLASS DEFINITION
    // ====================

    var Tab = function (element) {
        this.element = $(element)
    };

    Tab.VERSION = '3.3.4';

    Tab.TRANSITION_DURATION = 150;

    Tab.prototype.show = function () {
        var $this = this.element,
            $ul = $this.closest('ul:not(.dropdown-menu)'),
            selector = $this.data('target');

        if (!selector)
        {
            selector = $this.attr('href');
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7
        }

        if ($this.getParent('li').hasClass('active')) return;

        var $previous = $ul.getElement('.active a'),
            hideEvent = new CustomEvent('hide.bs.tab', { detail: { relatedTarget: $this[0] } }),
            showEvent = new CustomEvent('show.bs.tab', { detail: { relatedTarget: $previous[0] } });

        $previous.fireEvent(hideEvent);
        $this.fireEvent(showEvent);

        if (showEvent.defaultPrevented || hideEvent.defaultPrevented) return;

        var $target = Array.from($$(selector))[0];

        this.activate($this.getParent('li'), $ul);
        this.activate($target, $target.getParent(), function () {
            $previous.fireEvent({type: 'hidden.bs.tab', relatedTarget: $this});
            $this.fireEvent({type: 'shown.bs.tab', relatedTarget: $previous});
        });
    };

    Tab.prototype.activate = function (element, container, callback) {
        var $active = container.getElement('> .active');
        var transition = callback && (($active && $active.hasClass('fade')) || !!container.getElements('> .fade').length)

        $active.removeClass('active');
        var f = $active.getElements('> .dropdown-menu > .active');
        if (f.length > 0)
        {
            f.removeClass('active');
        }
        $active.getElements('[data-toggle="tab"]').attr('aria-expanded', false);

        console.log($active, element, transition)
        element.addClass('active');
        element.getElements('[data-toggle="tab"]').attr('aria-expanded', true);

        if (transition)
        {
            element[0].offsetWidth; // reflow for transition
            element.addClass('in')
        }
        else
        {
            element.removeClass('fade')
        }

        if (element.getParent('.dropdown-menu'))
        {
            element.closest('li.dropdown').addClass('active');
            element.getElements('[data-toggle="tab"]').attr('aria-expanded', true);
        }

        callback && callback();

        $active.removeClass('in');
    };

    // TAB PLUGIN DEFINITION
    // =====================

    function Plugin(option) {
        return function () {
            var $this = $(this);
            var data = $this.data('bs.tab');

            if (!data) $this.data('bs.tab', (data = new Tab(this)))
            if (typeof option == 'string') data[option]()
        }.bind(this)();
    }

    Bootstrap.Tab = Plugin;
    Bootstrap.Tab.Constructor = Tab;
    Element.prototype.Tab = Bootstrap.Tab;

    // TAB DATA-API
    // ============

    var clickHandler = function (e) {
        e.preventDefault()
        Plugin.call($(this), 'show')
    }

    $(document)
        .addNsEvent('click.bs.tab.data-api:relay([data-toggle="tab"])', clickHandler)
        .addNsEvent('click.bs.tab.data-api:relay([data-toggle="pill"])', clickHandler);
})();


/* ========================================================================
 * Bootstrap.ScrollSpy
 * ======================================================================== */

(function () {
    'use strict';

    // SCROLLSPY CLASS DEFINITION
    // ==========================

    function ScrollSpy(element, options)
    {
        this.$body = $(document.body);
        this.$scrollElement = $(element).match(document.body) ? $(window) : $(element);
        this.options = Object.merge({}, ScrollSpy.DEFAULTS, options);
        this.selector = (this.options.target || '') + ' .nav li > a';
        this.offsets = [];
        this.targets = [];
        this.activeTarget = null;
        this.scrollHeight = 0;

        this.$scrollElement.addEvent('scroll.bs.scrollspy', function(){ this.process()}.bind(this));
        this.refresh();
        this.process();
    }

    ScrollSpy.VERSION = '3.3.4';

    ScrollSpy.DEFAULTS = {
        offset: 10
    };

    ScrollSpy.prototype.getScrollHeight = function () {
        return this.$scrollElement.scrollHeight || Math.max(this.$body.scrollHeight, document.documentElement.scrollHeight)
    };

    ScrollSpy.prototype.refresh = function () {
        var that = this,
            offsetMethod = 'offset',
            offsetBase = 0;

        this.offsets = [];
        this.targets = [];
        this.scrollHeight = this.getScrollHeight();

        if (!isWindow(this.$scrollElement))
        {
            offsetMethod = 'position';
            offsetBase = this.$scrollElement.scrollTop;
        }

        this.$body.getElements(this.selector).each(function($el){
            $el = $($el);
            var href = $el.data('target') || $el.attr('href'),
                $href = /^#./.test(href) && $(href);

            return ($href && $href.isVisible() && [[$href[offsetMethod]().top + offsetBase, href]]) || null;
        })
            .sort(function(a, b) { return a - b })
            .each(function () {
                that.offsets.push(this[0]);
                that.targets.push(this[1]);
            });
    };

    ScrollSpy.prototype.process = function () {
        var scrollTop    = this.$scrollElement.scrollTop() + this.options.offset,
            scrollHeight = this.getScrollHeight(),
            maxScroll    = this.options.offset + scrollHeight - this.$scrollElement.height(),
            offsets      = this.offsets,
            targets      = this.targets,
            activeTarget = this.activeTarget,
            i;

        if (this.scrollHeight != scrollHeight)
            this.refresh();

        if (scrollTop >= maxScroll)
            return activeTarget != (i = targets[targets.length - 1]) && this.activate(i);

        if (activeTarget && scrollTop < offsets[0])
        {
            this.activeTarget = null;
            return this.clear();
        }

        for (i = offsets.length; i--;)
        {
            activeTarget != targets[i]
                && scrollTop >= offsets[i]
                && (offsets[i + 1] === undefined || scrollTop < offsets[i + 1])
                && this.activate(targets[i])
        }
    }

    ScrollSpy.prototype.activate = function(target) {
        this.activeTarget = target;

        this.clear();

        var selector = this.selector +
            '[data-target="' + target + '"],' +
            this.selector + '[href="' + target + '"]'

        var active = $$(selector).getParents('li').addClass('active');

        if (active.getParent('.dropdown-menu'))
            active = active.closest('li.dropdown').addClass('active');

        active.fireEvent('activate.bs.scrollspy')
    }

    ScrollSpy.prototype.clear = function () {
        $$(this.selector)
            .getParentsUntil(this.options.target, '.active')
            .removeClass('active')
    }


    // SCROLLSPY PLUGIN DEFINITION
    // ===========================

    function Plugin(option) {
        return function () {
            var $this = $(this)
            var data = $this.data('bs.scrollspy')
            var options = typeof option == 'object' && option

            if (!data) $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
            if (typeof option == 'string') data[option]()
        }.bind(this)();
    };

    Bootstrap.ScrollSpy = Plugin;
    Bootstrap.ScrollSpy.Constructor = ScrollSpy;

    // SCROLLSPY DATA-API
    // ==================

    $(window).addNsEvent('load.bs.scrollspy.data-api', function () {
        $$('[data-spy="scroll"]').each(function () {
            var $spy = $(this)
            Plugin.call($spy, $spy.data())
        });
    });

})();

/* ========================================================================
 * Bootstrap.Affix
 * ======================================================================== */
(function () {
    'use strict';

    // AFFIX CLASS DEFINITION
    // ======================

    var Affix = function (element, options) {
        this.options = Object.merge({}, Affix.DEFAULTS, options)

        this.$target = $(this.options.target)
          .addNsEvent('scroll.bs.affix.data-api', this.checkPosition.bind(this))
          .addNsEvent('click.bs.affix.data-api',  this.checkPositionWithEventLoop.bind(this))

        this.$element     = $(element)
        this.affixed      = null
        this.unpin        = null
        this.pinnedOffset = null

        this.checkPosition()
    };

    Affix.VERSION  = '1.0.0'

    Affix.RESET    = 'affix affix-top affix-bottom'

    Affix.DEFAULTS = {
      offset: 0,
      target: window
    }

    Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
        var scrollTop = this.$target.scrollTop(),
            position = this.$element.getOffsets(),
            targetHeight = this.$target.getHeight();

        if (offsetTop != null && this.affixed == 'top')
            return scrollTop < offsetTop ? 'top' : false;

        if (this.affixed == 'bottom') {
            if (offsetTop != null)
                return (scrollTop + this.unpin <= position.top) ? false : 'bottom';
            return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom';
        }

        var initializing = this.affixed == null,
            colliderTop = initializing ? scrollTop : position.top,
            colliderHeight = initializing ? targetHeight : height;

        if (offsetTop != null && scrollTop <= offsetTop)
            return 'top';
        if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom))
            return 'bottom';

        return false;
    }

    Affix.prototype.getPinnedOffset = function () {
        if (this.pinnedOffset)
            return this.pinnedOffset;
        this.$element.removeClass(Affix.RESET).addClass('affix');
        var scrollTop = this.$target.scrollTop();
        var position  = this.$element.getOffsets();
        return (this.pinnedOffset = position.top - scrollTop)
    }

    Affix.prototype.checkPositionWithEventLoop = function () {
        setTimeout(this.checkPosition.bind(this), 1)
    }

    Affix.prototype.checkPosition = function () {
        if (!this.$element.isVisible()) return;

        var height = this.$element.getHeight(),
            offset = this.options.offset,
            offsetTop = offset.top,
            offsetBottom = offset.bottom,
            scrollHeight = $(document.body).getHeight();

        if (typeof offset != 'object')
            offsetBottom = offsetTop = offset;
        if (typeof offsetTop == 'function')
            offsetTop = offset.top(this.$element);
        if (typeof offsetBottom == 'function')
            offsetBottom = offset.bottom(this.$element);

        var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom);

        if (this.affixed != affix)
        {
            if (this.unpin != null)
                this.$element.setStyle('top', '');

            var affixType = 'affix' + (affix ? '-' + affix : ''),
                e = $.Event(affixType + '.bs.affix');

            this.$element.fireEvent(e);

            if (e.defaultPrevented) return;

            this.affixed = affix;
            this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null;

            this.$element
                .removeClass(Affix.RESET)
                .addClass(affixType)
                .fireEvent(affixType.replace('affix', 'affixed') + '.bs.affix');
        }

        if (affix == 'bottom')
        {
            this.$element.offset({
                top: scrollHeight - height - offsetBottom
            });
        }
    }

    // AFFIX PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return function () {
            var $this = $(this)
            var data = $this.data('bs.affix')
            var options = typeof option == 'object' && option

            if (!data) $this.data('bs.affix', (data = new Affix(this, options)))
            if (typeof option == 'string') data[option]()
        }.bind(this)()
    }

    Bootstrap.Affix = Plugin;
    Bootstrap.Affix.Constructor = Affix;

    // AFFIX DATA-API
    // ==============

    $(window).addEvent('load', function () {
        $$('[data-spy="affix"]').each(function () {
            var $spy = $(this)
            var data = $spy.data()

            data.offset = data.offset || {}

            if (data.offsetBottom != null) data.offset.bottom = data.offsetBottom
            if (data.offsetTop != null) data.offset.top = data.offsetTop

            Plugin.call($spy, data)
        })
    })
})();

/* ========================================================================
 * Bootstrap.Carousel
 * ======================================================================== */
(function () {
    'use strict';

    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel = function(element, options) {
        this.$element     = $(element)
        this.$indicators  = this.$element.getElements('.carousel-indicators')
        this.options      = Object.merge({}, Carousel.DEFAULTS, options)
        this.paused       = null
        this.sliding      = null
        this.interval     = null
        this.$active      = null
        this.$items       = this.$element.getElements('.carousel-inner > .item')
		this.$items.each(function(el, i) {
			if ($(el)) el.set('data-index', i)
		})

        this.options.keyboard && this.$element.addNsEvent('keydown.bs.carousel', this.keydown.bind(this))

        this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
            .addNsEvent('mouseenter.bs.carousel', this.pause.bind(this))
            .addNsEvent('mouseleave.bs.carousel', this.cycle.bind(this))
    }

    Carousel.VERSION  = '1.0.0'

    Carousel.TRANSITION_DURATION = 600

    Carousel.DEFAULTS = {
      interval: 5000,
      pause: 'hover',
      wrap: true,
      keyboard: true
    }

    Carousel.prototype.keydown = function (e) {
        if (/input|textarea/i.test(e.target.tagName)) return
        switch (e.code) {
            case 37: this.prev(); break
            case 39: this.next(); break
            default: return
        }

        e.preventDefault()
    }

    Carousel.prototype.cycle = function (e) {
        e || (this.paused == false)

        this.interval && clearInterval(this.interval)

        this.options.interval
            && !this.paused
            && (this.interval = setInterval(function() { this.next() }.bind(this), this.options.interval))
    }

    Carousel.prototype.getItemIndex = function (item) {
		return $((item && item.length ? item[0] : item) || this.$active).get('data-index')
    }

    Carousel.prototype.getItemForDirection = function (direction, active) {
        var activeIndex = this.getItemIndex(active)
        var willWrap = (direction == 'prev' && activeIndex === 0)
                    || (direction == 'next' && activeIndex == (this.$items.length - 1))
        if (willWrap && !this.options.wrap) return active
        var delta = direction == 'prev' ? -1 : 1
        var itemIndex = (activeIndex + delta) % this.$items[0].length
        return this.$items[itemIndex]
    }

    Carousel.prototype.to = function (pos) {
        var that        = this
        var activeIndex = this.getItemIndex(this.$active = this.$element.getElements('.item.active'))

        if (pos > (this.$items[0].length - 1) || pos < 0) return

        if (this.sliding)
            return this.$element.one('slid.bs.carousel', function () { this.to(pos) }.bind(this)) // yes, "slid"
        if (activeIndex == pos)
            return this.pause().cycle()

        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items[pos])
    }

    Carousel.prototype.pause = function (e) {
        e || (this.paused = true)

        if (this.$element.getElements('.next, .prev').length && $.support.transition) {
          this.$element.fireEvent($_support.transition.end)
          this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    Carousel.prototype.next = function () {
        if (this.sliding) return
        return this.slide('next')
    }

    Carousel.prototype.prev = function () {
        if (this.sliding) return
        return this.slide('prev')
    }

    Carousel.prototype.slide = function (type, next) {
        var $active   = this.$element.getElements('.item.active')
        var $next     = next || this.getItemForDirection(type, $active)
        var isCycling = this.interval
        var direction = type == 'next' ? 'left' : 'right'

        if ($next.hasClass('active')) return (this.sliding = false)

        var relatedTarget = $next
        var slideEvent = new CustomEvent('slide.bs.carousel', { detail: { relatedTarget: relatedTarget, direction: direction } })
        this.$element.fireEvent(slideEvent)
        if (slideEvent.defaultPrevented) return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.getElements('.active').each(function(el) {
				el.removeClass('active')
			})
			var nextIndicatorIndex = this.getItemIndex($next)
            var $nextIndicator = this.$indicators[0].getChildren()[nextIndicatorIndex]
            $nextIndicator && $nextIndicator.addClass('active')
        }

        var slidEvent = new CustomEvent('slid.bs.carousel', { detail: { relatedTarget: relatedTarget, direction: direction } })
        if ($_support.transition && this.$element.hasClass('slide')) {
            $next.addClass(type)
            $next.offsetWidth
            $active.addClass(direction)
            $next.addClass(direction)
            $active
                .one('bsTransitionEnd', function () {
					console.log('bsTransitionEnd')
                    $next.removeClass([type, direction].join(' ')).addClass('active')
                    $active.removeClass([type, direction].join(' ')).removeClass('active')
                    this.sliding = false
                    setTimeout(function () {
						console.log('slid.bs.carousel')
                        this.$element.fireEvent(slidEvent)
                    }.bind(this), 0)
                }.bind(this))
                .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
        } else {
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.fireEvent(slidEvent)
        }

        isCycling && this.cycle()

        return this
    }

    // CAROUSEL PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return function () {
            var $this   = $(this)
            var data    = $this.retrieve('bs.carousel')
            var options = Object.merge({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action  = typeof option == 'string' ? option : options.slide

            if (!data) $this.store('bs.carousel', (data = new Carousel(this, options)))
            if (typeof option == 'number') data.to(option)
            else if (action) data[action]()
            else if (options.interval) data.pause().cycle()
        }.bind(this)()
    }

    Bootstrap.Carousel = Plugin;
    Bootstrap.Carousel.Constructor = Carousel;
    Element.implement('carousel', Plugin)

    // CAROUSEL DATA-API
    // =================

    var clickHandler = function (e) {
        var href
        var $this = $(this)
        var $target = $$($this.get('data-target') || (href = $this.get('href')) && href.replace(/.*(?=#[^\s]+$)/, ''))[0] // strip for ie7
        if (!$target.hasClass('carousel')) return
        var options = Object.merge({}, $target.data(), $this.data())
        var slideIndex = $this.get('data-slide-to')
        if (slideIndex) options.interval = false

        Plugin.call($target, options)

        if (slideIndex) {
            $target.retrieve('bs.carousel').to(slideIndex)
        }

        e.preventDefault()
    }

    $(document)
        .addNsEvent('click.bs.carousel.data-api:relay([data-slide])', clickHandler)
        .addNsEvent('click.bs.carousel.data-api:relay([data-slide-to])', clickHandler)

    window.addEvent('load', function () {
        $$('[data-ride="carousel"]').each(function (el) {
            var $carousel = $(el)
            Plugin.call($carousel, $carousel.data())
        })
    })
})();
