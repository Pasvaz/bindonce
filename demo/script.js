var app = angular.module('bindoncedebug', ['pasvaz.bindonce', 'ngResource']);

app.controller('MainCtrl', function ($scope, $q, $timeout, $resource)
{
	var count = 0;
	$scope.AddItem = function ()
	{
		$scope.items.push(++count);
		$scope.$broadcast('rinfresca');
	}

	$scope.Change = function ()
	{
		$scope.items = [1, 2, 3, 4];
		$scope.$broadcast('rinfresca');
	}

	$timeout(function ()
	{
		$scope.items = [1, 2, 3, 4];
		count = $scope.items.length;
	}, 500)

	//$timeout(function ()
	//{
	//	$scope.items[1] = 'pippo';
	//	$scope.$broadcast('rinfresca')
	//}, 3000)
});
