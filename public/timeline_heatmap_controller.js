var module = require('ui/modules').get('timeline_heatmap', ['kibana']);
var d3 = require('d3');
var heatmap = require('plugins/timeline_heatmap/d3_timeline_heatmap');
var moment = require('moment');

module.controller('TimelineHeatmapController', function($scope, $timeout, Private) {
  $scope.tooltipFormatter = Private(require('plugins/timeline_heatmap/timeline_heatmap_tooltip_formatter'));

  $scope.$watchMulti(['esResponse'], function ([resp]) {
    if (resp === undefined) {
      return;
    }

    $scope.processAggregations(resp.aggregations);

    $scope.$emit('render');
  });

  $scope.processAggregations = function (aggregations) {
    let sourceData = [];

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
            let value = null;
            if("std_dev" === metricsAgg.__type.name) {
              value = valueBucket[metricsAgg.id].std_deviation;
            }
            else {
              value = metricsAgg.getValue(valueBucket);
            }
            timeValues.push({time: valueBucket.key, count: value});
          });
          sourceObj.data = timeValues;
          sourceData.push(sourceObj);
        });
      } else {
        var timeValues = [];
        let buckets = aggregations[timeAggId].buckets;
        _.each(buckets, function (bucket) {
          timeValues.push({time: bucket.key, count: metricsAgg.getValue(bucket)});
        });

        sourceData.push({
          name: metricsAgg.makeLabel(),
          data: timeValues
        });
      }
    }

    $scope.sourceData = sourceData;
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

      function applyTimeFilter(minExtent, maxExtent) {
        timefilter.time.from = moment(minExtent);
        timefilter.time.to = moment(maxExtent);
        timefilter.time.mode = 'absolute';
      }

      function formatTooltip(feature) {
        return scope.tooltipFormatter(feature, scope);
      }

      function renderChart() {
        let timeAgg = scope.vis.aggs.bySchemaName.timeSplit[0];
        let viewByAgg = scope.vis.aggs.bySchemaName.viewBy[0];
        let metricsAgg = scope.vis.aggs.bySchemaName.metric[0];
        var aggInterval = timeAgg.buckets.getInterval();
        var interval = aggInterval.asMilliseconds();

        let bounds = timefilter.getActiveBounds();
        let min = moment(bounds).startOf()
        let earliest = moment(bounds.min).startOf(aggInterval.description).valueOf();
        let latest = moment(bounds.max).valueOf();

        heatmap.heatmap().call(elem[0], scope.sourceData, {
            min: earliest,
            max: latest,
            interval: interval,
            height: scope.vis.params.height,
            onTimeChange: applyTimeFilter,
            formatTooltip: formatTooltip,
            showTooltip: scope.vis.params.showTooltip,
            showLegend: scope.vis.params.showLegend
          }
        );
      }
    }
  }
});
