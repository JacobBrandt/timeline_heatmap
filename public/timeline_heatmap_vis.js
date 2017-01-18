define(function(require) {

  require('plugins/timeline_heatmap/timeline_heatmap_controller');
  require('plugins/timeline_heatmap/timeline_heatmap.less');

  function TimelineHeatmapProvider(Private) {
    var TemplateVisType = Private(require("ui/template_vis_type/TemplateVisType"));
  
    var Schemas = Private(require('ui/Vis/Schemas'));
    return new TemplateVisType({
      name: 'timeline_heatmap',
      title: 'Timeline Heatmap',
      description: 'A visualization that uses swim lanes to visualize multiple sources over time. Each swim lane represents a source and the intervals of the date histogram are colored based on the metric defined at the given time.',
      icon: 'fa-bars',
      template: require('plugins/timeline_heatmap/timeline_heatmap_controller.html'),
      params: {
        editor: require('plugins/timeline_heatmap/timeline_heatmap_vis_params.html'),
        defaults: {
          showTooltip: true,
          showLegend: true
        }
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
  }
  
  require('ui/registry/vis_types').register(TimelineHeatmapProvider);

  return TimelineHeatmapProvider;
});
