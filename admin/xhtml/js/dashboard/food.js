

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	
	var screenWidth = $(window).width();
	//let draw = Chart.controllers.line.__super__.draw; //draw shadow
		var donutChart = function(){
		$("span.donut").peity("donut", {
			width: "80",
			height: "80"
		});
	}	
		
				
	
 
	/* Function ============ */
		return {
			init:function(){
			},
			
			
			load:function(){
				donutChart();
			},
			
			resize:function(){
				
			}
		}
	
	}();

	
		
	jQuery(window).on('load',function(){
		setTimeout(function(){
			dlabChartlist.load();
		}, 1000); 
		
	});

     

})(jQuery);