function heatmap(element, data, settings) {
  var interval = settings.interval;
  var min = parseInt(settings.min);
  var max = parseInt(settings.max) + interval;
  var onTimeChange = settings.onTimeChange;
  var formatTooltip = settings.formatTooltip;
  var showTooltip = settings.showTooltip;
  var showLegend = settings.showLegend;
  var xAxisFormatter = settings.xAxisFormatter;

  var selection = d3.select(element);
  var visualizeEl = element.parentNode.parentNode;

  var sources = data;

  // Graph dimensions
  var graphHeight = visualizeEl.clientHeight - 20;
  var margin = {top: 10, right: 20, bottom: 30, left: 70},
  width = visualizeEl.clientWidth - margin.left - margin.right,
  height = graphHeight - margin.top - margin.bottom;

  var xScale, yScale;
  var xAxis, yAxis;
  var timeBrush;
  var graph;
  var sourceNames = [];
  var legend;
  var legendScale;
  var legendHeight = 16;
  var legendMargin = {top: 0, right: 20, bottom: 20, left: margin.left};
  if(showLegend) {
    height -= (legendHeight + legendMargin.top + legendMargin.bottom);
  }
  var legendBrush;
  var ctx, canvasTooltips, tooltip;

  var colorTypes = new Map();
  colorTypes.set('Spectral', ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"]);
  colorTypes.set('Orange', ['#fee0b6', '#fdb863', '#e08214', '#b35806', '#7f3b08']);
  colorTypes.set('Purple', ['#d8daeb', '#b2abd2', '#8073ac', '#542788', '#2d004b']);
  var colors = colorTypes.get(settings.colorType);
  var countMax = 0;
  var data = [];
  sources.forEach(function(source) {
    source.data.forEach(function(d) {
      countMax = Math.max(countMax, d.count);
      d.name = source.name;
      data.push(d);
    });
  });
  data.sort(function(a, b) {
    return d3.ascending(a.count, b.count);
  });
  var colorScale = d3.scale.linear()
    .domain(linspace(0, countMax, colors.length))
    .range(colors);


  function createScales() {
    xScale = d3.time.scale()
      .domain([min, max])
      .range([0, width])

      sources.forEach(function(source) {
        sourceNames.push(source.name);
      });

    yScale = d3.scale.ordinal()
      .domain(sourceNames)
      .rangeBands([0, height], .2);
  }

  function createAxis() {
    xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(xAxisFormatter)
      .tickSize(5);
    yAxis = d3.svg.axis()
      .scale(yScale)
      .orient("left");
  }

  function createLegend() {
    selection.selectAll(".heatmap-legend").remove();
    if(!showLegend) {
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

    let pct = linspace(0, 100, colors.length).map(function(d) {
      return Math.round(d) + '%';
    });

    let colourPct = d3.zip(pct, colors);
    colourPct.forEach(function(d) {
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
    while (textLength > (margin.left-12) && text.length > 0) {
      text = text.slice(0, -1);
      self.text(text + '...');
      textLength = self.node().getComputedTextLength();
    }
  }

  function createGraph() {
    selection.selectAll(".heatmap-main").remove();
    graph = selection.append("svg")
      .attr("class", "heatmap-main")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    graph.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    graph.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

    let graphYAxis = d3.select(".axis--y");
    graphYAxis.selectAll(".tick")
      .selectAll("text")
      .html("")
      .append('tspan').text(function(d) {
        return d;
      })
      // .attr("full-text", function(d) {return d})
      .each(truncateText)
      .append('title').text(function(d) {
        return d;
      });
  }

  function createTimeBrush() {
    timeBrush = d3.svg.brush()
      .x(xScale)
      .on("brushend", function() {
        let minExtent = timeBrush.extent()[0];
        let maxExtent = timeBrush.extent()[1];
        if(minExtent.toString() == maxExtent.toString()) {
          return;
        }

        onTimeChange(minExtent, maxExtent);
      });

    graph.append("g")
      .attr("class", "x brush brush-time")
      .call(timeBrush)
      .selectAll("rect")
      .attr("y", 1)
      .attr("height", height);

    selection.selectAll(".heatmap-tooltip").remove();
    tooltip = selection.append("div")
      .attr("class", "heatmap-tooltip vis-tooltip")
      .style("opacity" , 0)
      .style("position" , "absolute")
      .style("visibility" , "visible");

    if(showTooltip) {
      graph.select(".brush-time")
        .on("mouseout", function() {
          tooltip.style("opacity", 0);
        })
      .on("mousemove", function() {
        var mouse = d3.mouse(this);
        var mouseX = mouse[0];
        var mouseY = mouse[1];
        var selectedTip = null;
        var lane = 0;
        canvasTooltips.forEach(function(tip) {
          if(tip.x >= mouseX && mouseX + tip.width >= tip.x) {
            if(tip.y <= mouseY && tip.y + tip.height >= mouseY) {
              selectedTip = tip;
            }
          }
        });
        if(selectedTip !== null) {
          tooltip.html(formatTooltip(selectedTip));
          let tooltipEl = tooltip[0][0];
          let left = mouseX + margin.left;
          if(left + tooltipEl.clientWidth > width) {
            left -= tooltipEl.clientWidth;
          }
          let top = mouseY;
          if(top + tooltipEl.clientHeight > height) {
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

  function createLegendBrush() {
    if(!showLegend) {
      return;
    }
    legendBrush = d3.svg.brush()
      .x(legendScale)
      .on("brush", function() {
        let minExtent = legendBrush.extent()[0];
        let maxExtent = legendBrush.extent()[1];
        if(minExtent.toString() == maxExtent.toString()) {
          filterOnLegend(0, countMax); return;
        }

        filterOnLegend(minExtent, maxExtent);
      });

    legend.append("g")
      .attr("class", "x brush")
      .call(legendBrush)
      .selectAll("rect")
      .attr("y", 1)
      .attr("height", legendHeight + 24);
  }

  function linspace(a, b, n) {
    let out = [];
    let delta = (b - a) / (n - 1);
    let i = 0;
    while(i < (n - 1)) {
      out.push(a + (i * delta));
      i++;
    }
    out.push(b);
    return out;
  }

  function filterOnLegend(minExtent, maxExtent) {
    drawCanvas(minExtent, maxExtent);
  }

  function drawCanvas(minExtent, maxExtent) {
    canvasTooltips = [];
    ctx.clearRect(0, 0, width, height);
    let previousValue = null;
    data.forEach(function(d) {
      if(d.count !== null && d.count >= minExtent && d.count <= maxExtent) {
        let start = xScale(d.time);
        if(previousValue != d.count) {
          ctx.fillStyle = colorScale(d.count);
          previousValue = d.count;
        }
        ctx.fillRect(start, yScale(d.name), xScale(d.time-interval) - start, yScale.rangeBand());
        if(showTooltip) {
          canvasTooltips.push({
            x: start,
            y: yScale(d.name),
            width: Math.abs(xScale(d.time-interval) - start),
            height: yScale.rangeBand(),
            tip: d.count,
            lane: d.name,
            time: d.time
          });
        }
      }
    });
  }

  function draw() {
    selection.selectAll(".heatmap-canvas").remove();
    var canvas = selection.append("canvas")
      .attr("class", "heatmap-canvas")
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("z-index", "-1")
      .style("left", margin.left + "px")
      .style("top", margin.top + "px");
    ctx = canvas.node().getContext("2d");
    drawCanvas(0, countMax);
  }

  createScales();
  createAxis();
  createGraph();
  createTimeBrush();

  createLegend();
  createLegendBrush();

  draw();
}

export default heatmap;
