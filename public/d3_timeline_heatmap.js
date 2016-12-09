(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

function heatmap () {

    function heatmap(data, settings) {
      var interval = settings.interval;
      var min = parseInt(settings.min);
      var max = parseInt(settings.max) + interval;
      var sourceHeight = settings.height;

      var selection = d3.select(this);

      var sources = data;

      // Graph dimensions
      var graphHeight = sourceHeight * sources.length;
      var margin = {top: 0, right: 20, bottom: 30, left: 70},
          width = 960 - margin.left - margin.right,
          height = graphHeight - margin.top - margin.bottom;

      var xScale, yScale;
      var xAxis, yAxis;
      var graph;
      var brush;
      var sourceNames = [];
      var legend;
      var legendScale;
      var legendHeight;
      var legendMargin;
      var ctx;

      //var colors = ["#440154","#440256","#450457","#450559","#46075a","#46085c","#460a5d","#460b5e","#470d60","#470e61","#471063","#471164","#471365","#481467","#481668","#481769","#48186a","#481a6c","#481b6d","#481c6e","#481d6f","#481f70","#482071","#482173","#482374","#482475","#482576","#482677","#482878","#482979","#472a7a","#472c7a","#472d7b","#472e7c","#472f7d","#46307e","#46327e","#46337f","#463480","#453581","#453781","#453882","#443983","#443a83","#443b84","#433d84","#433e85","#423f85","#424086","#424186","#414287","#414487","#404588","#404688","#3f4788","#3f4889","#3e4989","#3e4a89","#3e4c8a","#3d4d8a","#3d4e8a","#3c4f8a","#3c508b","#3b518b","#3b528b","#3a538b","#3a548c","#39558c","#39568c","#38588c","#38598c","#375a8c","#375b8d","#365c8d","#365d8d","#355e8d","#355f8d","#34608d","#34618d","#33628d","#33638d","#32648e","#32658e","#31668e","#31678e","#31688e","#30698e","#306a8e","#2f6b8e","#2f6c8e","#2e6d8e","#2e6e8e","#2e6f8e","#2d708e","#2d718e","#2c718e","#2c728e","#2c738e","#2b748e","#2b758e","#2a768e","#2a778e","#2a788e","#29798e","#297a8e","#297b8e","#287c8e","#287d8e","#277e8e","#277f8e","#27808e","#26818e","#26828e","#26828e","#25838e","#25848e","#25858e","#24868e","#24878e","#23888e","#23898e","#238a8d","#228b8d","#228c8d","#228d8d","#218e8d","#218f8d","#21908d","#21918c","#20928c","#20928c","#20938c","#1f948c","#1f958b","#1f968b","#1f978b","#1f988b","#1f998a","#1f9a8a","#1e9b8a","#1e9c89","#1e9d89","#1f9e89","#1f9f88","#1fa088","#1fa188","#1fa187","#1fa287","#20a386","#20a486","#21a585","#21a685","#22a785","#22a884","#23a983","#24aa83","#25ab82","#25ac82","#26ad81","#27ad81","#28ae80","#29af7f","#2ab07f","#2cb17e","#2db27d","#2eb37c","#2fb47c","#31b57b","#32b67a","#34b679","#35b779","#37b878","#38b977","#3aba76","#3bbb75","#3dbc74","#3fbc73","#40bd72","#42be71","#44bf70","#46c06f","#48c16e","#4ac16d","#4cc26c","#4ec36b","#50c46a","#52c569","#54c568","#56c667","#58c765","#5ac864","#5cc863","#5ec962","#60ca60","#63cb5f","#65cb5e","#67cc5c","#69cd5b","#6ccd5a","#6ece58","#70cf57","#73d056","#75d054","#77d153","#7ad151","#7cd250","#7fd34e","#81d34d","#84d44b","#86d549","#89d548","#8bd646","#8ed645","#90d743","#93d741","#95d840","#98d83e","#9bd93c","#9dd93b","#a0da39","#a2da37","#a5db36","#a8db34","#aadc32","#addc30","#b0dd2f","#b2dd2d","#b5de2b","#b8de29","#bade28","#bddf26","#c0df25","#c2df23","#c5e021","#c8e020","#cae11f","#cde11d","#d0e11c","#d2e21b","#d5e21a","#d8e219","#dae319","#dde318","#dfe318","#e2e418","#e5e419","#e7e419","#eae51a","#ece51b","#efe51c","#f1e51d","#f4e61e","#f6e620","#f8e621","#fbe723","#fde725"];
      //var colors = ["white" , "#440154"]; // purple
      //var colors = ['#d8daeb', '#b2abd2', '#8073ac', '#542788', '#2d004b']; // purple
      var colors = ['#fee0b6', '#fdb863', '#e08214', '#b35806', '#7f3b08']; // orange
      //var colors = ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"]; // spectral
      var countMax = 0;
      sources.forEach(function(source) {
        source.data.forEach(function(d) {
          countMax = Math.max(countMax, d.count);
        });
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
          .tickSize(5);
        yAxis = d3.svg.axis()
          .scale(yScale)
          .orient("left");
      }

      function createLegend() {
        legendHeight = 32;
        legendMargin = {top: 0, right: 20, bottom: 50, left: margin.left};
        d3.selectAll(".heatmap-legend").remove();
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

      function createGraph() {
        d3.selectAll(".heatmap-main").remove();
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
      }

      function createBrush() {
        brush = d3.svg.brush()
          .x(legendScale)
          .on("brush", function() {
            let minExtent = brush.extent()[0];
            let maxExtent = brush.extent()[1];
            if(minExtent.toString() == maxExtent.toString()) {
              filterOnLegend(0, countMax); return;
            }

            filterOnLegend(minExtent, maxExtent);
          });

        legend.append("g")
          .attr("class", "x brush")
          .call(brush)
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
          ctx.clearRect(0, 0, width, height);
          sources.forEach(function(source) {
            source.data.forEach(function(d) {
              if(d.count >= minExtent && d.count <= maxExtent) {
                let start = xScale(d.time);
                ctx.fillStyle = colorScale(d.count);
                ctx.fillRect(start, yScale(source.name), xScale(d.time-interval) - start, yScale.rangeBand());
              }
            });
          });
      }

      function draw() {
        d3.selectAll(".heatmap-canvas").remove();
        var canvas = selection.append("canvas")
          .attr("class", "heatmap-canvas")
          .attr("width", width)
          .attr("height", height)
          .style("position", "relative")
          .style("left", margin.left + "px")
          .style("bottom", height + margin.top + margin.bottom + legendHeight + legendMargin.top + legendMargin.bottom + 10 + "px");
        ctx = canvas.node().getContext("2d");
        drawCanvas(0, countMax);
      }

      createScales();
      createAxis();
      createGraph();

      createLegend();
      createBrush();

      draw();
    }

    return heatmap;
}

exports.heatmap = heatmap;

Object.defineProperty(exports, '__esModule', { value: true });

})));
