# Plugin Visualization Versions
* [Kibana 4](https://github.com/JacobBrandt/timeline_heatmap/tree/4.6)
* [Kibana 5](https://github.com/JacobBrandt/timeline_heatmap/tree/5.1)

## timeline_heatmap
Kibana visualization that renders multiple sources over time.

![new_features](https://user-images.githubusercontent.com/5314322/29205728-d4a6b6bc-7e3b-11e7-8464-7d65a95be1ef.png)

# New Features!
* Axis Bar Chart - Visualizes metric count for entire source or time event.  Color is configurable.
* Axis Filtering - Brush along the X or Y Axis to narrow down your time or source respectively
* Zoom Filtering - Brushing in the heatmap graph will zoom into the bounding box.  Essentially applying the time and source filter.
* Toggle Heatmap - Toggle between overall heatmap and individual heatmaps by time interval (columns) or source (rows).

# Additional Features
* Metric Filtering (Internal) - Brush on the legend to quickly find values within the heatmap.  An internal filter that preserves the original data.
* Tooltips - Displays Source Label, Metric Label, and Time

![timeline_heatmap](https://cloud.githubusercontent.com/assets/5314322/24117992/d7dc2d34-0d71-11e7-87be-8d1e123731c5.gif)
