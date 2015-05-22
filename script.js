/*jslint browser: true*/
/*jshint -W055 */
/*global $, c3, Mustache, pb*/ 

(function () {
   'use strict';
	var pb = {};

	var destroyCharts = function(charts){
		for(var i = 0 ; i<charts.length; i++){
			if(pb[charts[i]]) {
				pb[charts[i]].destroy();
				delete pb[charts[i]];
			}
		}
	};
	
	var addChart = function(item){
		destroyCharts([item+'-chart']);

		var id = $($('.chart-panel:not(:has(*))')[0]).attr('id');
		var chartOptions = {
			bindto: '#'+id,
			data: {
				x: 'x',
				columns: pb.data[item].trend
			},
			padding: {
				right: 30
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
						format: function (x) { 
							if (x === parseInt(x, 10)) return x;
							else return x.toFixed(2);
						}
					},
					min : pb.data[item].axis.min,
					max : pb.data[item].axis.max
				}
			},
			regions: [
				{axis: 'y', start: pb.data[item].normal.min, end: pb.data[item].normal.max, class: 'regionX'}
			]
		};

		pb[item+'-chart'] = c3.generate(chartOptions);
	};

	pb.wireUpPages = function () {
		var template = $('#value-panel').html();
		var valItemTemplate = $('#value-item').html();
		Mustache.parse(template);
		Mustache.parse(valItemTemplate);
		$('#normal-panel').html(Mustache.render(template, {
			"heading" : "Normal values",
			"panel-type" : "success",
			"items" : pb.normal
		},{"value-item":valItemTemplate}));
		$('#abnormal-panel').html(Mustache.render(template, {
			"heading" : "Abnormal values",
			"panel-type" : "danger",
			"items" : pb.abnormal
		},{"value-item":valItemTemplate}));
		
		$('.value-item').on('click', function(){
			var item = $(this).data('mx');
			if($(this).hasClass('selected')){
				destroyCharts([item+'-chart']);
			} else {
				addChart(item);
			}
			$(this).toggleClass('selected');
		});
	}; 

	pb.loadData = function(callback) {
		$.getJSON("data.json", function(file) {
			pb.data = file;
			pb.normal = [];
			pb.abnormal = [];
			for(var o in file){
				if(file[o].value>=file[o].normal.min && file[o].value <= file[o].normal.max) {
					pb.normal.push({name:o,value:file[o].value,units:file[o].units});
				} else {
					pb.abnormal.push({name:o,value:file[o].value,units:file[o].units});
				}
			}
			
			callback();
		});
	};
	
	window.pb = pb;
})();

/******************************************
*** This happens when the page is ready ***
******************************************/
$(document).on('ready', function () {
	//Load the data then wire up the events on the page
	pb.loadData(pb.wireUpPages);
	
	$('#chart-panels .panel-body').niceScroll();
});