var module = require('ui/modules').get('timeline_heatmap', ['kibana']);
var d3 = require('d3');
var heatmap = require('plugins/timeline_heatmap/d3_timeline_heatmap');

import 'ui/timefilter';

module.controller('TimelineHeatmapController', function($scope, $timeout, Private) {
  $scope.$watchMulti(['esResponse'], function ([resp]) {
    if (resp === undefined) {
      return;
    }

    $scope.processAggregations(resp.aggregations);

    $scope.$emit('render');
  });

  $scope.processAggregations = function (aggregations) {
    let sourceData = [];
    let minTime = 1e99;
    let maxTime = 0;

    if (aggregations &&
      ($scope.vis.aggs.bySchemaName.metric !== undefined) &&
      ($scope.vis.aggs.bySchemaName.timeSplit !== undefined)) {
      let metricsAgg = $scope.vis.aggs.bySchemaName.metric[0];
      let timeAgg = $scope.vis.aggs.bySchemaName.timeSplit[0];
      let timeAggId = timeAgg.id;

      if ($scope.vis.aggs.bySchemaName.viewBy !== undefined) {
        let viewByAgg = $scope.vis.aggs.bySchemaName.viewBy[0];
        let viewByBuckets = aggregations[viewByAgg.id].buckets;
        _.each(viewByBuckets, function (bucket) {
          let sourceObj = {};
          sourceObj.name = bucket.key;
          let timeValues = [];
          let bucketsForViewByValue = bucket[timeAggId].buckets;
          _.each(bucketsForViewByValue, function (valueBucket) {
            minTime = Math.min(minTime, valueBucket.key);
            maxTime = Math.max(maxTime, valueBucket.key);
            timeValues.push({time: valueBucket.key, count: metricsAgg.getValue(valueBucket)});
          });
          sourceObj.data = timeValues;
          sourceData.push(sourceObj);
        });
      } else {
        var timeValues = [];
        let buckets = aggregations[timeAggId].buckets;
        _.each(buckets, function (bucket) {
          minTime = Math.min(minTime, bucket.key);
          maxTime = Math.max(maxTime, bucket.key);
          timeValues.push({time: bucket.key, count: metricsAgg.getValue(bucket)});
        });

        sourceData.push({
          name: metricsAgg.makeLabel(),
          data: timeValues
        });
      }
    }

    $scope.sourceData = sourceData;
    $scope.min = parseInt(minTime);
    $scope.max = parseInt(maxTime);
    console.log($scope);
  };
})
.directive('timeline', function($timeout, timefilter) {
  return {
    link: function(scope, elem, attr) {
      scope.$on('render',function (event, d) {
        if (scope.vis.aggs.length !== 0 && scope.vis.aggs.bySchemaName.timeSplit !== undefined) {
          renderChart();
        }
      });

      function renderChart() {
        let timeAgg = scope.vis.aggs.bySchemaName.timeSplit[0];
        var aggInterval = timeAgg.buckets.getInterval();
        var interval = aggInterval._milliseconds;
        heatmap.heatmap().call(elem[0], scope.sourceData, {
            min: scope.min,
            max: scope.max,
            interval: interval,
            height: scope.vis.params.height
          }
        );
      }
    }
  }
});
