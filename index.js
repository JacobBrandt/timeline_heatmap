module.exports = function(kibana) {
  return new kibana.Plugin({
    // Plugin configuration
    uiExports: {
      visTypes: ['plugins/timeline_heatmap/timeline_heatmap_vis.js']
    }
  });
};

