function heatmap(element, chartData, settings) {
  var interval = settings.interval;
  var min = parseInt(settings.min);
  var max = parseInt(settings.max) + interval;
  var onTimeChange = settings.onTimeChange;
  var onSourceChange = settings.onSourceChange;
  var formatTooltip = settings.formatTooltip;
  var showTooltip = settings.showTooltip;
  var showLegend = settings.showLegend;
  var xAxisFormatter = settings.xAxisFormatter;
  var rangeBandPct = settings.rangeBandPct;
  var sourceType = settings.sourceType;
  var heatmapType = settings.type;
  var showCrosshair = settings.showCrosshair;

  var selection = d3.select(element);
  var visualizeEl = element.parentNode.parentNode;

  // Overall dimensions
  var graphHeight = visualizeEl.clientHeight - 20;
  var margin = { top: 10, right: 20, bottom: 30, left: 70 },
    width = visualizeEl.clientWidth - margin.left - margin.right,
    height = graphHeight - margin.top - margin.bottom;

  var xScale, yScale;
  var xAxis, yAxis;
  var graph;
  var legend;
  var legendBrush;
  var legendScale;
  var legendHeight = 16;
  var legendMargin = { top: 0, right: 20, bottom: 20, left: margin.left };
  if (showLegend) {
    height -= (legendHeight + legendMargin.top + legendMargin.bottom);
  }
  var graphCtx, crosshairCtx, canvasTooltips, tooltip;

  // Heatmap dimensions
  var axisChartSize = 15;
  var heatWidth = width - axisChartSize;
  var heatHeight = height - axisChartSize;

  // Get colors
  var colorTypes = new Map();
  colorTypes.set('Spectral', ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"]);
  colorTypes.set('Orange', ['#fee0b6', '#fdb863', '#e08214', '#b35806', '#7f3b08']);
  colorTypes.set('Purple', ['#d8daeb', '#b2abd2', '#8073ac', '#542788', '#2d004b']);
  colorTypes.set('Pink', ['#FFFFFF', '#FFECFC', '#FFDAF9', '#FFC7F7', '#FFB5F4', '#FFA3F2', '#FF90EF', '#FF7EEC', '#FF6BEA', '#FF59E7', '#FF00DB']);
  var colors = colorTypes.get(settings.colorType);
  var horizonColors = colorTypes.get(settings.axisColorType);

  let timeOverallData = [];
  let sourceOverallData = [];
  let timeMin = [];
  let timeMax = [];
  chartData.forEach(function (series, index, data) {
    // Find the min/max within this series
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    series.data.forEach(function (serData) {
      count += serData.count;
      // Check min/max of series
      min = Math.min(min, serData.count);
      max = Math.max(max, serData.count);

      // Check min/max of time
      timeMin[serData.time] = timeMin[serData.time] ? Math.min(timeMin[serData.time], serData.count) : serData.count;
      timeMax[serData.time] = timeMax[serData.time] ? Math.max(timeMax[serData.time], serData.count) : serData.count;

      // Populate time overall data
      timeOverallData[serData.time] = {
        count: timeOverallData[serData.time] ? timeOverallData[serData.time].count + serData.count : serData.count
      };
    });
    // Populate source overall data
    data[index].min = min;
    data[index].max = max;
    data[index].count = count;
    data[index].colorScale = d3.scale.linear()
      .domain(linspace(min, max, colors.length))
      .range(colors);
    sourceOverallData[series.name] = {
      count: sourceOverallData[series.name] ? sourceOverallData[series.name].count + count : count
    }
  });

  // Gather data
  var countMax = 0;
  var data = [];
  var sources = chartData;
  sources.forEach(function (source) {
    source.data.forEach(function (d) {
      countMax = Math.max(countMax, d.count);
      d.name = source.name;
      d.sourceMin = source.min;
      d.sourceMax = source.max;
      d.sourceColorScale = source.colorScale;
      d.timeColorScale = d3.scale.linear()
        .domain(linspace(timeMin[d.time], timeMax[d.time], colors.length))
        .range(colors);
      data.push(d);
    });
  });
  // Sort by count for faster rendering
  data.sort(function (a, b) {
    return d3.ascending(a.count, b.count);
  });

  // Set heatmap color scale and default legend extents
  var heatmapColorScale = d3.scale.linear()
    .domain(linspace(0, countMax, colors.length))
    .range(colors);
  var legendExtents = {
    min: 0,
    max: countMax
  };

  var sourceNames = [];
  sources.forEach(function (source) {
    sourceNames.push(source.name);
  });

  function createGraphScales() {
    xScale = d3.time.scale()
      .domain([min, max])
      .range([0, heatWidth])

    yScale = d3.scale.ordinal()
      .domain(sourceNames)
      .rangeBands([0, heatHeight], (100 - rangeBandPct) / 100);
  }

  function createAxis() {
    xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(xAxisFormatter)
      .tickSize(15);
    yAxis = d3.svg.axis()
      .scale(yScale)
      .tickSize(15)
      .orient("left");
    let sourceLabelHeight = 17.5
    if (sourceNames.length * sourceLabelHeight > heatHeight) {
      var interval = Math.floor(sourceNames.length / Math.floor(heatHeight / sourceLabelHeight));
      yAxis.tickValues(yScale.domain().filter(function (d, i) { return i == 0 || !(i % interval) }))
    }
  }

  function createLegend() {
    selection.selectAll(".heatmap-legend").remove();
    if (!showLegend) {
      return;
    }
    legend = selection.append("svg")
      .attr("class", "heatmap-legend")
      .attr("width", width + legendMargin.left + legendMargin.right)
      .attr("height", legendHeight + legendMargin.top + legendMargin.bottom)
      .append("g")
      .attr("transform", "translate(" + legendMargin.left + ",0)");

    let gradient = legend.append("defs")
      .append('linearGradient')
      .attr("id", "gradient");

    let pct = linspace(0, 100, colors.length).map(function (d) {
      return Math.round(d) + '%';
    });

    let colourPct = d3.zip(pct, colors);
    colourPct.forEach(function (d) {
      gradient.append('stop')
        .attr('offset', d[0])
        .attr('stop-color', d[1])
        .attr('stop-opacity', 1);
    });

    legend.append('rect')
      .attr('width', width)
      .attr('height', legendHeight)
      .style('fill', 'url(#gradient)');

    legendScale = d3.scale.linear()
      .domain([0, countMax])
      .range([0, width]);

    let legendAxis = d3.svg.axis()
      .scale(legendScale)
      .orient("bottom");

    legend.append("g")
      .attr("class", "axis legend")
      .attr("transform", "translate(0, " + legendHeight + ")")
      .call(legendAxis);

    legend.append("text")
      .attr("class", "extents")
      .attr("transform", "translate(0, " + (legendHeight + legendMargin.bottom) + ")")
      .text("");
  }

  function truncateText() {
    var self = d3.select(this),
      textLength = self.node().getComputedTextLength(),
      text = self.text();
    while (textLength > (margin.left - 12) && text.length > 0) {
      text = text.slice(0, -1);
      self.text(text + '...');
      textLength = self.node().getComputedTextLength();
    }
  }

  function createGraph() {
    selection.selectAll(".heatmap-main").remove();
    graph = selection.append("svg")
      .attr("class", "heatmap-main")
      .attr("width", heatWidth + margin.left + margin.right)
      .attr("height", heatHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    graph.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + (heatHeight) + ")")
      .call(xAxis);

    graph.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

    let graphYAxis = d3.select(".axis--y");
    graphYAxis.selectAll(".tick")
      .selectAll("text")
      .html("")
      .append('tspan').text(function (d) {
        return d;
      })
      // .attr("full-text", function(d) {return d})
      .each(truncateText)
      .append('title').text(function (d) {
        return d;
      });
  }

  function createXBarChart() {
    selection.selectAll(".heatmap-x-bars").remove();
    var canvas = selection.append("canvas")
      .attr("class", "heatmap-x-bars")
      .attr("width", heatWidth)
      .attr("height", axisChartSize)
      .style("position", "absolute")
      .style("z-index", "-1")
      .style("left", margin.left + "px")
      .style("top", margin.top + heatHeight + "px");

    let ctx = canvas.node().getContext("2d");
    ctx.clearRect(0, 0, heatWidth, axisChartSize);
    let min = Infinity;
    let max = -Infinity;
    Object.keys(timeOverallData).forEach(function (time) {
      let timeData = timeOverallData[time];
      min = Math.min(min, timeData.count);
      max = Math.max(max, timeData.count);
    });

    var xHorizonColorScale = d3.scale.linear()
      .domain(linspace(min, max, horizonColors.length))
      .range(horizonColors);
    let heightScale = d3.scale.linear()
      .domain([min, max])
      .range([0, axisChartSize]);

    Object.keys(timeOverallData).forEach(function (time) {
      let timeData = timeOverallData[time];
      let start = xScale(time);
      ctx.fillStyle = xHorizonColorScale(timeData.count);
      ctx.fillRect(start, 0, xScale(time - interval) - start, heightScale(timeData.count));
    });
  }

  function createYBarChart() {
    selection.selectAll(".heatmap-y-bars").remove();
    var canvas = selection.append("canvas")
      .attr("class", "heatmap-y-bars")
      .attr("width", axisChartSize)
      .attr("height", heatHeight)
      .style("position", "absolute")
      .style("z-index", "-1")
      .style("left", (margin.left - axisChartSize) + "px")
      .style("top", margin.top + "px");

    let ctx = canvas.node().getContext("2d");
    ctx.clearRect(0, 0, axisChartSize, heatHeight);

    let min = Infinity;
    let max = -Infinity;
    Object.keys(sourceOverallData).forEach(function (source) {
      let sourceData = sourceOverallData[source];
      min = Math.min(min, sourceData.count);
      max = Math.max(max, sourceData.count);
    });
    var yHorizonColorScale = d3.scale.linear()
      .domain(linspace(min, max, horizonColors.length))
      .range(horizonColors);

    let widthScale = d3.scale.linear()
      .domain([min, max])
      .range([0, axisChartSize]);

    Object.keys(sourceOverallData).forEach(function (source) {
      let sourceData = sourceOverallData[source];
      ctx.fillStyle = yHorizonColorScale(sourceData.count);
      ctx.fillRect(axisChartSize, yScale(source), -widthScale(sourceData.count), yScale.rangeBand());
    });
  }

  function createGraphBrush() {
    let graphBrush = d3.svg.brush()
      .x(xScale)
      .y(yScale)
      .on("brushend", function () {
        let minExtent = graphBrush.extent()[0];
        let maxExtent = graphBrush.extent()[1];
        if (minExtent[0].toString() == maxExtent[0].toString() && minExtent[1].toString() == maxExtent[1].toString()) {
          return;
        }

        onTimeChange(minExtent[0], maxExtent[0]);
        triggerSourceExtents(minExtent[1], maxExtent[1])
      });

    graph.append("g")
      .attr("class", "x brush brush-graph")
      .call(graphBrush)
      .selectAll("rect")
      .attr("y", 1)
      .attr("height", heatHeight);

    selection.selectAll(".heatmap-tooltip").remove();
    tooltip = selection.append("div")
      .attr("class", "heatmap-tooltip vis-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("visibility", "visible");

    if (showTooltip) {
      graph.select(".brush-graph")
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
          crosshairCtx.clearRect(0, 0, heatWidth, heatHeight);
        })
        .on("mousemove", function () {
          var mouse = d3.mouse(this);
          var mouseX = mouse[0];
          var mouseY = mouse[1];
          if (showCrosshair) {
            crosshairCtx.clearRect(0, 0, heatWidth, heatHeight);
            crosshairCtx.strokeStyle = "#FF47E5";
            crosshairCtx.beginPath();
            crosshairCtx.moveTo(mouseX, heatHeight);
            crosshairCtx.lineTo(mouseX, heatHeight - 10);
            crosshairCtx.stroke();
            crosshairCtx.moveTo(0, mouseY);
            crosshairCtx.lineTo(10, mouseY);
            crosshairCtx.stroke();
          }
          var selectedTip = null;
          var lane = 0;
          canvasTooltips.forEach(function (tip) {
            if (tip.x >= mouseX && mouseX + tip.width >= tip.x) {
              if (tip.y <= mouseY && tip.y + tip.height >= mouseY) {
                selectedTip = tip;
              }
            }
          });
          if (selectedTip !== null) {
            tooltip.html(formatTooltip(selectedTip));
            let tooltipEl = tooltip[0][0];
            let left = mouseX + margin.left;
            if (left + tooltipEl.clientWidth > heatWidth) {
              left -= tooltipEl.clientWidth;
            }
            let top = mouseY;
            if (top + tooltipEl.clientHeight > heatHeight) {
              top -= tooltipEl.clientHeight;
            }
            tooltip.style("left", left + "px")
              .style("top", top + "px");
            tooltip.style("opacity", .9);
          }
          else {
            tooltip.style("opacity", 0);
          }
        });
    }
  }

  function createSourceBrush() {
    let sourceBrush = d3.svg.brush()
      .y(yScale);

    let brushRect = graph.append("g")
      .attr("class", "y brush brush-source")
      .call(sourceBrush)
      .selectAll("rect")
      .attr("y", 0)
      .attr("transform", "translate(" + (-axisChartSize - 8) + ",0)")
      .attr("width", axisChartSize + 8);

    sourceBrush
      .on("brushstart", function () {
        brushRect
          .attr("width", heatWidth + axisChartSize + 8);
      })
      .on("brushend", function () {
        brushRect
          .attr("transform", "translate(" + (-axisChartSize - 8) + ",0)")
          .attr("width", axisChartSize + 8);
        let minExtent = sourceBrush.extent()[0];
        let maxExtent = sourceBrush.extent()[1];
        if (minExtent.toString() == maxExtent.toString()) {
          return;
        }

        triggerSourceExtents(minExtent, maxExtent);
      });
  }

  function createTimeBrush() {
    let timeBrush = d3.svg.brush()
      .x(xScale);

    let brushRect = graph.append("g")
      .attr("class", "y brush brush-time")
      .call(timeBrush)
      .selectAll("rect")
      .attr("y", 1)
      .attr("transform", "translate(0," + (heatHeight) + ")")
      .attr("height", axisChartSize);

    timeBrush
      .on("brushstart", function () {
        brushRect
          .attr("transform", "translate(0, 0)")
          .attr("height", heatHeight + axisChartSize);
      })
      .on("brushend", function () {
        brushRect
          .attr("transform", "translate(0," + (heatHeight) + ")")
          .attr("height", axisChartSize);
        let minExtent = timeBrush.extent()[0];
        let maxExtent = timeBrush.extent()[1];
        if (minExtent.toString() == maxExtent.toString()) {
          return;
        }

        onTimeChange(minExtent, maxExtent);
      });

  }

  function createLegendBrush() {
    if (!showLegend) {
      return;
    }
    legendBrush = d3.svg.brush()
      .x(legendScale)
      .on("brush", function () {
        let minExtent = legendBrush.extent()[0];
        let maxExtent = legendBrush.extent()[1];
        legendExtents.min = minExtent;
        legendExtents.max = maxExtent;
        if (minExtent.toString() == maxExtent.toString()) {
          legendExtents.min = 0;
          legendExtents.max = countMax;
        }
        drawCanvas();
      });

    legend.append("g")
      .attr("class", "x brush")
      .call(legendBrush)
      .selectAll("rect")
      .attr("y", 1)
      .attr("height", legendHeight + 24);
  }

  function triggerSourceExtents(minExtent, maxExtent) {
    var selected = yScale.domain().filter(function (d) {
      let y = yScale(d);
      return minExtent <= y + yScale.rangeBand() && maxExtent >= y;
    });

    if (selected.length) {
      onSourceChange(selected);
    }
    return null;
  }

  function linspace(a, b, n) {
    let out = [];
    let delta = (b - a) / (n - 1);
    let i = 0;
    while (i < (n - 1)) {
      out.push(a + (i * delta));
      i++;
    }
    out.push(b);
    return out;
  }

  function drawCanvas() {
    let brushHeight
    selection.selectAll(".heatmap-canvas-brush").remove();
    let brush = selection.append("canvas")
      .attr("class", "heatmap-canvas-brush")
      .attr("width", "3px")
      .attr("height", "3px");


    canvasTooltips = [];
    graphCtx.clearRect(0, 0, heatWidth, heatHeight);
    let previousValue = null;
    data.forEach(function (d) {
      if (d.count !== null && d.count >= legendExtents.min && d.count <= legendExtents.max) {
        let start = xScale(d.time);
        if (heatmapType === "overall" && previousValue != d.count) {
          graphCtx.fillStyle = heatmapColorScale(d.count);
          previousValue = d.count;
        } else if (heatmapType === "bySource") {
          graphCtx.fillStyle = d.sourceColorScale(d.count);
        } else if (heatmapType === "byTime") {
          graphCtx.fillStyle = d.timeColorScale(d.count);
        }
        graphCtx.fillRect(start, yScale(d.name), xScale(d.time - interval) - start, yScale.rangeBand());
        if (showTooltip) {
          canvasTooltips.push({
            x: start,
            y: yScale(d.name),
            width: Math.abs(xScale(d.time - interval) - start),
            height: yScale.rangeBand(),
            tip: d.count,
            lane: d.name,
            time: d.time
          });
        }
      }
    });
  }

  function createHeatmapSwitcher() {
    let size = 15;
    let switcherCtx;
    selection.selectAll(".heatmap-type-text").remove();
    let switcherType = selection.append("div")
      .attr("class", "heatmap-type-text")
      .style("position", "absolute")
      .style("left", "0px")
      .style("text-align", "center")
      .style("font-size", "10px")
      .style("width", "50px")
      .style("top", (margin.top + heatHeight) + "px");
    function drawHeatmapSwitcher() {
      switcherCtx.clearRect(0, 0, size, size);
      let grad;
      if (heatmapType === "overall") {
        switcherCtx.setTransform(1, 0, 0, 1, 0, 0);
        grad = switcherCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * .7071);
      }
      else if (heatmapType === "byTime") {
        grad = switcherCtx.createLinearGradient(size / 2, size, size / 2, 0);
      }
      else if (heatmapType === "bySource") {
        grad = switcherCtx.createLinearGradient(0, size / 2, size, size / 2);
      }
      grad.addColorStop(1, 'rgba(94,79,162,1)');
      grad.addColorStop(0.75, 'rgba(102,194,165,1)');
      grad.addColorStop(0.5, 'rgba(230,245,152,1)');
      grad.addColorStop(0.25, 'rgba(244,109,67,1)');
      grad.addColorStop(0, 'rgba(158,1,66,1)');
      switcherCtx.fillStyle = grad;
      if (heatmapType === "overall") {
        switcherCtx.fillRect(0, 0, size, size);
        switcherType.node().innerHTML = "Overall";
      }
      else if (heatmapType === "byTime") {
        switcherCtx.fillRect(size / 4, 0, size / 2, size);
        switcherType.node().innerHTML = "Time";
      }
      else if (heatmapType === "bySource") {
        switcherCtx.fillRect(0, size / 4, size, size / 2);
        switcherType.node().innerHTML = "Source";
      }
    }

    selection.select(".heatmap-switcher").remove();
    let switcher = selection.append("canvas")
      .attr("class", "heatmap-switcher")
      .attr("width", size + "px")
      .attr("height", size + "px")
      .style("position", "absolute")
      .style("opacity", ".8")
      .style("cursor", "pointer")
      .style("left", (margin.left - size - 2) + "px")
      .style("top", (margin.top + heatHeight) + "px")
      .style("border", "1px solid #ddd")
      .on("click", function () {
        if (heatmapType === "overall") {
          heatmapType = "byTime";
        }
        else if (heatmapType === "byTime") {
          heatmapType = "bySource";
        }
        else {
          heatmapType = "overall";
        }
        drawHeatmapSwitcher();
        drawCanvas();
      });
    switcherCtx = switcher.node().getContext("2d");
    drawHeatmapSwitcher();
  }

  function draw() {
    selection.selectAll(".heatmap-canvas").remove();
    var canvas = selection.append("canvas")
      .attr("class", "heatmap-canvas")
      .attr("width", heatWidth)
      .attr("height", heatHeight)
      .style("position", "absolute")
      .style("z-index", "-1")
      .style("left", margin.left + "px")
      .style("top", margin.top + "px");
    graphCtx = canvas.node().getContext("2d");
    var crosshair = selection.append("canvas")
      .attr("class", "heatmap-canvas")
      .attr("width", heatWidth)
      .attr("height", heatHeight)
      .style("position", "absolute")
      .style("z-index", "-1")
      .style("left", margin.left + "px")
      .style("top", margin.top + "px");
    crosshairCtx = crosshair.node().getContext("2d");
    drawCanvas();
  }

  createGraphScales();
  createAxis();
  createGraph();
  createXBarChart();
  createYBarChart();
  createGraphBrush();
  createSourceBrush();
  createTimeBrush();

  createLegend();
  createLegendBrush();

  createHeatmapSwitcher();

  draw();
}

export default heatmap;
