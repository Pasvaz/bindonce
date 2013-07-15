'use strict';
/**
 * Bindonce - Zero watches binding for AngularJs
 * @version v0.1.1 - 2013-05-07
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
 		restrict: "AM",
 		controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
 			var showHideBinder = function(elm, attr, value) 
 			{
 				var show = (attr == 'show') ? '' : 'none';
 				var hide = (attr == 'hide') ? '' : 'none';
 				elm.css('display', toBoolean(value) ? show : hide);
 			}
 			var boolBinder = function(elm, attr, value)
 			{
 				if (toBoolean(value)) {
 					elm.attr(attr, attr);
 				}
 			}
 			var classBinder = function(elm, value)
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
 			}

 			var ctrl =
 			{
 				watcherRemover : undefined,
 				binders : [],
 				group : $attrs.boName,
 				element : $element,
 				ran : false,

 				addBinder : function(binder) 
 				{
 					this.binders.push(binder);

 					// In case of late binding (when using the directive bo-name/bo-parent)
 					// it happens only when you use nested bindonce, if the bo-children
 					// are not dom children the linking can follow another order
 					if (this.ran)
 					{
 						this.runBinders();
 					}
 				},

 				setupWatcher : function(bindonceValue) 
 				{
 					var that = this;
 					this.watcherRemover = $scope.$watch(bindonceValue, function(newValue) 
 					{
 						if (newValue == undefined) return;
 						that.removeWatcher();
 						that.runBinders();
 					}, true);
 				},

 				removeWatcher : function() 
 				{
 					if (this.watcherRemover != undefined)
 					{
 						this.watcherRemover();
 						this.watcherRemover = undefined;
 					}
 				},

 				runBinders : function()
 				{
 					for (var data in this.binders)
 					{
 						var binder = this.binders[data];
 						if (this.group && this.group != binder.group ) continue;
 						var value = $scope.$eval(binder.value);
						switch(binder.attr)
						{
							case 'hide':
							case 'show':
							showHideBinder(binder.element, binder.attr, value);
							break;
							case 'disabled':
							boolBinder(binder.element, binder.attr, value);
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
							case 'id':
							case 'style':
							case 'value':
							case 'name':
							binder.element.attr(binder.attr, value);
							break;
						}
					}
 					this.ran = true;
 					this.binders = [];
				}
			}

			return ctrl;
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
	'boDisabled' : 'disabled',
	'boClass' : 'class',
	'boText' : 'text',
	'boHtml' : 'html',
	'boSrc' : 'src',
	'boHref' : 'href',
	'boAlt' : 'alt',
	'boTitle' : 'title',
	'boId' : 'id',
	'boStyle' : 'style',
	'boValue' : 'value',
	'boName' : 'name'
},
function(tag, attribute)
{
	var childPriority = 200;
	return angular.module('pasvaz.bindonce').directive(attribute, function() 
	{
		return { 
			priority: childPriority,
			require: '^bindonce', 
			link: function(scope, elm, attrs, bindonceController)
			{
				var name = attrs.boParent;
				if (name && bindonceController.group != name)
				{
					var element = bindonceController.element.parent();
					bindonceController = undefined;
					var parentValue;

					while (element[0].nodeType != 9 && element.length)
					{
						if ((parentValue = element.data('$bindonceController')) 
							&& parentValue.group == name)
						{
							bindonceController = parentValue
							break;
						}
						element = element.parent();
					}
					if (!bindonceController)
					{
						throw Error("No bindonce controller: " + name);
					}
				}
				bindonceController.addBinder({element: elm, attr:tag, value: attrs[attribute], group: name});
			}
		}
	});
});

