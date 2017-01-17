define(function (require) {
  return function TimelineHeatmapTooltipFormatter($compile, $rootScope, Private) {
    let $ = require('jquery');
    let _ = require('lodash');

    let $tooltipScope = $rootScope.$new();
    let $el = $('<div>').html(require('plugins/timeline_heatmap/timeline_heatmap_tooltip.html'));
    $compile($el)($tooltipScope);

    return function tooltipFormatter(feature, scope) {
      if (!feature || !scope) return '';

      let viewByAgg = scope.vis.aggs.bySchemaName.viewBy[0];
      let metricsAgg = scope.vis.aggs.bySchemaName.metric[0];
      let lane = feature.lane;
      if (viewByAgg.__type.name == "histogram") {
        lane = lane + " to " + (parseInt(feature.lane) + viewByAgg.params.interval);
      }

      $tooltipScope.details = [
        {
          label: viewByAgg.makeLabel(),
          value: lane
        },
        {
          label: metricsAgg.makeLabel(),
          value: feature.tip 
        }
      ];

      $tooltipScope.$apply();

      return $el.html();
    };
  };
});

