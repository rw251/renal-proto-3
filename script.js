/*jslint browser: true*/
/*jshint -W055 */
/*global $, c3, Mustache, pb*/

(function() {
  'use strict';
  var pb = {};

  var destroyCharts = function(charts) {
    for (var i = 0; i < charts.length; i++) {
      if (pb[charts[i]]) {
        pb[charts[i]].destroy();
        delete pb[charts[i]];
      }
    }
  };

  var addRange = function(item) {
    destroyCharts([item.chartid + '-chart']);

    var chartOptions = {
      bindto: '#'+item.chartid,
      data: {
        columns: [
          []
        ]
      },
      size: {
        height: 50
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      axis: {
        x: {
          min: item.axis.min,
          max: item.axis.max,
          show: false,
          padding: 0,
          height: 0
        },
        y: {
          show: false
        }
      },
      regions: [{
        axis: 'x',
        end: item.normal.min,
        class: 'regionLow'
      }, {
        axis: 'x',
        start: item.normal.min,
        end: item.normal.max,
        class: 'regionNormal'
      }, {
        axis: 'x',
        start: item.normal.max,
        class: 'regionHigh'
      }],
      grid: {
        x: {
          lines: [{
            value: item.value,
            class: 'range-label'
          }]
        }
      }
    };

    pb[item.chartid + '-chart'] = c3.generate(chartOptions);
  };

  var addChart = function(item) {
    destroyCharts([item + '-chart']);

    var id = $($('.chart-panel').children(':not(:has(*))')[0]).attr('id');
    var chartOptions = {
      bindto: '#'+id,
      data: {
        x: 'x',
        columns: pb.data[item].trend
      },
      padding: {
        right: 30
      },
      zoom: {
        enabled: true
      },
      legend: {
        show:false
      },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            format: '%Y-%m-%d',
            count: 9,
            culling: {
              max: 6
            }
          }
        },
        y: {
          tick: {
            format: function(x) {
              if (x === parseInt(x, 10)) return x;
              else return x.toFixed(2);
            }
          },
          min: pb.data[item].axis.min,
          max: pb.data[item].axis.max
        }
      },
      regions: [{
        axis: 'y',
        start: pb.data[item].normal.min,
        end: pb.data[item].normal.max,
        class: 'regionX'
      }]
    };

    pb[item + '-chart'] = c3.generate(chartOptions);

    var template = $('#range-panel').html();
    Mustache.parse(template);

    $('#' +id).siblings().html(Mustache.render(template, pb.data[item]));
    //Add title
    d3.select('#'+id + ' svg').append('text')
    .attr('x', d3.select('#'+id + ' svg').node().getBoundingClientRect().width / 5)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .style('font-size', '1.4em')
    .style('font-weight', '600')
    .text(pb.data[item].fullname + ' (' + pb.data[item].units +')');
  };

  pb.wireUpPages = function() {
    var template = $('#value-panel').html();
    var valItemTemplate = $('#value-item').html();
    Mustache.parse(template);
    Mustache.parse(valItemTemplate);
    $('#normal-panel .panel-body').html(Mustache.render(template, {
      "items" : pb.normal
    },{"value-item":valItemTemplate}));
    $('#abnormal-panel .panel-body').html(Mustache.render(template, {
      "items" : pb.abnormal
    },{"value-item":valItemTemplate}));

    $('.value-item').on('click', function(){
      var item = $(this).data('mx');
      if($(this).hasClass('selected')){
        $(pb[item+'-chart'].element).siblings().html("");
        destroyCharts([item+'-chart']);
      } else {
        addChart(item);
      }
      $(this).toggleClass('selected');
    });

  //  $('.value-panel > .panel > .panel-body').getNiceScroll().resize();
  };

  pb.loadData = function(callback) {
    $.getJSON("data.json", function(file) {
      pb.data = file;
      pb.all = [];
      pb.normal = [];
      pb.abnormal = [];
      var index = 0;
      for (var o in file) {
        if (file[o].value >= file[o].normal.min && file[o].value <= file[o].normal.max) {
          pb.normal.push(file[o]);
        } else {
          pb.abnormal.push(file[o]);
        }
        file[o].name = o;
        file[o].chartid = "chart-" + index++;
        file[o].date = file[o].trend[0][file[o].trend[0].length - 1];
        if (file[o].trend[1].length > 1) {
          file[o].change = Math.round((file[o].trend[1][file[o].trend[1].length - 1] - file[o].trend[1][file[o].trend[1].length - 2]) * 100) / 100;
        } else {
          file[o].change = 0;
        }

        file[o].direction = file[o].change > 0 ? "-up" : (file[o].change < 0 ? "-down" : "s-h");

        pb.all.push(file[o]);
      }

      callback();
    });
  };

  window.pb = pb;
})();

/******************************************
 *** This happens when the page is ready ***
 ******************************************/
$(document).on('ready', function() {
  //Load the data then wire up the events on the page
  pb.loadData(pb.wireUpPages);

  $('#chart-panels .panel-body').niceScroll();
  $('.value-panel > .panel > .panel-body').niceScroll();
});
