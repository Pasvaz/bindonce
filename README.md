Bindonce
========

High performance binding for AngularJs

## Usage
* download, clone or fork it or install it using [bower](http://twitter.github.com/bower/) `bower install angular-bindonce`
* Include the `bindonce.js` script provided by this component into your app.
* Add `'pasvaz.bindonce'` as a module dependency to your app: `angular.module('app', ['pasvaz.bindonce'])`

## Overview
AngularJs provides a great data binding system but if you abuse of it the page can run into some performance issues, it's known that more of 2000 watchers can lag the UI and that amount can be reached easily if you don't pay attention to the data-binding. Sometime you really need to bind your data using watchers, especially for SPA because the data are updated in real time, but often you can avoid it with some efforts, most of the data presented in your page, once rendered, are immutable so you shouldn't keep watching them for changes.

For instance, take a look to this snippet:
```html
<ul>
	<li ng-repeat="person in Persons">
		<a ng-href="#/people/{{person.id}}"><img ng-src="{{person.imageUrl}}"></a>
		<a ng-href="#/people/{{person.id}}"><span ng-bind="person.name"></span></a>
		<p ng-class="{'cycled':person.generated}" ng-bind-html-unsafe="person.description"></p>
	</li>
</ul>
```
Angular internally creates a `$watch` for each `ng-*` directive in order to keep the data up to date, so in this example just for displaying few info it creates 6 + 1 *(ngRepeatWatch)* watchers per `person`, even if the `person` is supposed to remain the same once shown. Iterate this amount for each person and you can have an idea about how easy is to reach 2000 watchers. Now if you need it because those data could change while you show the page or are bound to some models, it's ok. But most of the time they are static data that don't change once rendered. This is where **bindonce** can really help you.

The above example done with **bindonce**:
```html
<ul>
	<li bindonce ng-repeat="person in Persons">
		<a bo-href="'#/people/' + person.id"><img bo-src="person.imageUrl"></a>
		<a bo-href="'#/people/' + person.id" bo-text="person.name"></a>
		<p bo-class="{'cycled':person.generated}" bo-html="person.description"></p>
	</li>
</ul>
```
Now this example uses **0 watches** per `person` and renders exactly the same result as the above that uses ng-*. *(Angular still uses 1 watcher for ngRepeatWatch)*

### The smart approach
OK until here nothing completely new, with a bit of efforts you could create your own directive and render the `person` inside the `link` function, or you could use [watch fighters](https://github.com/abourget/abourget-angular) that has a similar approach, but there is still one problem that you have to face and **bindonce** already handles it: *the existence of the data when the directive renders the content*. Usually the directives, unless you use watchers or bind their attributes to the scope (still a watcher), render the content when they are loaded into the markup, if at that given time your data are not available the directive can't render it. Bindonce can wait until the data are ready before to render the content. 
Let's give a look to the follow snippet to better understand the concept:
```html
<span my-custom-set-text="Person.firstname"></span>
<span my-custom-set-text="Person.lastname"></span>
...
<script>
angular.module('testApp', [])
.directive('myCustomSetText', function () {
	return {
		link:function (scope, elem, attr, ctrl) {
			elem.text(scope.$eval(attr.myCustomSetText));
		}
	}
});
</script>
```
This basic directive works as expected, it renders the `Person` datas and it doesn't use any watcher. However, if `Person` is not yet available inside the $scope when the page is loaded (say we get `Person` via $http or via $resource), the directive is useless, `scope.$eval(attr.myCustomSetText)` renders just nothing and exit.

Here is how we can solve this issue with **bindonce**:
```html
<div bindonce="Person" bo-title="Person.title">
	<span bo-text="Person.firstname"></span>
	<span bo-text="Person.lastname"></span>
	<img bo-src="Person.picture" bo-alt="Person.title">
	<p bo-class="{'fancy':Person.isNice}" bo-html="Person.story"></p>
</div>
```
`bindonce="Person"` does the trick, any `bo-*` attribute belonging to `bindonce` waits until the parent `bindonce="{somedata}"` is validated and only then it renders its content. Once the scope contains the value `Person` then every bo-* children get filled with the proper values. In order to accomplish this task, **bindonce** uses just **one** temporary watcher, no matters how many children need to be rendered. As soon as it gets `Person` the watcher is properly removed. If the $scope contains already the data bindonce is looking for, then it doesn't create the temporary watcher and starts rendering its children.

You may have noticed that the first example didn't use any value with the attribute `bindonce`:
```html
<ul>
	<li bindonce ng-repeat="person in Persons">
	...
```
when used with `ng-repeat` `bindonce` doesn't need to check if `person` is defined because `ng-repeat` creates the directives only when `person` exists, anyway you can use `<li bindonce="person" ng-repeat="person in Persons">` it doesn't make any difference.

### Interpolation
Some directives (ng-href, ng-src) use interpolation, ie: `ng-href="/profile/{{User.profileId}}"`. 
Both `ng-href` and `ng-src` have the bo-* equivalent directives: `bo-href-i` and `bo-src-i` (pay attention to the **-i**, it means interpolate), as expected they don't use watchers however Angular creates one watcher for every interpolation, for instance `bo-href-i="/profile/{{User.profileId}}"` set the element's href **once**, as expected, but Angular keeps a watcher active on `{{User.profileId}}` even if `bo-href-i` doesn't use it.
That's why by default the `bo-href` doesn't use interpolation nor watchers, the above equivalent with 0 watchers would be `bo-href="'/profile/' + User.profileId"`. Never the less `bo-href-i` and `bo-src-i` are still maintained for compatibility reasons.

## Attribute Usage
| 	attribute | 	Description | 	Example  |
| ------------- |:-------------:| -----:|
| `bindonce="{somedata}"`| **bindonce** is the main directive, `{somedata}` is optional, if it's present it forces bindonce to wait until `somedata` is defined before to render its children  | `bindonce="Person"` |
| `bo-if = "condition"`     | equivalent to `ng-if` but doesn't use watchers |`<ANY bo-if="Person.isPublic"></ANY>`|
| `bo-show = "condition"`     | equivalent to `ng-show` but doesn't use watchers |`<ANY bo-show="Person.isPublic"></ANY>`|
| `bo-hide = "condition"`     | equivalent to `ng-hide` but doesn't use watchers |`<ANY bo-hide="Person.isPrivate"></ANY>`|
| `bo-text = "text"`      | evaluates "text" and print it as text inside the element | `bo-text="Person.name"` |
| `bo-html = "markup"`      | evaluates "markup" and render it as html inside the element |`bo-html="Person.description"`|
| `bo-href-i = "url"`      | **equivalent** to `ng-href`. **Heads up!** It creates one watcher. Using `{{}}` inside the url like `<a bo-href="/profile{{Person.id}}">` you create one watcher, use `bo-href` to avoid it: `<a bo-href="'/profile' + Person.id">` |`<a bo-href-i="/profile{{Person.id}}"></a>`|
| `bo-href = "url"`      | **similar** to `ng-href` but doesn't allow interpolation using `{{}}` like `ng-href`. **Heads up!** You can't use interpolation `{{}}` inside the url, use bo-href-i for that purpose |`<a bo-href="'/profile' + Person.id"></a>` or `<a bo-href="link" bo-text="Link"></a>`|
| `bo-src-i = "url"`      | **equivalent** to `ng-src`. **Heads up!** It creates one watcher |`<img bo-src-i="{{picture}}" bo-alt="title">`|
| `bo-src = "url"`      | **similar** to `ng-src` but doesn't allow interpolation using `{{}}` like `ng-src`. **Heads up!** You can't use interpolation `{{}}`, use bo-src-i for that purpose |`<img bo-src="picture" bo-alt="title">`|
| `bo-class = "class:condition"`      | equivalent to `ng-class` but doesn't use watchers |`<span bo-class="{'fancy':Person.condition}">`|
| `bo-alt = "text"`      | evaluates "text" and render it as `alt` for the element |`<ANY bo-alt="title">`|
| `bo-title = "text"`      | evaluates "text" and render it as `title` for the element |`<ANY bo-title="title">`|
| `bo-id = "text"`      | evaluates "text" and render it as `id` for the element |`<ANY bo-id="id">`|
| `bo-style = "text"`      | equivalent to `ng-style` but doesn't use watchers |`<ANY bo-style="{color:red}">`|
| `bo-value = "text"`      | evaluates "text" and render it as `value` for the element |`<input type="radio" bo-value="value">`|
| `bo-attr bo-attr-foo = "text"`      | evaluates "text" and render it as a custom attribute for the element |`<div bo-attr bo-attr-foo="bar"></div>`|

## Todo
Examples and Tests

## License
MIT
