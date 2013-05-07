Bindonce
========

High performance binding for AngularJs

## Usage
* download, clone or fork it or install it using [bower](http://twitter.github.com/bower/) `bower install angular-bindonce`
* Include the `bindonce.js` script provided by this component into your app.
* Add `'pasvaz.bindonce'` as a module dependency to your app: `angular.module('app', ['pasvaz.bindonce'])`

## Overview
AngularJs provides a great data binding system but if you abuse of it the page can run into some performance 
issues, it's known that more of 2000 watches can lag the page and that amount can be reached easily if you 
don't pay attention to the data-binding. Sometime you really need to bind your data using watches, especially 
for SPA because the data are updated in real time, but often it's just a lazy practice, most of the data 
presented in your page are inmutable once rendered so you should avoid to keep watching them for changes.

For istance, take a look to this snippet:
```html
< ul class="phones">
	< li ng-repeat="phone in phones | filter:query | orderBy:orderProp" class="thumbnail">
		< a href="#/phones/{{phone.id}}" class="thumb"><img ng-src="{{phone.imageUrl}}"></a>
		< a href="#/phones/{{phone.id}}">{{phone.name}}</a>
		< p>{{phone.snippet}}</p>
	</li>
</ul>
```


## License
MIT