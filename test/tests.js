var assert = chai.assert;
describe("ch.directivedirectivests", function() {
  beforeEach(module('pasvaz.bindonce'));
  
   console.log("jQuery Version", $().jquery);

   it('Tests Directive', inject(function($rootScope, $compile) {
    var $scope = $rootScope.$new();
    $scope.Collection = [
      { Name : 'Item 1' },
      { Name : 'Item 2' },
      { Name : 'Item 3' },
      { Name : 'Item 4' }
    ];
    var elem1 = $compile('<div><div ng-repeat="element in Collection" class="item">{{element.Name}}</div><br/></div>')($scope);
    var elem2 = $compile('<div bindonce><div bo-repeat="element in Collection" class="item">{{element.Name}}</div><br/></div>')($scope);
    $scope.$digest();
    assert.equal($(".item", elem1).length, 4);
    assert.equal($(".item", elem2).length, 4);
    $scope.Collection.push({ Name : 'New Item 1'});
    $scope.Collection.push({ Name : 'New Item 2'});
    $scope.$digest();
    assert.equal($(".item", elem1).length, 6);
    assert.equal($(".item", elem2).length, 4);
    $scope.Collection.splice(0, 1);
    $scope.$digest();
    assert.equal($(".item", elem1).length, 5);
    assert.equal($(".item", elem2).length, 4);
   }));
});

