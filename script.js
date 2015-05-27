/*jslint browser: true*/
/*jshint -W055 */
/*global $, c3, d3, Mustache, pb*/

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

  var getDateString = function(date){
    var m = date.getMonth()+1;
    var d = date.getDate();
    return date.getFullYear() + "-" + (m<10 ? "0" : "")+m+"-"+(d<10 ? "0" : "")+d;
  };

  var slideUpCharts = function(){
    var nextSlot = [];

    //for each panel
    $('.chart-panel').children().each(function(index, value){
      if(index%2 !== 0) return;
      if($(value).not(':has(*)').length>0){
        nextSlot.push($(value).attr('id'));
      } else if(nextSlot.length>0) {
        var id = nextSlot[0];

        $('#'+id).parent().before($(value).parent());
      }
    });
  };

  var addChart = function(item) {
    destroyCharts([item + '-chart']);

    var id = $($('.chart-panel').children(':not(:has(*))')[0]).attr('id');
    if(!id) return false;
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
      tooltip:{
        format: {
          title: function(x) {
            return getDateString(x) + " - Source: " + pb.data[item].sources[getDateString(x)];
          }
        }
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

    return true;
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
        $(this).removeClass('selected');
      } else {
        if(addChart(item)) $(this).addClass('selected');
      }
      slideUpCharts();
    });
  };

  var getTrend = function(values, name){
    var x = ["x"];
    var vals = [name];

    for(var i = 0; i < values.length; i++){
      x.push(values[i].date);
      vals.push(values[i].value);
    }

    return [x, vals];
  };

  var getSources = function(values){
    var x = {};

    for(var i = 0; i < values.length; i++){
      x[values[i].date] = values[i].source;
    }

    return x;
  };

  var getProps = function(values){
    var min = values[0].value;
    var max = values[0].value;
    var tot = 0;

    for(var i = 1; i < values.length; i++){
      tot += values[i].value;
      if(values[i].value < min) min = values[i].value;
      if(values[i].value > max) max = values[i].value;
    }
    var mean = Math.round(100 * tot / values.length) / 100;

    return {"mean" : mean, "max" : max, "min" : min};
  };

  pb.loadData = function(callback) {
    $.getJSON("data.json", function(file) {
      pb.data = file;
      pb.all = [];
      pb.normal = [];
      pb.abnormal = [];
      var index = 0;
      for (var o in file) {
        file[o].name = o;
        file[o].chartid = "chart-" + index++;
        file[o].trend = getTrend(file[o].values, o);
        file[o].date = file[o].trend[0][file[o].trend[0].length-1];
        file[o].value = file[o].trend[1][file[o].trend[1].length-1];
        file[o].source = file[o].values[file[o].values.length-1].source;
        file[o].sources = getSources(file[o].values);
        file[o].props = getProps(file[o].values);
        if (file[o].value >= file[o].normal.min && file[o].value <= file[o].normal.max) {
          pb.normal.push(file[o]);
        } else {
          pb.abnormal.push(file[o]);
        }
        file[o].inRange = (file[o].value >= file[o].normal.min && file[o].value <= file[o].normal.max ? "normal" : "abnormal");
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
