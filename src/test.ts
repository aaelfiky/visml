import * as d3 from 'd3';
import {strings} from './data';
import * as ajax from 'phovea_core/src/ajax';
import {getAPIData, getAPIJSON} from 'phovea_core/src/ajax';
import {select} from 'd3';
import sqrt = d3.scale.sqrt;

export default class Test{
  //declaring fields

  in_change: boolean; // tracks the change inside the image rects
  dataset_: { actual: number, predicted: number}[] = []; // used to build the color rects
  sprite: boolean; // tells whether the image sprite is ready or not
  chart: boolean; // tells whether the first chart was ready or not
  selected_image_index: number; // index for the selected image

  constructor() {

    this.sprite = false;
    this.in_change = false;
    this.chart = false;

    this.buildform();

  }

  // for handling the color rects array
  makeRequest(num: number[]) {
    return ajax.getAPIJSON(`/mnist-files/${num}`);
  }

  // for outputting the sprite
  handleClick(num: number[]){
    return getAPIData(`/mnist-files/image/${num}`, {}, 'blob');
  }

  // for handling a specific number in the sprite
  handleBlobClick(num: number){
    return getAPIData(`/mnist-files/box/${num}`, {}, 'blob');
  }

  // for handling probabilities
  fetchPredictions(num: number){
    return ajax.getAPIJSON(`/mnist-files/predict/${num}`);
  }


  buildform(){

    let $formDiv = d3.select("body").append("div").attr("id","from-to");

    let $from = $formDiv //from range
      .append("input")
      .attr("name","From")
      .attr("type","text")
      .attr("class","from")
      .attr("placeholder","From");
    let $to = $formDiv // to range
      .append("input")
      .attr("name","To")
      .attr("type","text")
      .attr("class","to")
      .attr("placeholder","To");
    let $preview = $formDiv // submit button
      .append("input")
      .attr("class","preview")
      .attr("name","Submit")
      .attr("type","submit")
      .attr("value","Preview")
      .on("click",() => { // start preview call
        // do something here
        const fromValue = parseInt($from.property("value"), 10);
        const toValue = parseInt($to.property("value"), 10);

        const range = toValue - fromValue;
        let ok = false;
        let vText = "";
        if (range > 50 || range < 40 || fromValue<0) { // checking bounds
          ok = false;
          $formDiv.select("#text-valid").remove();
          if(fromValue<0){
            vText = "Out of bound range";
          }
          else{
            vText = "Please enter a range of between 40 to 50 entries";
          }
          let $p = $formDiv
            .append("H5")
            .attr("id","text-valid")
            .text(vText);
        }
        else {
          ok = true;
        }
        var fromTo = [fromValue, toValue];
        if (ok){ // start if ok (valid range)
          $formDiv.select("#text-valid").remove();
          this.handleClick(fromTo).then((res) => { // handle click call

            if(res.size >10000) {


              this.in_change = true;
              this.sprite = false;
              let rect_data: { predicted: number, actual: number}[] = [];

              d3.select("#ml-container").remove();
              d3.select("body")
                .append("div")
                .attr("id", "ml-container")


              const imageUrl = window.URL.createObjectURL(res);
              let $ml = select("#ml-container")
                .append("div");
              let $img = $ml.append("img")
                .attr("id", "sprite")
                .attr('src', imageUrl);
              this.sprite = true;
              this.makeRequest(fromTo).then((ret) => {
                this.chart = false;
                for (let i = 0; i < ret.list.length; i++) {
                  rect_data.push({
                    "predicted": ret.list[i][0],
                    "actual": ret.list[i][1]
                  });
                }

                this.dataset_ = rect_data;
                while (!this.sprite) ;
                this.buildColorRects();

                this.buildBoxes();

              });

              $img.on("click", () => {
                let elem = $img[0][0];
                let e = (<Element>elem);
                this.onImg(e, fromValue, toValue, range, rect_data);
                this.fetchPredictions(this.selected_image_index)
                  .then((result) => {
                    this.buildChart(result.list);
                  });
              })
            }
            else{
              $formDiv.select("#text-valid").remove();
              vText = "Range Out of Bound";
              let $p = $formDiv
                .append("H2")
                .attr("id","text-valid")
                .text(vText);
            }


          }); // end handle click call
        } // end if ok

        }); // end preview call


  }

