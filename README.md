Bindonce
========

High performance binding for AngularJs

## Usage
* download, clone or fork it or install it using [bower](http://twitter.github.com/bower/) `bower install angular-bindonce`
* Include the `bindonce.js` script provided by this component into your app.
* Add `'pasvaz.bindonce'` as a module dependency to your app: `angular.module('app', ['pasvaz.bindonce'])`

## Overview
AngularJs provides a great data binding system but if you abuse of it the page can run into some performance 
issues, it's known that more of 2000 watchers can lag the page and that amount can be reached easily if you 
don't pay attention to the data-binding. Sometime you really need to bind your data using watchers, especially 
for SPA because the data are updated in real time, but often it's just a lazy practice, most of the data 
presented in your page are inmutable once rendered so you should avoid to keep watching them for changes.

For istance, take a look to this snippet:
```html
<ul>
	<li ng-repeat="person in Persons">
		<a ng-href="#/people/{{person.id}}"><img ng-src="{{person.imageUrl}}"></a>
		<a ng-href="#/people/{{person.id}}">{{person.name}}</a>
		<p ng-class="{'itsaboy':person.gender=='male'}" ng-bind="person.description"></p>
	</li>
</ul>
```
Angular internally creates a `$watch` for each `ng-*` directive in order to keep the data up to date, so in this example
just for displaying few info it creates about 6 + 1 watchers for `person`. Iterate this amount for each person 
and you can have an idea about how easy is to reach 2000 watchers. Now if you need it, because those data could 
change while you show the page, or are bound to some models, it's ok. But most of the time they are static data 
that don't change once rendered. This is where **bindonce** can really help you.

This is how **bindonce** handles the above example:
```html
<ul>
	<li ng-repeat="person in Persons" bindonce>
		<a bo-href="'#/people/'+person.id}}"><img bo-src="person.imageUrl"></a>
		<a bo-href="'#/people/'+person.id}}" bo-text="person.name"></a>
		<p bo-class="{'itsaboy':person.gender=='male'}" bo-html="person.description"></p>
	</li>
</ul>
```
Now this example takes **0 watches** and renders the same result as the above that uses ng-*. *(Angular still watches the ng-repeat expression)*

## License
MIT