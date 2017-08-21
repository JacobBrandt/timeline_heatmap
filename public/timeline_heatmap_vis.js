import 'plugins/timeline_heatmap/timeline_heatmap.less';
import 'plugins/timeline_heatmap/timeline_heatmap_controller';
import TemplateVisTypeTemplateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import timelineHeatmapTemplate from 'plugins/timeline_heatmap/timeline_heatmap_controller.html';
import visTypes from 'ui/registry/vis_types';
import AggResponsePointSeriesPointSeriesProvider from 'ui/agg_response/point_series/point_series';

visTypes.register(function TimelineHeatmapProvider(Private) {
  const TemplateVisType = Private(TemplateVisTypeTemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new TemplateVisType({
    name: 'timeline_heatmap',
    title: 'Timeline Heatmap',
    description: 'A visualization that uses swim lanes to visualize multiple sources over time. Each swim lane represents a source and the intervals of the date histogram are colored based on the metric defined at the given time.',
    icon: 'fa-bars',
    template: timelineHeatmapTemplate,
    params: {
      editor: require('plugins/timeline_heatmap/timeline_heatmap_vis_params.html'),
      defaults: {
        showTooltip: true,
        showLegend: true,
        showCrosshair: true,
        colorType: 'Spectral',
        axisColorType: 'Spectral',
        rangeBandPct: 100
      },
      colorTypes: ['Spectral', 'Orange', 'Purple', 'Pink']
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Value',
        required: true,
        min: 1,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'std_dev']
      },
      {
        group: 'buckets',
        name: 'viewBy',
        icon: 'fa fa-eye',
        title: 'View by',
        mustBeFirst: true,
        required: true,
        min: 1,
        max: 1,
        aggFilter: ['terms', 'histogram']
      },
      {
        group: 'buckets',
        name: 'timeSplit',
        icon: 'fa fa-th',
        title: 'Time field',
        required: true,
        min: 1,
        max: 1,
        aggFilter: 'date_histogram'
      }
    ])
  });
});
