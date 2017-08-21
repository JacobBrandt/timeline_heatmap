import uiModules from 'ui/modules';
import d3 from 'd3';
import heatmap from 'plugins/timeline_heatmap/d3_timeline_heatmap.js';
import moment from 'moment';
import Binder from 'ui/binder';
import VislibVisTypeBuildChartDataProvider from 'ui/vislib_vis_type/build_chart_data';
import AggResponseTabifyProvider from 'ui/agg_response/tabify/tabify';

const module = uiModules.get('timeline_heatmap', ['kibana']);
module.controller('TimelineHeatmapController', function($scope, $timeout, $element, Private) {
  $scope.tooltipFormatter = Private(require('plugins/timeline_heatmap/timeline_heatmap_tooltip_formatter'));
  const ResizeChecker = Private(require('ui/vislib/lib/resize_checker'));
  const resizeChecker = new ResizeChecker($element);
  const queryFilter = Private(require('ui/filter_bar/query_filter'));
  const binder = new Binder();
  binder.on(resizeChecker, 'resize', function() {
    resize();
  });

  function resize() {
    $scope.$emit('render');
  }

  $scope.queryFilter = queryFilter;

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
.directive('timeline', function(config, $timeout, timefilter) {
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

      function applySourceFilter(sources) {
        let viewByAgg = scope.vis.aggs.bySchemaName.viewBy[0];
        let newFilter = {
          meta: {
            index: scope.vis.indexPattern.id,
          },
        };

        let sourceType = scope.vis.aggs.bySchemaName.viewBy[0].params.field.type;
        let found = false;
        let min = 0;
        let max = 0;
        let key = viewByAgg.params.field.name;
        let existingFilter = null;
        _.flatten([scope.queryFilter.getAppFilters(), scope.queryFilter.getGlobalFilters()]).forEach(function (it) {
          if (it.meta.disabled || it.meta.negate) {
            return;
          }
          if (it.meta.alias && it.meta.alias.includes("Heatmap Terms")) {
            found = true;
            existingFilter = it;
          }
          if (it.meta.key === key) {
            var filterMin = -1;
            var filterMax = -1;
            if ('gte' in it.range[key]) filterMin = it.range[key].gte;
            if ('gt' in it.range[key]) filterMin = it.range[key].gt;
            if ('lte' in it.range[key]) filterMax = it.range[key].lte;
            if ('lt' in it.range[key]) filterMax = it.range[key].lt;
            if (filterMin !== -1 && filterMax !== -1) {
              if (!found || filterMin < min) min = filterMin;
              if (!found || filterMax > max) max = filterMax;
              found = true;
              existingFilter = it;
            }
          }
        });
        let updateModel = null
        let alias = null;
        if (sourceType === "number") {
          let minExtent = sources[0];
          let maxExtent = sources[sources.length - 1];
          newFilter.range = { };
          newFilter.range[viewByAgg.params.field.name] = {
            gte: minExtent,
            lte: maxExtent
          };
          updateModel = {
            range: newFilter.range
          };
        }
        else {
          sources.forEach(function (source, index, data) {
            data[index] = '\"' + source + '\"';
          });
          newFilter.query = {
            query_string: {
              default_field: viewByAgg.params.field.name,
              query: sources.join(" OR " ),
            }
          };
          updateModel = {
            query: newFilter.query
          };
          alias = "Heatmap Terms: (" + sources.length + " selected)";
        }
        if (found) {
          scope.queryFilter.updateFilter({
            model: updateModel,
            source: existingFilter,
            alias: alias
          })
        }
        else {
          newFilter.meta["alias"] = alias;
          scope.queryFilter.addFilters(newFilter);
        }
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

        function getScaledInterval() {
          let interval = aggInterval;
          let rules = config.get('dateFormat:scaled');

          for (let i = rules.length - 1; i >= 0; i--) {
            let rule = rules[i];
            if (!rule[0] || interval >= moment.duration(rule[0])) {
              return rule[1];
            }
          }

          return config.get('dateFormat');
        }

        function xAxisFormatter(val) {
          return moment(val).format(getScaledInterval());
        }

        heatmap(elem[0], scope.sourceData, {
            min: earliest,
            max: latest,
            interval: interval,
            onTimeChange: applyTimeFilter,
            onSourceChange: applySourceFilter,
            formatTooltip: formatTooltip,
            showTooltip: scope.vis.params.showTooltip,
            showLegend: scope.vis.params.showLegend,
            colorType: scope.vis.params.colorType,
            axisColorType: scope.vis.params.axisColorType,
            xAxisFormatter: xAxisFormatter,
            rangeBandPct: scope.vis.params.rangeBandPct,
            sourceType: scope.vis.aggs.bySchemaName.viewBy[0].params.field.type,
            type: "overall",
            showCrosshair: scope.vis.params.showCrosshair
          }
        );
      }
    }
  }
});
