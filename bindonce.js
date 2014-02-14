(function ()
{
	"use strict";
	/**
	 * Bindonce - Zero watches binding for AngularJs
	 * @version v0.3.1
	 * @link https://github.com/Pasvaz/bindonce
	 * @author Pasquale Vazzana <pasqualevazzana@gmail.com>
	 * @license MIT License, http://www.opensource.org/licenses/MIT
	 */

	var bindonceModule = angular.module('pasvaz.bindonce', []);

	bindonceModule.directive('bindonce', function ()
	{
		var toBoolean = function (value)
		{
			if (value && value.length !== 0)
			{
				var v = angular.lowercase("" + value);
				value = !(v === 'f' || v === '0' || v === 'false' || v === 'no' || v === 'n' || v === '[]');
			}
			else
			{
				value = false;
			}
			return value;
		};

		var indexOf = function (array, obj)
		{
			if (array.indexOf) return array.indexOf(obj);

			for (var i = 0; i < array.length; i++)
			{
				if (obj === array[i]) return i;
			}
			return -1;
		}

		var msie = parseInt((/msie (\d+)/.exec(angular.lowercase(navigator.userAgent)) || [])[1], 10);
		if (isNaN(msie))
		{
			msie = parseInt((/trident\/.*; rv:(\d+)/.exec(angular.lowercase(navigator.userAgent)) || [])[1], 10);
		}

		var bindonceDirective =
		{
			restrict: "AM",
			controller: ['$scope', '$element', '$attrs', '$interpolate', function ($scope, $element, $attrs, $interpolate)
			{
				var showHideBinder = function (elm, attr, value)
				{
					var show = (attr === 'show') ? '' : 'none';
					var hide = (attr === 'hide') ? '' : 'none';
					elm.css('display', toBoolean(value) ? show : hide);
				};

				var classBinder = function (elm, value)
				{
					if (angular.isObject(value) && !angular.isArray(value))
					{
						var results = [];
						angular.forEach(value, function (value, index)
						{
							if (value) results.push(index);
						});
						value = results;
					}
					if (value)
					{
						elm.addClass(angular.isArray(value) ? value.join(' ') : value);
					}
				};

				var transclude = function (transcluder, scope)
				{
					transcluder.transclude(scope, function (clone)
					{
						var parent = transcluder.element.parent();
						var afterNode = transcluder.element && transcluder.element[transcluder.element.length - 1];
						var parentNode = parent && parent[0] || afterNode && afterNode.parentNode;
						var afterNextSibling = (afterNode && afterNode.nextSibling) || null;
						angular.forEach(clone, function (node)
						{
							parentNode.insertBefore(node, afterNextSibling);
						});
					});
				};


				var ctrl =
				{
					watcherRemover: undefined,
					queue: [],
					refreshQueue: [],
					group: $attrs.boName,
					element: $element,
					refreshing: false,
					isReady: false,
					oneWatcher: false,
					keepBinders: false,

					ready: function ()
					{
						console.log('Ready to go', this.queue);
						this.isReady = true;
						this.runBinders();
						if (this.refreshOn)
						{
							$scope.$on(this.refreshOn, this.refresher)
						}
					},

					addBinder: function (binder)
					{
						if (this.group && this.group != binder.group) return;

						console.log('Adding', binder, ' to ', this.queue);
						this.queue.push(binder);
						if (!this.isReady || this.queue.length > 1) return;

						this.runBinders();
					},

					setupWatcher: function (bindonceValue)
					{
						var that = this;
						this.watcherRemover = $scope.$watch(bindonceValue, function (newValue)
						{
							if (newValue === undefined) return;
							console.log('Ran from Watcher');

							!that.oneWatcher && that.removeWatcher();

							if (!that.isReady)
							{
								that.checkBindonce(newValue);
							}
							else
							{
								that.refresher();
							}
						}, true);
					},

					checkBindonce: function (value)
					{
						var that = this, promise = (value.$promise) ? value.$promise.then : value.then;
						// since Angular 1.2 promises are no longer 
						// undefined until they don't get resolved
						if (typeof promise === 'function')
						{
							promise(function ()
							{
								that.ready();
							});
						}
						else
						{
							that.ready();
						}
					},

					removeWatcher: function ()
					{
						if (this.watcherRemover !== undefined)
						{
							this.watcherRemover();
							this.watcherRemover = undefined;
						}
					},

					runBinders: function ()
					{
						while (this.queue.length > 0)
						{
							var binder = this.queue.shift();
							if (!binder.dead)
								this.runBinder(binder);

							if (this.keepBinders)
							{
								this.refreshQueue.push(binder);
								binder.stopRefresh = function ()
								{
									console.log('Destroy stopRefresh', binder);
									ctrl.refreshQueue[indexOf(ctrl.refreshQueue, binder)] = null;
								}
							}
							console.log('after adding', binder, this.keepBinders, this.refreshQueue);
						};
					},

					runBinder: function (binder)
					{
						console.log('Binder is', binder);
						var value = binder.scope.$eval((binder.interpolate) ? $interpolate(binder.value) : binder.value);
						switch (binder.attr)
						{
							case 'boIf':
								if (toBoolean(value))
								{
									transclude(binder, (binder.attrs.boNoScope) ? binder.scope : binder.scope.$new());
								}
								break;
							case 'boSwitch':
								var selectedTranscludes, switchCtrl = binder.controller[0];
								if ((selectedTranscludes = switchCtrl.cases['!' + value] || switchCtrl.cases['?']))
								{
									binder.scope.$eval(binder.attrs.change);
									var scope = (binder.attrs.boNoScope) ? binder.scope : binder.scope.$new();
									angular.forEach(selectedTranscludes, function (selectedTransclude)
									{
										transclude(selectedTransclude, scope);
									});
								}
								break;
							case 'boSwitchWhen':
								var ctrl = binder.controller[0];
								ctrl.cases['!' + binder.attrs.boSwitchWhen] = (ctrl.cases['!' + binder.attrs.boSwitchWhen] || []);
								ctrl.cases['!' + binder.attrs.boSwitchWhen].push({ transclude: binder.transclude, element: binder.element });
								break;
							case 'boSwitchDefault':
								var ctrl = binder.controller[0];
								ctrl.cases['?'] = (ctrl.cases['?'] || []);
								ctrl.cases['?'].push({ transclude: binder.transclude, element: binder.element });
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
							case 'src':
								binder.element.attr(binder.attr, value);
								if (msie) binder.element.prop('src', value);
								break;
							case 'attr':
								angular.forEach(binder.attrs, function (attrValue, attrKey)
								{
									var newAttr, newValue;
									if (attrKey.match(/^boAttr./) && binder.attrs[attrKey])
									{
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
						};

						// TODO: avoid runBinder if the value doesn't change
						binder.lastValue = value;
					},

					// temporary code, I know it sucks... don't blame me
					refresher: function ()
					{
						console.log('Refresh requested $on', ctrl);
						if (ctrl.refreshing)
						{
							console.log('Refresh already in progress');
							return;
						}

						// <drunk>
						ctrl.refreshing = true;
						var i, max = ctrl.refreshQueue.length;
						for (i = 0; i < max; i++)
						{
							var binder = ctrl.refreshQueue[i];
							if (!binder.dead) // it should never happens
								ctrl.runBinder(binder);
						};
						ctrl.refreshing = false;
						// </drunk>
					}
				};

				return ctrl;
			}],

			link: function (scope, elm, attrs, bindonceController)
			{
				var value = attrs.bindonce && scope.$eval(attrs.bindonce);
				bindonceController.oneWatcher = attrs.hasOwnProperty('oneWatcher');
				bindonceController.refreshOn = attrs.refreshOn && scope.$eval(attrs.refreshOn);
				bindonceController.keepBinders = bindonceController.oneWatcher || bindonceController.refreshOn;

				if (value !== undefined)
				{
					bindonceController.checkBindonce(value);
				}
				else
				{
					bindonceController.setupWatcher(attrs.bindonce);
					elm.bind("$destroy", bindonceController.removeWatcher);
				}
			}
		};

		return bindonceDirective;
	});

	angular.forEach(
	[
		{ directiveName: 'boShow', attribute: 'show' },
		{ directiveName: 'boHide', attribute: 'hide' },
		{ directiveName: 'boClass', attribute: 'class' },
		{ directiveName: 'boText', attribute: 'text' },
		{ directiveName: 'boBind', attribute: 'text' },
		{ directiveName: 'boHtml', attribute: 'html' },
		{ directiveName: 'boSrcI', attribute: 'src', interpolate: true },
		{ directiveName: 'boSrc', attribute: 'src' },
		{ directiveName: 'boHrefI', attribute: 'href', interpolate: true },
		{ directiveName: 'boHref', attribute: 'href' },
		{ directiveName: 'boAlt', attribute: 'alt' },
		{ directiveName: 'boTitle', attribute: 'title' },
		{ directiveName: 'boId', attribute: 'id' },
		{ directiveName: 'boStyle', attribute: 'style' },
		{ directiveName: 'boValue', attribute: 'value' },
		{ directiveName: 'boAttr', attribute: 'attr' },

		{ directiveName: 'boIf', transclude: 'element', terminal: true, priority: 1000 },
		{ directiveName: 'boSwitch', require: 'boSwitch', controller: function () { this.cases = {}; } },
		{ directiveName: 'boSwitchWhen', transclude: 'element', priority: 800, require: '^boSwitch', },
		{ directiveName: 'boSwitchDefault', transclude: 'element', priority: 800, require: '^boSwitch', }
	],
	function (boDirective)
	{
		var childPriority = 200;
		return bindonceModule.directive(boDirective.directiveName, function ()
		{
			var bindonceDirective =
			{
				priority: boDirective.priority || childPriority,
				transclude: boDirective.transclude || false,
				terminal: boDirective.terminal || false,
				require: ['^bindonce'].concat(boDirective.require || []),
				controller: boDirective.controller,
				compile: function (tElement, tAttrs, transclude)
				{
					return function (scope, elm, attrs, controllers)
					{
						var bindonceController = controllers[0];

						// TODO: document this feature: bo-parent
						var name = attrs.boParent;
						if (name && bindonceController.group !== name)
						{
							var elementParent = bindonceController.element.parent();
							bindonceController = undefined;
							var parentController;

							while (elementParent[0].nodeType !== 9 && elementParent.length)
							{
								if ((parentController = elementParent.data('$bindonceController'))
									&& parentController.group === name)
								{
									bindonceController = parentController;
									break;
								}
								elementParent = elementParent.parent();
							}
							if (!bindonceController)
							{
								throw new Error("No bindonce controller: " + name);
							}
						}

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
						var binderDestroy = function ()
						{
							console.log('Destroying', binder);
							if (binder != null)
							{
								binder.dead = true;
								binder.stopRefresh && binder.stopRefresh();
								binder = null;
							}
						}

						bindonceController.addBinder(binder);
						//scope.$on('$destroy', binderDestroy);
						elm.bind('$destroy', binderDestroy);
					}
				}
			};

			return bindonceDirective;
		});
	})
})();