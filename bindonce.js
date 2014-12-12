(function (angular) {
    "use strict";
    /**
     * Bindonce - Zero watches binding for AngularJs
     * @version v0.3.3
     * @link https://github.com/Pasvaz/bindonce
     * @author Pasquale Vazzana <pasqualevazzana@gmail.com>
     * @license MIT License, http://www.opensource.org/licenses/MIT
     */

    var bindonceModule = angular.module('pasvaz.bindonce', []);

    bindonceModule.directive('bindonce', function () {
        var toBoolean = function (value) {
            if (value && value.length !== 0) {
                var v = angular.lowercase("" + value);
                value = !(v === 'f' || v === '0' || v === 'false' || v === 'no' || v === 'n' || v === '[]');
            } else {
                value = false;
            }
            return value;
        };

        var indexOf = function (array, obj) {
            if (array.indexOf) {
                return array.indexOf(obj);
            }

            for (var i = 0; i < array.length; i++) {
                if (obj === array[i]) {
                    return i;
                }
            }
            return -1;
        };

        var msie = parseInt((/msie (\d+)/.exec(angular.lowercase(navigator.userAgent)) || [])[1], 10);
        if (isNaN(msie)) {
            msie = parseInt((/trident\/.*; rv:(\d+)/.exec(angular.lowercase(navigator.userAgent)) || [])[1], 10);
        }

        var bindonceDirective = {
            restrict: "AM",
            controller: ['$scope', '$element', '$attrs', '$interpolate',
                function ($scope, $element, $attrs, $interpolate)
                {
                    var showHideBinder = function (elm, attr, value) {
                        var show = (attr === 'show') ? '' : 'none';
                        var hide = (attr === 'hide') ? '' : 'none';
                        elm.css('display', toBoolean(value) ? show : hide);
                    };

                    var classBinder = function (elm, value) {
                        var removals = [];
                        if (angular.isObject(value) && !angular.isArray(value)) {
                            var additions = [];
                            angular.forEach(value, function (value, index) {
                                if (value) {
                                    additions.push(index);
                                } else {
                                    removals.push(index);
                                }
                            });
                        }
                        if (additions) {
                            elm.addClass(angular.isArray(value) ? value.join(' ') : value);
                        }
                        if (removals.length > 0) {
                            elm.removeClass(removals.join(' '));
                        }
                    };

                    var transclude = function (binder, newScope, saveNodes) {
                        console.log('transclude');
                        if (newScope) {
                            binder.newScope = binder.scope.$new();
                        }
                        binder.transclude((binder.newScope || binder.scope), function (clone) {
                            if (saveNodes) {
                                binder.nodes = binder.nodes || [];
                            }
                            var parent = binder.element.parent();
                            var afterNode = binder.element && binder.element[binder.element.length - 1];
                            var parentNode = parent && parent[0] || afterNode && afterNode.parentNode;
                            var afterNextSibling = (afterNode && afterNode.nextSibling) || null;
                            // console.log('running Transclude', clone, binder, parent, parentNode);
                            angular.forEach(clone, function (node) {
                                parentNode.insertBefore(node, afterNextSibling);
                                saveNodes && binder.nodes.push(node);
                            });
                        });
                    };


                    var ctrl = {
                        watcherRemover: undefined,
                        queue: [],
                        refreshQueue: [],
                        group: $attrs.boName,
                        element: $element,
                        refreshing: false,
                        isReady: false,
                        oneWatcher: false,
                        keepBinders: false,

                        ready: function () {
                            //console.log('Ready to go', this.queue);
                            this.isReady = true;
                            this.runBinders();
                            this.refreshOn && $scope.$on(this.refreshOn, this.refresher);
                        }.bind(this),

                        addBinder: function (binder) {
                            if (this.group && this.group != binder.group) {
                                return;
                            }

                            //console.log('Adding', binder, ' to ', this.queue);
                            this.queue.push(binder);
                            if (!this.isReady || this.queue.length > 1) {
                                //console.log("not running binders", this.isReady, this.queue.length);
                                //console.log(this);
                                //console.log(ctrl);
                                return;
                            }
                            //console.log("about to run binders");
                            this.runBinders();
                        }.bind(this),

                        setupWatcher: function (bindonceValue) {
                            this.watcherRemover = $scope.$watch(bindonceValue, function (newValue) {
                                if (newValue === undefined) {
                                    return;
                                }
                                //console.log('Ran from Watcher');

                                !this.oneWatcher && this.removeWatcher();

                                if (!this.isReady) {
                                    this.checkBindonce(newValue);
                                } else {
                                    this.refresher();
                                }
                            }, true);
                        }.bind(this),

                        checkBindonce: function (value) {
                            var promise = (value.$promise) ? value.$promise.then : value.then;
                            // since Angular 1.2 promises are no longer
                            // undefined until they don't get resolved
                            if (typeof promise === 'function') {
                                promise(this.ready);
                            } else {
                                this.ready();
                            }
                        }.bind(this),

                        removeWatcher: function () {
                            if (this.watcherRemover !== undefined) {
                                this.watcherRemover();
                                this.watcherRemover = undefined;
                            }
                        }.bind(this),

                        destroy: function () {
                            this.queue = [];
                            this.refreshQueue = [];
                            this.element = undefined;
                            this.removeWatcher();
                        }.bind(this),

                        runBinders: function () {
                            //console.log('runBinders');
                            while (this.queue.length > 0) {
                                var binder = this.queue.shift();
                                if (!binder.dead) {
                                    var value = binder.scope.$eval((binder.interpolate) ? $interpolate(binder.value) : binder.value);
                                    //console.log(value);
                                    this.runBinder(binder, value);

                                    if (this.keepBinders) {
                                        this.refreshQueue.push(binder);
                                        binder.stopRefresh = function () {
                                            //console.log('Destroy stopRefresh', binder);
                                            this.refreshQueue[indexOf(this.refreshQueue, binder)] = null;
                                        }.bind(this);
                                    }
                                }
                                // console.log('after adding', binder, this.keepBinders, this.refreshQueue);
                            }
                        }.bind(this),

                        runBinder: function (binder, value) {
                            //console.log('Binder is', binder, value, binder.value);
                            switch (binder.attr) {
                            case 'boIf':
                                if (toBoolean(value)) {
                                    transclude(binder, !binder.attrs.boNoScope, this.keepBinders);
                                }
                                break;
                            case 'boSwitch':
                                //if (binder.lastValue && binder.lastValue === value) return;
                                //if (binder.selectedBinders)
                                //{
                                //	angular.forEach(binder.selectedBinders, function (selectedTransclude)
                                //	{
                                //		if (selectedTransclude.scope)
                                //		{
                                //			// console.log('deleting selectedTransclude', selectedTransclude);
                                //			if (!binder.attrs.boNoScope) selectedTransclude.scope.$destroy();
                                //			//selectedTransclude.element.remove();
                                //			angular.forEach(selectedTransclude.nodes, function (node)
                                //			{
                                //				node.remove();
                                //			});
                                //			delete selectedTransclude.element;
                                //			delete selectedTransclude.nodes;
                                //			delete selectedTransclude.transclude;
                                //			delete selectedTransclude.scope;
                                //		}
                                //	});
                                //	delete binder.selectedBinders;
                                //}
                                var switchCtrl = binder.controller[0];
                                if ((binder.selectedBinders = switchCtrl.cases['!' + value] || switchCtrl.cases['?'])) {
                                    binder.scope.$eval(binder.attrs.change); //TODO: document ng-change on bo-switch
                                    angular.forEach(binder.selectedBinders, function (selectedBinder) {
                                        if (selectedBinder.element) {
                                            transclude(selectedBinder, !binder.attrs.boNoScope, this.keepBinders);
                                            // console.log('created selectedBinder', selectedBinder);
                                        }
                                    }.bind(this));
                                }
                                break;
                            case 'boSwitchWhen':
                                var switchCtrl = binder.controller[0];
                                switchCtrl.cases['!' + binder.attrs.boSwitchWhen] = (switchCtrl.cases['!' + binder.attrs.boSwitchWhen] || []);
                                //if (indexOf(switchCtrl.cases['!' + binder.attrs.boSwitchWhen], binder) < 0)
                                switchCtrl.cases['!' + binder.attrs.boSwitchWhen].push(binder);
                                // console.debug('Added case ' + binder.attrs.boSwitchWhen, switchCtrl.cases)
                                //switchCtrl.cases['!' + binder.attrs.boSwitchWhen].push({ transclude: binder.transclude, element: binder.element });
                                break;
                            case 'boSwitchDefault':
                                var switchCtrl = binder.controller[0];
                                switchCtrl.cases['?'] = (switchCtrl.cases['?'] || []);
                                //if (indexOf(switchCtrl.cases['?'], binder) < 0)
                                switchCtrl.cases['?'].push(binder);
                                // console.debug('Added case default', switchCtrl.cases)
                                //switchCtrl.cases['?'].push({ transclude: binder.transclude, element: binder.element });
                                break;
                            case 'hide':
                            case 'show':
                                showHideBinder(binder.element, binder.attr, value);
                                break;
                            case 'class':
                                classBinder(binder.element, value);
                                break;
                            case 'text':
                                binder.element.text(value);
                                break;
                            case 'html':
                                binder.element.html(value);
                                break;
                            case 'style':
                                binder.element.css(value);
                                break;
                            case 'disabled':
                                binder.element.prop('disabled', value);
                                break;
                            case 'src':
                                binder.element.attr(binder.attr, value);
                                if (msie) {
                                    binder.element.prop('src', value);
                                }
                                break;
                            case 'attr':
                                angular.forEach(binder.attrs, function (attrValue, attrKey) {
                                    var newAttr, newValue;
                                    if (attrKey.match(/^boAttr./) && binder.attrs[attrKey]) {
                                        newAttr = attrKey.replace(/^boAttr/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                                        newValue = binder.scope.$eval(binder.attrs[attrKey]);
                                        binder.element.attr(newAttr, newValue);
                                    }
                                });
                                break;
                            case 'href':
                            case 'alt':
                            case 'title':
                            case 'id':
                            case 'value':
                                binder.element.attr(binder.attr, value);
                                break;
                            }

                            // TODO: avoid runBinder if the value doesn't change
                            binder.lastValue = value;
                        }.bind(this),

                        destroyBinder: function (binder, value) {
                            var cleanSwtichCases = function (binder, cases) {
                                for (var i = 0; i < cases.length; i++) {
                                    var switchCase = cases[i];
                                    if (switchCase === binder) {
                                        // console.debug('Removing Switch case ' + switchCase.lastValue, switchCase, 'from', cases);
                                        cases.splice(i);
                                        cleanNodes(switchCase);
                                        break;
                                    }
                                }
                            };
                            var cleanNodes = function (binder) {
                                binder.newScope && binder.newScope.$destroy();
                                delete binder.newScope;
                                angular.forEach(binder.nodes, function (node) {
                                    // console.debug('Deleting node', node, 'from', binder.nodes, binder.element);
                                    node.remove();
                                });
                                delete binder.nodes;
                            };

                            // console.log('Destroying Binder', binder, value, binder.value);
                            switch (binder.attr) {
                            case 'boIf':
                                cleanNodes(binder);
                                break;
                            case 'boSwitch':
                                //if (binder.lastValue && binder.lastValue === value) return;
                                if (binder.selectedBinders) {
                                    //angular.forEach(binder.selectedBinders, function (selectedTransclude)
                                    //{
                                    //	// console.log('deleting selectedTransclude', selectedTransclude);
                                    //});
                                    delete binder.selectedBinders;
                                }
                                break;
                            case 'boSwitchWhen':
                                var switchCtrl = binder.controller[0];
                                var cases = switchCtrl.cases['!' + binder.attrs.boSwitchWhen] || [];
                                cleanSwtichCases(binder, cases);
                                break;
                            case 'boSwitchDefault':
                                var switchCtrl = binder.controller[0];
                                var cases = switchCtrl.cases['?'] || [];
                                cleanSwtichCases(binder, cases);
                                break;
                            }
                        }.bind(this),

                        // temporary code, I know it sucks... don't blame me
                        refresher: function () {
                            //console.log('Refresh requested $on', this);
                            if (this.refreshing) {
                                console.log('Refresh already in progress');
                                return;
                            }

                            // <drunk>
                            this.refreshing = true;
                            var i, max = this.refreshQueue.length;
                            for (i = 0; i < max; i++) {
                                //console.log('Going to refresh', binder, ctrl.refreshQueue);
                                var binder = this.refreshQueue[i];
                                if (binder && !binder.dead) // it should never happens
                                {
                                    // TODO: lastValue check goes here
                                    var value = binder.scope.$eval((binder.interpolate) ? $interpolate(binder.value) : binder.value);
                                    this.destroyBinder(binder, value);
                                    this.runBinder(binder, value);
                                }
                            }
                            this.refreshing = false;
                            // </drunk>
                        }.bind(this)
                    };

                    angular.extend(this, ctrl);
   }],

            link: function (scope, elm, attrs, bindonceController) {
                var value = attrs.bindonce && scope.$eval(attrs.bindonce);
                bindonceController.oneWatcher = attrs.hasOwnProperty('oneWatcher');
                /*if (attrs.refreshOn) {
                    console.log('refreshOn:', attrs.refreshOn);
                    console.log(attrs.refreshOn);
                    console.log(scope.$eval(attrs.refreshOn));
                }*/
                bindonceController.refreshOn = attrs.refreshOn && scope.$eval(attrs.refreshOn);
                bindonceController.keepBinders = bindonceController.oneWatcher || bindonceController.refreshOn;

                if (value !== undefined) {
                    bindonceController.checkBindonce(value);
                } else {
                    bindonceController.setupWatcher(attrs.bindonce);
                }
                elm.bind("$destroy", bindonceController.destroy);
            }
        };

        return bindonceDirective;
    });

    angular.forEach(
 [
            {
                directiveName: 'boShow',
                attribute: 'show'
            },
            {
                directiveName: 'boHide',
                attribute: 'hide'
            },
            {
                directiveName: 'boClass',
                attribute: 'class'
            },
            {
                directiveName: 'boText',
                attribute: 'text'
            },
            {
                directiveName: 'boBind',
                attribute: 'text'
            },
            {
                directiveName: 'boHtml',
                attribute: 'html'
            },
            {
                directiveName: 'boSrcI',
                attribute: 'src',
                interpolate: true
            },
            {
                directiveName: 'boSrc',
                attribute: 'src'
            },
            {
                directiveName: 'boHrefI',
                attribute: 'href',
                interpolate: true
            },
            {
                directiveName: 'boHref',
                attribute: 'href'
            },
            {
                directiveName: 'boAlt',
                attribute: 'alt'
            },
            {
                directiveName: 'boTitle',
                attribute: 'title'
            },
            {
                directiveName: 'boId',
                attribute: 'id'
            },
            {
                directiveName: 'boStyle',
                attribute: 'style'
            },
            {
                directiveName: 'boDisabled',
                attribute: 'disabled'
            },
            {
                directiveName: 'boValue',
                attribute: 'value'
            },
            {
                directiveName: 'boAttr',
                attribute: 'attr'
            },

            {
                directiveName: 'boIf',
                transclude: 'element',
                terminal: true,
                priority: 1000
            },
            {
                directiveName: 'boSwitch',
                require: 'boSwitch',
                controller: function () {
                    this.cases = {};
                }
            },
            {
                directiveName: 'boSwitchWhen',
                transclude: 'element',
                priority: 800,
                require: '^boSwitch',
            },
            {
                directiveName: 'boSwitchDefault',
                transclude: 'element',
                priority: 800,
                require: '^boSwitch',
            }
 ],
        function (boDirective) {
            var childPriority = 200;
            return bindonceModule.directive(boDirective.directiveName, function () {
                var bindonceDirective = {
                    priority: boDirective.priority || childPriority,
                    transclude: boDirective.transclude || false,
                    terminal: boDirective.terminal || false,
                    require: ['^bindonce'].concat(boDirective.require || []),
                    controller: boDirective.controller,
                    compile: function (tElement, tAttrs, transclude) {
                        return function (scope, elm, attrs, controllers) {
                            //console.log('bindonce directive compile start');
                            var bindonceController = controllers[0];

                            // TODO: document this feature: bo-parent
                            var name = attrs.boParent;
                            if (name && bindonceController.group !== name) {
                                var elementParent = bindonceController.element.parent();
                                bindonceController = undefined;
                                var parentController;

                                while (elementParent[0].nodeType !== 9 && elementParent.length) {
                                    if ((parentController = elementParent.data('$bindonceController')) && parentController.group === name) {
                                        bindonceController = parentController;
                                        break;
                                    }
                                    elementParent = elementParent.parent();
                                }
                                if (!bindonceController) {
                                    throw new Error("No bindonce controller: " + name);
                                }
                            }
                            // END bo-parent

                            var binder = {
                                element: elm,
                                attr: boDirective.attribute || boDirective.directiveName,
                                attrs: attrs,
                                value: attrs[boDirective.directiveName],
                                interpolate: boDirective.interpolate,
                                group: name,
                                transclude: transclude,
                                controller: controllers.slice(1),
                                scope: scope
                            };

                            // TODO: improve the the garbage collection
                            // this whole part must be rewritten
                            var binderDestroy = function () {
                                //console.warn('Destroying', binder);
                                if (binder !== null) {
                                    binder.dead = true;
                                    binder.stopRefresh && binder.stopRefresh();
                                    binder.scope = binder.element = binder.transclude = undefined;
                                    delete binder.nodes;
                                    binder = null;
                                }
                            };

                            bindonceController.addBinder(binder);
                            //scope.$on('$destroy', binderDestroy);
                            elm.bind('$destroy', binderDestroy);
                            //console.log('bindonce directive compile end');
                        };
                    }
                };

                return bindonceDirective;
            });
        });
})(angular);