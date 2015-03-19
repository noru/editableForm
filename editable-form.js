/* =========================================================
 * editable-form.js/css (beta)
 * =========================================================
 * This is jQuery plug-in started by Anderson Xiu. It is 
 * used for create a simple form that supports edit/display 
 * mode, save/cancel actions, input check, and extension
 * points.
 * ========================================================= */

(function ($) {
    'use strict';
    $.fn.extend({
        editableForm: function (opt) {
            if (this.hasClass('editable-form')) {
                return this.data('instance')(arguments);
            }
            this.addClass('editable-form');
            var busy = $('<div class="busy-mask"><div class="busy-indicator"></div>'),
                required = $('<span class="required" style="color: red; vertical-align: initial;">•</span>'),
                messageBox = $('<div class="message-box"></div>'),
                mode = { 'editable': 'editable', 'readonly': 'readonly' },
                toggle = { 'visible': 'visible', 'enable':'enable'},
                // default options
                defaults = {
                    mode: mode.readonly,
                    toggle: toggle.visible,
                    onEdit: null,
                    onCancel: null,
                    onToggle: null,
                    onSubmit: null,
                    onCheckBeforeSubmit: null
                };
            opt = $.extend(defaults, opt);

            // private function
            function _toggle(actions) {
                var toggleActions;
                if (Array.isArray(actions)){
                    toggleActions = actions;
                } else {
                    toggleActions = actions.editActions.concat(actions.readOnlyActions);
                }
                function toggler (toggleMode) {
                    toggleActions.forEach(function (e, i, a) {
                        if (toggleMode == toggle.visible) {
                            a[i].toggle();
                        } else {
                            a[i].prop('disabled', 'disabled').toggelClass("disabled");
                        }
                    })
                };
                toggler(opt.toggle);
            }

            //Main function
            this.each(function () {

                var $form = $(this).data('mode', mode.readonly),
                    $extraToggleElements = $form.find('.editable-form-extra-toggle'),
                    $inputs = $form.find('input.editable-form-input, textarea').prop('disabled', 'disabled').focus(function () { $('#message-box-' + this.id).fadeOut('slow', function () { this.remove()}); }), // initial state

                    toggle = $form.find('.editable-form-toggle').click(function () {
                        $form.trigger('formtoggle');
                    }),
                    edit = $form.find('.editable-form-edit').click(function () {
                        $form.trigger('formedit');
                    }),
                    cancel = $form.find('.editable-form-cancel').click(function () {
                        $form.trigger('formdisplay');
                    }),
                    submit = $form.find('.editable-form-submit').click(function () {
                        $form.trigger('formsubmit');
                    }),
                    actions = {
                        editActions: [],
                        readOnlyActions: [],
                        nuetralActions: [],
                        customActions: []
                    },
                    oldValues = _cacheOldValues();

                actions.editActions.push(submit, cancel);
                actions.readOnlyActions.push(edit);
                actions.nuetralActions.push(toggle);
                opt.customActions && actions.customActions.push(opt.customActions);
                _toggle(actions.editActions); // set initial state

                //Events
                $form.bind('formtoggle', function (e, form) {
                    if(_onToggle(actions)) return;
                    $form.data('mode', $form.data('mode') == mode.editable ? mode.readonly : mode.editable);
                    $inputs.prop('disabled', function (i, v) { return !v; });
                    $extraToggleElements.toggle();
                });
                $(this).bind('formedit', function (e, form) {
                    _onEdit(actions);
                    if ($form.data('mode') == mode.readonly){
                        $form.trigger('formtoggle');
                    }
                });
                $(this).bind('formdisplay', function (e, form) {
                    if(_onCancel(actions)) return;
                    if ($form.data('mode') == mode.editable){
                        $form.trigger('formtoggle');
                    }
                });
                $(this).bind('formsubmit', function (e, form) {
                    if ($form.data('mode') == mode.readonly) return;
                    if (!_checkBeforeSubmit()) return;
                    _onSubmit(actions); // deferred action
                });

                // Clear password text when its assosiated field changed
                $inputs.filter('[data-aea-form-password-for]').each(function () {
                    var password = this;
                    function clear() {
                        password.value = "";
                    }
                    function keyCodeInRange(i) {
                        // following numbers are keycode of all characters on keyboard, and backspace/delete/space
                        return i == 8 || i == 32 || i == 46 || (48 <= i && i <= 90) || (96 <= i && i <= 111) || (186 <= i && i <= 222);
                    }
                    $('input#' + $(this).data('aea-form-password-for')).keydown(function (evt) {
                        if (keyCodeInRange(evt.keyCode)) {
                            clear();
                        }
                    }).change(clear);
                });
                
                // Elements Initialization
                $form.find('.required').prev().append(required);
                if (opt.mode == mode.editable) {
                    $form.trigger('formedit');
                }



                // Internal functions
                function _onEdit(actions) {
                    if (!opt.onEdit || ( opt.onEdit && opt.onEdit(actions))) {
                        // TBD
                    }
                }
                function _onCancel(actions) {
                    $form.find('.message-box').remove();
                    if (!opt.onCancel || (opt.onCancel && opt.onCancel(actions))) {
                        // set the oringnal values back to the input elements
                        $inputs.each(function (i, o) {
                            if (o.type == 'radio' || o.type == 'checkbox') {
                                $(o).prop('checked', oldValues[i]);
                            } else {
                                o.value = oldValues[i];
                            }
                        });
                    } else {
                        return true;
                    }
                }
                function _onToggle(actions) {
                    //TBD
                    opt.onToggle && opt.onToggle(actions);
                    _toggle(actions)
                }
                function _onSubmit(actions) {
                    //before submit, TBD
                    $form.find('.message-box').remove();
                    if (opt.onSubmit) {
                        var defer = $.Deferred(function (defer) {
                                        $form.prepend(busy.height($form.height()).width($form.width()));
                                        opt.onSubmit(defer);
                                    })
                                     .done(function () {
                                         oldValues = _cacheOldValues();
                                         $form.trigger('formtoggle');
                                     })
                                     .fail(function () {

                                     })
                                     .always(function () {
                                         busy.remove();
                                     });
                    }
                }
                function _checkBeforeSubmit() {
                    var pass = true;
                    $inputs.filter('.required').each(function () {
                        if (!this.value || !this.value.trim()) {
                            _highlightInput(this);
                            pass = false;
                        }
                    })
                    // implement other check
                    if (opt.onCheckBeforeSubmit) {
                        pass = onCheckBeforeSubmit($inputs);
                    }

                    return pass;
                }

                function _cacheOldValues() {
                    return $inputs.map(function (i, o) {
                        if (o.type == 'radio' || o.type == 'checkbox') {
                            return o.checked;
                        }
                        return o.value;
                    });
                }
                function _getMessageBox(o, msg) {
                    var m = messageBox.clone()
                            .append(msg ? msg : "")
                            .click(function () { $(this).fadeOut('slow', function () { this.remove(); });})
                            .prop('id', 'message-box-' + o.id);
                    var $o = $(o);
                    $o.parent().append(m);
                    var top = o.offsetTop - m.height() + 'px', left = o.offsetLeft + o.offsetWidth - 10 + 'px';
                    m.css({ 'top': top, 'left': left });
                }
                function _highlightInput(arg, message) {
                    if (!arg) return;
                    var targets;
                    if (typeof arg === 'string') { // input element id
                        targets = $inputs.filter('#' + arg);
                    } 
                    if (typeof arg === 'object') {
                        if (Array.isArray(arg) && typeof arg[0] === 'string') {
                            arg.forEach(function (o,i) { _highlightInput(o, message[i]) });
                            return;
                        }
                        targets = $(arg);
                    }
                    if (message) {
                        targets.each(function (i, o) {
                            _getMessageBox(o, Array.isArray(message) ? message[i] : message);
                        });
                    }
                    targets && targets.addClass('invalid') && setTimeout(function () { targets.removeClass('invalid'); }, 500);
                }
                function entrance(args) {
                    switch (args[0]) {
                        case 'highlightInput':
                            _highlightInput(args[1], args[2]);
                            break;
                    // todo, implement other functions
                    }
                }
                // save a function as a entrance to this closure
                $form.data('instance', entrance);

            });

        }
    });
})(jQuery);
