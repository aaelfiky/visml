import * as d3 from 'd3';
import * as ajax from 'phovea_core/src/ajax';
import {getAPIData, getAPIJSON} from 'phovea_core/src/ajax';


export default class Test{

  //declaring fields
  chart: boolean; // tells whether the first chart was ready or not

  constructor() {

    this.chart = false;
    this.build();

  }

  // get all data (tsne projections, all prediction probs for test images,
  // all pred vs labels for all test images)
  getAlldata(){
    return ajax.getAPIJSON(`/mnist-files/tsne/`);
  }

  build() {
      let scroll = false;
      let done = false;
      this.getAlldata().then((result)=> {
        let chart = false;

        let $ml_container = d3.select("body").select("#ml-container");
        let $p = $ml_container.append("p").attr("id", "g1");

        let data_brushed_handle = [];
        let tsne_data = [];
        for (let i = 0; i < result.list.length; i++) {
          let classify = false;
          if (result.pl[i][0] == result.pl[i][1]) {
            classify = true;
          }
          tsne_data.push(
            {
              x: result.list[i][0],
              y: result.list[i][1],
              index: i,
              selected: false,
              c: classify,
              predicted: result.pl[i][0],
              actual: result.pl[i][1],
              prb: result.prob[i]
            }
          );
        }


        var margin = {top: 20, right: 20, bottom: 30, left: 50};
        let width = 600 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

        var quadtree = d3.geom.quadtree()
          .extent([[-1, -1], [width + 1, height + 1]])
          (tsne_data);

        var x = d3.scale.linear()
          .range([0, width]);

        var y = d3.scale.linear()
          .range([height, 0]);

        var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

        var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

        var svg = d3.select("#g1").append("svg")
          .attr("id", "g1_svg")
          .attr("data-margin-right", margin.right)
          .attr("data-margin-left", margin.left)
          .attr("data-margin-top", margin.top)
          .attr("data-margin-bottom", margin.bottom)
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        x.domain(d3.extent(tsne_data, function (d) {
          return d.x;
        })).nice();
        y.domain(d3.extent(tsne_data, function (d) {
          return d.y;
        })).nice();

        svg.append("g")
          .attr("class", "x axis ")
          .attr('id', "axis--x")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        svg.append("g")
          .attr("class", "y axis")
          .attr('id', "axis--y")
          .call(yAxis);

        var dot = svg.selectAll(".dot")
          .data(tsne_data)
          .enter().append("circle")
          .attr("class", "dot")
          .attr("r", 5)
          .attr("cx", function (d) {
            return x(d.x);
          })
          .attr("cy", function (d) {
            return y(d.y);
          })
          .attr("opacity", 0.7)
          // .style("fill", "#4292c6");
          .style("fill", function (d) {
            if (d.actual == d.predicted) {
              return "#008000";
            }
            else {
              return "#FF0000";
            }
          });

        var brush = d3.svg.brush()
          .x(x)
          .y(y)
          .on("brush", brushed);

        svg.append("g")
          .call(brush);


        function brushed() {

          // data_brushed = [];
          var e = brush.extent(),
            x0 = e[0][0],
            y0 = e[0][1],
            dx = e[1][0] - x0,
            dy = e[1][1] - y0;
          handleBrush(e);



        }

        function handleBrush(selection) {
          data_brushed_handle = [];
          let $svg = d3.select("#chart").remove();
          chart = false;
          var x0 = selection[0][0],
            y0 = selection[0][1],
            dx = selection[1][0],
            dy = selection[1][1];
          tsne_data.forEach(function (d, i) {
            if (d.x >= x0 && d.x <= dx && d.y >= y0 && d.y <= dy) {
              data_brushed_handle.push(d.index);
              d.selected = true;
            }
            else {
              d.selected = false;
            }
          });

          if (!scroll) {
            let max = Math.min(data_brushed_handle.length, 150);

            let $spriteDiv = d3.select("#ml-container")
              .append("div")
              .attr("id", "scroll-div");
            scroll = true;
            let images = [];
            let num = 0;
            // console.log(JSON.stringify(data_brushed_handle));
            for (let i = 0; i < max; i++) {
              // fetch MNIST images
              getAPIData(`/mnist-files/box/${data_brushed_handle[i]}`,
                {}, 'blob')
                .then((res) => {
                  let i_actual = Math.floor(tsne_data[data_brushed_handle[i]].actual);
                  let i_predict = Math.floor(tsne_data[data_brushed_handle[i]].predicted);
                  let $image_div = $spriteDiv.append("div");
                  let $images = $image_div.append("img")
                    .attr("id", "scroll-img")
                    .attr("src", window.URL.createObjectURL(res))
                    .style("border",function () {
                       if(i_actual==i_predict){
                         return "3px solid green"
                       }
                       else{
                         return "3px solid red"
                       }
                    })
                    .on('click', function () {
                      handleImageClick(tsne_data[data_brushed_handle[i]].prb,
                        i_actual,
                        i_predict);
                    });
                });

            }

          }
          else {
            let max = Math.min(data_brushed_handle.length, 150);
            let old = d3.select("#scroll-div").remove();
            let $spriteDiv = d3.select("#ml-container")
              .append("div")
              .attr("id", "scroll-div");
            let images = [];
            let num = 0;
            for (let i = 0; i < max; i++) {
              // console.log(max);
              getAPIData(`/mnist-files/box/${data_brushed_handle[i]}`,
                {}, 'blob')
                .then((res) => {
                  let i_actual = Math.floor(tsne_data[data_brushed_handle[i]].actual);
                  let i_predict = Math.floor(tsne_data[data_brushed_handle[i]].predicted);
                  let $images = $spriteDiv.append("div")
                    .append("img").attr("id", "scroll-img")
                    .attr("src", window.URL.createObjectURL(res))
                    .style("border",function () {
                       if(i_actual==i_predict){
                         return "3px solid green"
                       }
                       else{
                         return "3px solid red"
                       }
                    })
                    .on('click', function () {
                      handleImageClick(tsne_data[data_brushed_handle[i]].prb,
                        i_actual,
                        i_predict);
                    });

                });

            }
          }
        }


        // BUILD BAR CHART
        function handleImageClick(in_data, actual, predicted) {

          let data: { "label": number, "prob": number, "color": string, "border": boolean }[] = [];
          for (let i = 0; i < in_data.length; i++) {
            let color = "#808080";
            let border = false;
            if (actual == i) {
              border = true;
              if (actual == predicted) {
                color = "#008000";
              }
              else {
                color = "#808080";
              }
            }


            if (predicted == i) {
              if (actual == predicted) {
                color = "#008000";
              }
              else {
                color = "#FF0000";
              }
            }

            let temp: { "label": number, "prob": number, "color": string, "border": boolean } =
              {"label": i, "prob": in_data[i], "color": color, "border": border};
            data.push(temp);
          }


          // SETUP
          var margin = {top: 35, right: 0, bottom: 30, left: 40};

          var width = 400 - margin.left - margin.right;
          var height = 250 - margin.top - margin.bottom;


          ///////////////////////
          // Scales
          var x = d3.scale.ordinal()
            .domain(data.map(function (d) {
              return d.label.toString();
            }))
            .rangeRoundBands([0, width], .1);

          var y = d3.scale.linear()
            .domain([0, d3.max(data, function (d) {
              return d.prob;
            }) * 1.1])
            .range([height, 0]);

          // AXIS
          var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

          var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

          // CHART
          if (!chart) {

            let $chart = d3.select("body")
              .select("#ml-container")
              .append("svg")
              .attr("id", "chart")
              .attr("width", 400)
              .attr("height", 250)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("id", "inner-g");

            $chart.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
              .append("text")
              .style("text-anchor", "start")
              .style("alignment-baseline", "hanging")
              .attr("y", 20)
              .attr("x", 335)
              .text("Label");

            $chart.append("g")
              .attr("class", "y axis")
              .call(yAxis)
              .append("text")
              .style("text-anchor", "start")
              .style("alignment-baseline", "ideographic")
              .attr("y", -15)
              .attr("x", -25)
              .attr("dy", ".6em")
              .text("Probability (%)");

            // TITLE
            $chart.append("text")
              .text('Classification Probabilities')
              .attr("text-anchor", "middle")
              .attr("class", "graph-title")
              .attr("y", -10)
              .attr("x", width / 2.0);

            //BARS
            let bar = $chart.selectAll(".bar")
              .data(data)
              .enter().append("rect")
              .attr("class", "bar")
              .attr("x", function (d) {
                return x(d.label.toString());
              })
              .attr("y", height)
              .attr("fill", function (d) {
                return d.color;
              })
              .attr("width", width + margin.left + margin.right)
              .attr("height", 0)
              .attr("width", x.rangeBand())
              .attr("y", function (d) {
                return y(d.prob);
              })
              .attr("height", function (d) {
                return height - y(d.prob);
              })
              .style("stroke", function (d) {
                if (d.border) {
                  return "black";
                }
              })
              .style("stroke-width", function (d) {
                if (d.border) {
                  return "2px";
                }
              });
            chart = true;
          }
          else {
            let $svg = d3.select("#chart").remove();
            //
            let $chart = d3.select("body")
              .select("#ml-container")
              .append("svg")
              .attr("id", "chart")
              .attr("width", 400)
              .attr("height", 260)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("id", "inner-g");

            $chart.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
              .append("text")
              .style("text-anchor", "start")
              .style("alignment-baseline", "hanging")
              .attr("y", 20)
              .attr("x", 335)
              .text("Label");

            $chart.append("g")
              .attr("class", "y axis")
              .call(yAxis)
              .append("text")
              .style("text-anchor", "start")
              .style("alignment-baseline", "ideographic")
              .attr("y", -15)
              .attr("x", -25)
              .attr("dy", ".6em")
              .text("Probability (%)");

            // TITLE
            $chart.append("text")
              .text('Classification Probabilities')
              .attr("text-anchor", "middle")
              .attr("class", "graph-title")
              .attr("y", -10)
              .attr("x", width / 2.0);

            //BARS
            let bar = $chart.selectAll(".bar")
              .data(data)
              .enter().append("rect")
              .attr("class", "bar")
              .attr("x", function (d) {
                return x(d.label.toString());
              })
              .attr("y", height)
              .attr("fill", function (d) {
                return d.color;
              })
              .attr("width", width + margin.left + margin.right)
              .attr("height", 0)
              .attr("width", x.rangeBand())
              .attr("y", function (d) {
                return y(d.prob);
              })
              .attr("height", function (d) {
                return height - y(d.prob);
              })
             .style("stroke",function (d) {
                  if(d.border){
                    return "black";
                  }
                })
              .style("stroke-width",function (d) {
                    if(d.border){
                      return "2px";
                    }
              });
          }
        }
        done = true;
      });
  }
}
