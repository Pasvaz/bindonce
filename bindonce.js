'use strict';
/**
 * Bindonce - Zero watches binding for AngularJs
 * @version v0.1.0 - 2013-05-07
 * @link https://github.com/Pasvaz/bindonce
 * @author Pasquale Vazzana <pasqualevazzana@gmail.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

angular.module('pasvaz.bindonce', [])

.directive('bindonce', function() {
	var toBoolean = function(value) {
		if (value && value.length !== 0) {
			var v = angular.lowercase("" + value);
			value = !(v == 'f' || v == '0' || v == 'false' || v == 'no' || v == 'n' || v == '[]');
		} else {
			value = false;
		}
		return value;
	}

	return {
		restrict: "A",
		controller: ['$scope', function($scope) {
			var watcherRemover,
			binders = [],
			showHideBinder = function(elm, attr, value) 
			{
				var show = (attr == 'show') ? '' : 'none';
				var hide = (attr == 'hide') ? '' : 'none';
    			elm.css('display', toBoolean(value) ? show : hide);
			},
			classBinder = function(elm, value)
			{
				if (angular.isObject(value) && !angular.isArray(value)) {
					var results = [];
					angular.forEach(value, function(value, index) {
						if (value) results.push(index);
					});
					value = results;
				}
				if (value) {
					elm.addClass(angular.isArray(value) ? value.join(' ') : value);
				}
			};

			this.addBinder = function(binder) 
			{
				binders.push(binder); 
			};
			this.setupWatcher = function(bindonce) 
			{
				var that = this;
				watcherRemover = $scope.$watch(bindonce, function(newValue) 
				{
					if (newValue == undefined) return;
					that.removeWatcher();
					that.runBinders();
				}, true);
			};
			this.removeWatcher = function() 
			{
				if (watcherRemover != undefined)
				{
					console.log('Removing watcher');
					watcherRemover();
					watcherRemover = undefined;
				}
			};

			this.runBinders = function()
			{
				for (var data in binders)
				{
					var binder = binders[data];
					var value = $scope.$eval(binder.value);
					// console.log('executing', binder);
					switch(binder.attr)
					{
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
						case 'src':
						case 'href':
						case 'alt':
						case 'title':
							binder.element.attr(binder.attr, value); 
							break;
					}
				}
			};
		}],

		link: function(scope, elm, attrs, bindonceController) {
			var value = (attrs.bindonce) ? scope.$eval(attrs.bindonce) : true;
			if (value != undefined)
			{
				bindonceController.runBinders();
			}
			else
			{
				bindonceController.setupWatcher(attrs.bindonce);
				elm.bind("$destroy", bindonceController.removeWatcher);
			}
		}
	};
});

angular.forEach({
	'boShow' : 'show',
	'boHide' : 'hide',
	'boClass' : 'class',
	'boText' : 'text',
	'boHtml' : 'html',
	'boSrc' : 'src',
	'boHref' : 'href',
	'boAlt' : 'alt',
	'boTitle' : 'title'
}, 
function(tag, attribute) 
{
	var childPriority = 200;
	return angular.module('pasvaz.bindonce').directive(attribute, function() 
	{
		return { 
			priority: childPriority,
			require: '^bindonce', 
			link: function(scope, elm, attrs, bindonceController) {
				bindonceController.addBinder({element: elm, attr:tag, value: attrs[attribute]});
			}
		}
	});
});

