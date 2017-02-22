import uiModules from 'ui/modules';
import d3 from 'd3';
import heatmap from 'plugins/timeline_heatmap/d3_timeline_heatmap.js';
import moment from 'moment';
import Binder from 'ui/binder';

const module = uiModules.get('timeline_heatmap', ['kibana']);
module.controller('TimelineHeatmapController', function($scope, $timeout, $element, Private) {
  $scope.tooltipFormatter = Private(require('plugins/timeline_heatmap/timeline_heatmap_tooltip_formatter'));
  const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
  const resizeChecker = new ResizeChecker($element);
  const binder = new Binder();
  binder.on(resizeChecker, 'resize', function() {
    resize();
  });

  function resize() {
    $scope.$emit('render');
  }

  $scope.$watchMulti(['esResponse'], function ([resp]) {
    if (resp === undefined) {
      return;
    }

    $scope.processAggregations(resp.aggregations);
    
    $scope.$emit('render');
  });

  $scope.$watch('vis.params', (options) => $scope.$emit('render'));

  $scope.processAggregations = function (aggregations) {
    const sourceData = [];

    if (aggregations &&
      ($scope.vis.aggs.bySchemaName.metric !== undefined) &&
      ($scope.vis.aggs.bySchemaName.timeSplit !== undefined)) {
      const metricsAgg = $scope.vis.aggs.bySchemaName.metric[0];
      const timeAgg = $scope.vis.aggs.bySchemaName.timeSplit[0];
      const timeAggId = timeAgg.id;

      if ($scope.vis.aggs.bySchemaName.viewBy !== undefined) {
        const viewByAgg = $scope.vis.aggs.bySchemaName.viewBy[0];
        const viewByBuckets = aggregations[viewByAgg.id].buckets;
        _.each(viewByBuckets, function (bucket) {
          const sourceObj = {};
          sourceObj.name = bucket.key;
          let timeValues = [];
          const bucketsForViewByValue = bucket[timeAggId].buckets;
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
        let timeValues = [];
        const buckets = aggregations[timeAggId].buckets;
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
        if (scope.sourceData !== undefined && scope.vis.aggs.length !== 0 && scope.vis.aggs.bySchemaName.timeSplit !== undefined) {
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
        const timeAgg = scope.vis.aggs.bySchemaName.timeSplit[0];
        const viewByAgg = scope.vis.aggs.bySchemaName.viewBy[0];
        const metricsAgg = scope.vis.aggs.bySchemaName.metric[0];
        const aggInterval = timeAgg.buckets.getInterval();
        const interval = aggInterval.asMilliseconds();
        const bounds = timefilter.getActiveBounds();
        const min = moment(bounds).startOf()
        const earliest = moment(bounds.min).startOf(aggInterval.description).valueOf();
        const latest = moment(bounds.max).valueOf();

        heatmap(elem[0], scope.sourceData, {
            min: earliest,
            max: latest,
            interval: interval,
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
