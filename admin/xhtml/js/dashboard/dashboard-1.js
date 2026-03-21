

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	var screenWidth = $(window).width();
		//let draw = Chart.controllers.line.__super__.draw; //draw shadow
	var marketChart = function(){
		 var options = {
          series: [{
          name: '이번 주',
          data: [0, 0, 0, 0, 0, 0]
        }, {
          name: '지난 주',
          data: [0, 0, 0, 0, 0, 0]
        }],
          chart: {
          height: 280,
          type: 'area',
		  toolbar:{
			  show:false
		  }
        },
		colors:["var(--rgba-primary-1)","#f5a792"],
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth',
		  width:3,
		  colors:["var(--primary)","var(--secondary)"],
        },
		legend:{
			show:false
		},
		grid:{
			show:false,
			strokeDashArray: 6,
			borderColor: '#dadada',
		},
		yaxis: {
		  labels: {
			style: {
				colors: '#B5B5C3',
				fontSize: '12px',
				fontFamily: 'Poppins',
				fontWeight: 400
				
			},
			formatter: function (value) {
			  return value + "명";
			}
		  },
		},
        xaxis: {
          categories: ["1주차","2주차","3주차","4주차","5주차","6주차"],
		  labels:{
			  style: {
				colors: '#B5B5C3',
				fontSize: '12px',
				fontFamily: 'Poppins',
				fontWeight: 400
				
			},
		  }
        },
		fill:{
			type:'solid',
			opacity:0.05
		},
        tooltip: {
          y: {
            formatter: function (val) {
              return (typeof val !== "undefined" ? val : 0) + "명";
            }
          }
        },
        };

        var chart = new ApexCharts(document.querySelector("#marketChart"), options);
        chart.render();
        if (typeof window !== "undefined") {
          window.boostDashboardMarketChart = chart;
        }

		jQuery('#dzOldSeries').on('change',function(){
			jQuery(this).toggleClass('disabled');
			chart.toggleSeries('이번 주');
		});
		
		jQuery('#dzNewSeries').on('change',function(){
			jQuery(this).toggleClass('disabled');
			chart.toggleSeries('지난 주');
		});
	}
	var chartTimeline = function(){
		
		var optionsTimeline = {
			chart: {
				type: "bar",
				height: 300,
				stacked: true,
				toolbar: {
					show: false
				},
				sparkline: {
					//enabled: true
				},
				backgroundBarRadius: 5,
				offsetX: -10,
			},
			series: [
				 {
					name: "New Clients",
					data: [20, 40, 60, 35, 50, 70, 30, 15, 35, 40, 50, 60, 75, 40, 25, 70, 20, 40, 65, 50]
				},
				{
					name: "Retained Clients",
					data: [-28, -32, -12, -5, -35, -10, -30, -29, -18, -25, -38, -12, -22, -39, -35, -30, -10, -20, -35, -38]
				} 
			],
			
			plotOptions: {
				bar: {
					columnWidth: "45%",
					endingShape: "rounded",
					colors: {
						backgroundBarColors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
						backgroundBarOpacity: 1,
						backgroundBarRadius: 5,
						opacity:0
					},

				},
				distributed: true
			},
			colors:['var(--primary)', 'var(--secondary)'],
			
			grid: {
				show: true,
			},
			legend: {
				show: false
			},
			fill: {
				opacity: 1
			},
			dataLabels: {
				enabled: false,
				colors:['#dd2f6e', '#3e4954'],
				dropShadow: {
					enabled: true,
					top: 1,
					left: 1,
					blur: 1,
					opacity: 1
				}
			},
			xaxis: {
				categories: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
				labels: {
					style: {
						colors: '#787878',
						fontSize: '13px',
						fontFamily: 'Poppins',
						fontWeight: 400
						
					},
				},
				crosshairs: {
					show: false,
				},
				axisBorder: {
					show: false,
				},
			},
			
			yaxis: {
				//show: false
				labels: {
					style: {
						colors: '#787878',
						fontSize: '13px',
						fontFamily: 'Poppins',
						fontWeight: 400
						
					},
				},
			},
			
			tooltip: {
				x: {
					show: true
				}
			}
    };
		var chartTimelineRender =  new ApexCharts(document.querySelector("#chartTimeline"), optionsTimeline);
		 chartTimelineRender.render();
	}
	var overiewChart = function(){
		 /* 기본 탭 「주」와 동일하게 7일치 매출 데모 */
		 var options = {
          series: [{
          name: '월별 매출',
          type: 'column',
          data: [75, 85, 72, 100, 50, 100, 80]
        }, {
          name: '누적 매출',
          type: 'area',
          data: [44, 65, 55, 75, 45, 55, 40]
        }, {
          name: '목표 대비',
          type: 'line',
          data: [30, 25, 45, 30, 25, 35, 20]
        }],
          chart: {
          height: 300,
          type: 'line',
          stacked: false,
		  toolbar: {
				show: false,
			},
        },
        stroke: {
          width: [0, 1, 1],
          curve: 'straight',
		  dashArray: [0, 0, 5]
        },
		legend: {
			fontSize: '13px',
			fontFamily: 'poppins',
			 labels: {
				  colors:'#888888', 
			 }
		},
        plotOptions: {
          bar: {
            columnWidth: '18%',
			 borderRadius:6	,
          }
        },
        
        fill: {
          //opacity: [0.1, 0.1, 1],
		  type : 'gradient',
          gradient: {
            inverseColors: false,
            shade: 'light',
            type: "vertical",
            /* opacityFrom: 0.85,
            opacityTo: 0.55, */
			colorStops : [
				[
					{
					  offset: 0,
					  color: 'var(--primary)',
					  opacity: 1
					},
					{
					  offset: 100,
					  color: 'var(--primary)',
					  opacity: 1
					}
				],
				[
					{
					  offset: 0,
					  color: '#3AC977',
					  opacity: 1
					},
					{
					  offset: 0.4,
					  color: '#3AC977',
					  opacity: .15
					},
					{
					  offset: 100,
					  color: '#3AC977',
					  opacity: 0
					}
				],
				[
					{
					  offset: 0,
					  color: '#FF5E5E',
					  opacity: 1
					},
					{
					  offset: 100,
					  color: '#FF5E5E',
					  opacity: 1
					}
				],
			],
            stops: [0, 100, 100, 100]
          }
        },
		colors:["var(--primary)","#3AC977","#FF5E5E"],
        markers: {
          size: 0
        },
        xaxis: {
          type: 'category',
		  categories: ['일', '월', '화', '수', '목', '금', '토'],
		  labels: {
			   style: {
				   fontSize: '13px',
				   colors:'#888888',
			   },
		  },
		  
        },
        yaxis: {
          min: 0,
		  tickAmount: 4,
		  labels: {
			   style: {
				   fontSize: '13px',
				   colors:'#888888',
			   },
			   formatter: function (val) {
			     return (typeof val !== "undefined" ? val : 0) + "만";
			   }
		  },
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function (y) {
              if (typeof y !== "undefined") {
                return y.toFixed(0) + "만원";
              }
              return y;
        
            }
          }
        }
        };

        var chart = new ApexCharts(document.querySelector("#overiewChart"), options);
        chart.render();
        if (typeof window !== "undefined") {
          window.boostDashboardRevenueChart = chart;
        }
		/* 매출 탭 전환은 dashboard-live-data.js에서 Firestore 기준으로 처리 */
	 
	}
	var NewCustomers = function(){
			var options = {
					  series: [
						{
							name: 'Net Profit',
							data: [70, 150, 100, 200, 100, 150, 150,70],
						}, 				
					],
					chart: {
						type: 'area',
						height: 100,
						width: 400,
						toolbar: {
							show: false,
						},
						zoom: {
							enabled: false
						},
						sparkline: {
							enabled: true
						}
						
					},
			
					colors:['#2696FD'],
					
					dataLabels: {
					  enabled: false,
					},

				legend: {
					show: false,
				},
				stroke: {
				  show: true,
				  width: 3,
				  curve:'smooth',
				  colors:['#4CBC9A'],
				},
			
				 states: {
						normal: {
							filter: {
								type: 'none',
								value: 0
							}
						},
						hover: {
							filter: {
								type: 'none',
								value: 0
							}
						},
						active: {
							allowMultipleDataPointsSelection: false,
							filter: {
								type: 'none',
								value: 0
							}
						}
				},
					xaxis: {
						categories: ['Jan', 'feb', 'Mar', 'Apr', 'May'],
						axisBorder: {
							show: false,
						},
						axisTicks: {
							show: false
						},
						labels: {
							show: false,
							style: {
								fontSize: '12px',
							}
						},
						crosshairs: {
							show: false,
							position: 'front',
							stroke: {
								width: 2,
								dashArray: 3
							}
						},
						tooltip: {
							enabled: true,
							formatter: undefined,
							offsetY: 0,
							style: {
								fontSize: '12px',
							}
						}
					},
				yaxis: {
					show: false,
				},
				fill: {
					type:'solid',
				  opacity: 0.1,
				  colors:'#4CBC9A'
				},
				tooltip: {
					enabled:false,
					style: {
						fontSize: '12px',
					},
					y: {
						formatter: function(val) {
							return "$" + val + " thousands"
						}
					}
				},
				responsive:[
					{
						breakpoint: 1601,
						options:{
							chart: {
								height:80,
							},
							
						},
						breakpoint: 1401,
						options:{
							chart: {
								width:'100%',
							},
							
						}
					}
				]
			};
            var chartBar1 = new ApexCharts(document.querySelector("#NewCustomers"), options);
            chartBar1.render();
        }
		
	var swipercard = function() {
		var swiper = new Swiper('.mySwiper-counter', {
			speed: 1500,	
			slidesPerView: 4,
			spaceBetween: 40,
			parallax: true,
			loop:false,
			breakpoints: {
				
			  300: {
				slidesPerView: 1,
				spaceBetween: 30,
			  },	
			  576: {
				slidesPerView: 2,
				spaceBetween: 30,
			  },
			  991: {
				slidesPerView: 3,
				spaceBetween: 30,
			  },
			  1200: {
				slidesPerView: 4,
				spaceBetween: 30,
			  },
			},
		});
	}
	
	var handleDatetimepicker = function(){
		if(jQuery("#datetimepicker1").length>0) {
			$('#datetimepicker1').datetimepicker({
				inline: true,
			});
		}
	}
	var chartBarRunning = function(){
		var options  = {
			series: [
				{
					name: 'Income',
					data: [51, 98, 75,35, 64, 44,44]
				}, 
				{
				  name: 'Expense',
				   data: [23, 32, 45,75, 35, 66, 84]
				}, 
				
			],
			chart: {
			type: 'bar',
			height: 300,
			
			
			toolbar: {
				show: false,
			},
			
		},
		plotOptions: {
		  bar: {
			horizontal: false,
			endingShape:'rounded',
			columnWidth: '45%',
			borderRadius: 5,
			
		  },
		},
		colors:[ '#FCC43E','#FB7D5B'],
		dataLabels: {
		  enabled: false,
		},
		markers: {
			shape: "circle",
		},
		legend: {
			show: false,
			fontSize: '12px',
			labels: {
				colors: '#000000',
				
				},
			markers: {
			width: 30,
			height: 30,
			strokeWidth: 0,
			strokeColor: '#fff',
			fillColors: undefined,
			radius: 35,	
			}
		},
		stroke: {
			show: true,
			width: 6,
		},
		xaxis: {
			categories: ['Mon', 'Tue', 'Wed','Thu','Fri','Sat','Sun'],
			labels: {
				style: {
					fontSize: '13px',
					fontFamily: 'poppins',
					fontWeight: 100,
					cssClass: 'apexcharts-xaxis-label',
				},
			},
			axisBorder: {
				show: false,
			},
			axisTicks: {
				show: false,
				borderType: 'solid',
				color: '#78909C',
				height: 6,
				offsetX: 0,
				offsetY: 0
			},
			crosshairs: {
				show: false,
			}
		},
		yaxis: {
			labels: {
				offsetX:-16,
				style: {
					fontSize: '13px',
					fontFamily: 'poppins',
					fontWeight: 100,
					cssClass: 'apexcharts-xaxis-label',
				},
			},
		},
		fill: {
		  opacity: 1,
		},
		tooltip: {
		  y: {
			formatter: function (val) {
			  return "$ " + val + " thousands"
			}
		  }
		},
		grid: {
			borderColor: '#C1BBEB',
			xaxis: {
				lines: {
					show: false
				},
			},
			yaxis: {
				lines: {
					show: true
				},
			},  
		},
		responsive: [{
			breakpoint: 575,
			options: {
				plotOptions: {
				  bar: {
					columnWidth: '1%',
					borderRadius: -1,
				  },
				},
				chart:{
					height:250,
				},
				series: [
					{
						name: 'Projects',
						 data: [31, 40, 28,31, 40, 28,31, 40]
					}, 
					{
					  name: 'Projects',
					   data: [11, 32, 45,31, 40, 28,31, 40]
					}, 
					
				],
			}
		 }]
		};

		if(jQuery("#chartBarRunning").length > 0){

			var chart = new ApexCharts(document.querySelector("#chartBarRunning"), options);
			chart.render();
            
            jQuery('#dzOldSeries1').on('change',function(){
                jQuery(this).toggleClass('disabled');
                chart.toggleSeries('Income');
            });
            
            jQuery('#dzNewSeries1').on('change',function(){
                jQuery(this).toggleClass('disabled');
                chart.toggleSeries('Expense');
            });
            
		}
			
	}
	
	
 
	/* Function ============ */
		return {
			init:function(){
		},
			
			
			load:function(){
				handleDatetimepicker();
				chartBarRunning();
				swipercard();
				marketChart();
				//NewCustomers();
				//chartTimeline();
				overiewChart();
			},
			
			resize:function(){
				chartBarRunning();
			}
		}
	}();

	
		
	jQuery(window).on('load',function(){
		setTimeout(function(){
			dlabChartlist.load();
		}, 1000); 
		
	});

     

})(jQuery);