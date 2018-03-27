import * as d3 from 'd3';
import {strings} from './data';
import * as ajax from 'phovea_core/src/ajax';
import {getAPIData, getAPIJSON} from 'phovea_core/src/ajax';
import {select} from 'd3';
import sqrt = d3.scale.sqrt;

export default class Test{
  //declaring fields

  data: {actual:number , predicted:number, img:string}[];
  in_change: boolean
  dataset_: { actual: number, predicted: number, img: string}[] = [];
  sprite: boolean
  chart: boolean
  selected_image_index: number

  constructor(data: {actual:number , predicted:number, img:string}[]) {
    this.sprite = false;
    this.in_change = false;
    this.chart = false;
    this.data = data;

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

    let $from = $formDiv
      .append("input")
      .attr("name","From")
      .attr("type","text")
      .attr("class","from")
      .attr("placeholder","From");
    let $from_tooltip = $from
      .append("span")
      .attr("class","tooltiptext")
      .text("Som3a");
    let $to = $formDiv
      .append("input")
      .attr("name","To")
      .attr("type","text")
      .attr("class","to")
      .attr("placeholder","To");
    let $preview = $formDiv
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
        if (range > 50 || range < 40) {
          ok = false;
          $formDiv.select("#text-valid").remove();
          vText = "Please enter a range of between 40 to 50 entries";
          let $p = $formDiv
            .append("p")
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

            this.in_change = true;
            this.sprite = false;
            let rect_data: { predicted: number, actual: number, img: string }[] = [];

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
                  "actual": ret.list[i][1],
                  "img": ""
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


          }); // end handle click call
        } // end if ok

        }); // end preview call


  }

  // On image click, preview predict and actual boxes
  onImg(element:Element,
        fromValue: number, toValue:number, range:number,
        rect_data:{predicted: number, actual: number, img: string}[]
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
              d3.select("body").select("#actual")
                .select("#actual-box")
                .attr('src', imURL);
              d3.select("body").select("#predict")
                .select("#predict-box").style("background-color", c);
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
    let margin = {top: 20, right: 20, bottom: 70, left: 40},
    width = 400 - margin.left - margin.right,
    height = 250 - margin.top - margin.bottom;

    let x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
    let y = d3.scale.linear().range([height, 0]);
    let xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(9);

    if(!this.chart) {
      let $svg = d3.select("body")
        .select("#ml-container")
        .append("svg")
        .attr("id","chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("padding-top","10px")
        .append("g")
        .attr("id","inner-g")
        .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

      x.domain(data.map(function (d) {
        return d.label.toString();
      }));
      y.domain([0, d3.max(data, function (d) {
        return d.prob;
      })]);

      $svg.append("g")
        .attr("class", "x axis")
        .attr("id", "x-text")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.2em")
        .attr("dy", ".600em")
        .attr("transform", "rotate(0)");

      $svg.select("#x-text")
        .append("text")
        .style("text-anchor", "start")
        .style("alignment-baseline", "hanging")
        .attr("y", 20)
        .attr("x", width - 10)
        .text("label");

      $svg.append("g")
        .attr("class", "y axis")
        .attr("id","y-axis")
        .call(yAxis)
        .append("text")
        .style("text-anchor", "start")
        .style("alignment-baseline", "ideographic")
        .attr("y", -15)
        .attr("x", -25)
        .attr("dy", ".71em")
        .text("Probability (%)");

      $svg.selectAll("bar")
        .data(data)
        .enter().append("rect")
        .attr("class","bars")
        .style("fill", "deepskyblue")
        .attr("x", function (d) {
          return x(d.label.toString());
        })
        .attr("width", x.rangeBand())
        .attr("y", function (d) {
          return y(d.prob);
        })
        .attr("height", function (d) {
          return height - y(d.prob);
        });

      this.chart = true;
    }
    else {

      let $svg = d3.select("#ml-container")
        .select("#chart").select("#inner-g");


      x.domain(data.map(function (d) {
        return d.label.toString();
      }));
      y.domain([0, d3.max(data, function (d) {
        return d.prob;
      })]);


      let bars = $svg.selectAll(".bars")
					.remove();

      $svg.select("#y-axis")
        .call(yAxis);

      bars = $svg.selectAll(".bars").data(data).enter()
          .append("rect")
          .attr("class","bars")
          .style("fill", "deepskyblue")
          .attr("x", function (d) {
            return x(d.label.toString());
          })
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

    let container = d3.select("body").select("#ml-container");
    let heatmap = container.append("div").attr("id", "heatmap");
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
    let h = document.createElement("H2");
    let t = document.createTextNode("Actual:");
    h.appendChild(t);
    header.appendChild(h);
    let actualImg = abox.append("div")
      .append("img")
      .attr("id","actual-box");

    // Predict
    let pbox =  box.append("div").attr("id", "predict");
    let header2 = document.getElementById("predict");
    let h2 = document.createElement("H2");
    let t2 = document.createTextNode("Predict:");
    h2.appendChild(t2);
    header2.appendChild(h2);
    let predictImg = pbox.append("div").attr("id","predict-box");

  }

}

