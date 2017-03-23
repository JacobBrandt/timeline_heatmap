import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
export default function TimelineHeatmapTooltipFormatter(config, $compile, $rootScope, Private) {
  let $tooltipScope = $rootScope.$new();
  let $el = $('<div>').html(require('plugins/timeline_heatmap/timeline_heatmap_tooltip.html'));
  $compile($el)($tooltipScope);

  return function tooltipFormatter(feature, scope) {
    if (!feature || !scope) return '';

    let viewByAgg = scope.vis.aggs.bySchemaName.viewBy[0];
    let metricsAgg = scope.vis.aggs.bySchemaName.metric[0];
    let timeAgg = scope.vis.aggs.bySchemaName.timeSplit[0];
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
      },
      {
        label: timeAgg.makeLabel(),
        value: moment(feature.time).format(config.get("dateFormat"))
      }
    ];

    $tooltipScope.$apply();

    return $el.html();
  };
};