  // On image click, preview predict and actual boxes
  onImg(element:Element,
        fromValue: number, toValue:number, range:number,
        rect_data:{predicted: number, actual: number}[]
        )
  {
          let coordinates = d3.mouse(d3.select(element).node());
          let area = element.clientWidth * element.clientHeight;

          let square = Math.sqrt(area / range);
          let max_i = 9;
          let max_j = 4;

          let in_i = Math.floor(coordinates[0] / square);
          let in_j = Math.floor(coordinates[1] / square);

          let indd = in_j * 10 + in_i;

          let par = indd + fromValue;
          this.selected_image_index=par;
          let d_ = rect_data[indd];
          let c: string = "";

          if (d_.actual == d_.predicted) {
            c = "green";
          }
          else {
            c = "red";
          }

          let top = in_i * square;
          let bottom = (in_i + 1) * square;
          let left = in_j * square;
          let right = (in_j + 1) * square;

          getAPIData(`/mnist-files/box/${par}`, {}, 'blob')
            .then((res) => {

              const imURL = window.URL.createObjectURL(res);
              console.log(imURL);
              d3.select("body").select("#actual")
                .select("#actual-box")
                .attr('src', imURL);
              d3.select("body").select("#predict")
                .select("#predict-box").style("background-color", c);
              d3.select("#predict")
                .select("#actual-label")
                .selectAll("h4").remove();
              d3.select("#predict")
                .select("#actual-label")
                .append("H4")
                .style("margin-left","6px")
                .text(Math.floor(d_.actual));
              d3.select("#predict")
                .select("#actual-label")
                .append("H4")
                .style("margin-left","6px")
                .text(Math.floor(d_.predicted));
          });
          this.in_change= true;
  }



  buildChart(in_data: number[]){

    let labels = 10;
    if(in_data.length == 0){
      in_data = [0,0,0,0,0,0,0,0,0,0];
    }
    let data :{label:number, prob:number}[] = [];
    for (let i = 0; i< in_data.length;i++){
      let temp:{"label": number, "prob": number} = {"label": i, "prob": in_data[i]};
      data.push(temp);
    }


    // SETUP
    var margin = { top: 35, right: 0, bottom: 30, left: 40 };

    var width = 400 - margin.left - margin.right;
    var height = 250 - margin.top - margin.bottom;


    ///////////////////////
    // Scales
    var x = d3.scale.ordinal()
      .domain(data.map(function(d) { return d.label.toString(); }))
      .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.prob; }) * 1.1])
      .range([height, 0]);

    // AXIS
    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    // CHART
    if(!this.chart) {

      let $chart = d3.select("body")
        .select("#ml-container")
        .append("svg")
        .attr("id", "chart")
        .attr("width", 400)
        .attr("height", 250)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("id","inner-g");

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
        .attr("width", width + margin.left + margin.right)
        .attr("height", 0)
        .attr("width", x.rangeBand())
        .attr("y", function (d) {
          return y(d.prob);
        })
        .attr("height", function (d) {
          return height - y(d.prob);
        });
       this.chart = true;
    }
    else{
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
        .attr("id","inner-g");

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
        .attr("width", width + margin.left + margin.right)
        .attr("height", 0)
        .attr("width", x.rangeBand())
        .attr("y", function (d) {
          return y(d.prob);
        })
        .attr("height", function (d) {
          return height - y(d.prob);
        });

    }



  }


  buildColorRects(): void{

    let $container = d3.select("body").select("#ml-container");
    let heatmap = $container.append("div").attr("id", "heatmap");
    let img = heatmap.selectAll("#image-map")
      .data(this.dataset_)
      .enter()
      .append("div")
      .attr("class","rect-div")
      .attr("height", 10)
      .attr("width", 10)
      .style("background-color", function (d) {
        if(d.actual == d.predicted){
          return "green";
        }
        else{
          return "red";
        }
      });

  }

  buildBoxes(): void{
    let container = d3.select("body").select("#ml-container");
    let box = container
      .append("div")
      .attr("id","selected-img")
      .style("display","grid");

    // Actual
    let abox =  box.append("div").attr("id", "actual");
    let header = document.getElementById("actual");
    let h = document.createElement("H3");
    let t = document.createTextNode("Selected Image:");
    h.appendChild(t);
    header.appendChild(h);
    let actualImg = abox.append("div")
      .append("img")
      .attr("id","actual-box");

    // Predict
    let pbox =  box.append("div").attr("id", "predict");
    let header2 = document.getElementById("predict");
    let h2 = document.createElement("H3");
    let t2 = document.createTextNode("Classification Result:");
    h2.appendChild(t2);
    header2.appendChild(h2);
    let predictImg = pbox.append("div").attr("id","predict-box");

    let numbers= pbox.append("div").attr("id","actual-label");

    let header3 = document.getElementById("actual-label");
    // let header3 = d3.select("#selected-img").select("#actual-label");

    let h3 = document.createElement("H5");
    let t3 = document.createTextNode("Actual:");
    h3.appendChild(t3);
    header3.appendChild(h3);

    let h4 = document.createElement("H5");
    let t4 = document.createTextNode("Predicted:");
    h4.appendChild(t4);
    header3.appendChild(h4);

  }

}

