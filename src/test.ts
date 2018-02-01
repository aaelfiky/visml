import * as d3 from 'd3';
import {strings} from './data';
export default

class Test{
  //declaring fields
  data: {actual:number , predicted:number, img:string}[];
  dataset: { actual: number, predicted: number, img: string}[] = [];
  // sel: number = -1;

  constructor(data: {actual:number , predicted:number, img:string}[]) {
    this.data = data;
    for (let i = 0; i< this.data.length;i++){
      this.dataset.push({"actual": this.data[i].actual,
        "predicted": this.data[i].predicted,
        "img":this.data[i].img});
    }
    this.buildImages();
    this.buildColorRects();
    this.buildBoxes();

  }


  buildImages() {

    const margin = {top: 20, right: 10, bottom: 20, left: 50};
    let h = this.data.length/3 * 120;
    let count = 10;
    let container = d3.select("body").append("div").attr("id","container");
    let subContainer = container.append("div").attr("id", "sub-container");
    let img = subContainer.selectAll("#image-map")
      .data(this.dataset)
      .enter()
      .append("div")
      .attr("class","img-div")
      .style("content",function(d) {return "url("+d.img +")";})
      .attr("height", 40)
      .attr("width", 40)
      .on('click',(d,i) => {
        let c:string="";
        if(d.actual == d.predicted){
          c= "green";
        }
        else{
          c= "red";
        }
        d3.select("body").select("#actual")
          .select("#actual-box")
          .style("content","url("+d.img +")");
        d3.select("body").select("#predict")
          .select("#predict-box").style("background-color", c);
      });

  }

  buildColorRects(): void{

    let container = d3.select("body").select("#container");
    let heatmap = container.append("div").attr("id", "heatmap");
    let img = heatmap.selectAll("#image-map")
      .data(this.dataset)
      .enter()
      .append("div")
      .attr("class","rect-div")
      .attr("height", 40)
      .attr("width", 40)
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

    let container = d3.select("body").select("#container");
    let box = container.append("div").attr("id","selected-img");

    // Actual
    let abox =  box.append("div").attr("id", "actual");
    let header = document.getElementById("actual");
    let h = document.createElement("H2");
    let t = document.createTextNode("Actual:");
    h.appendChild(t);
    header.appendChild(h);
    let actualImg = abox.append("div").attr("id","actual-box");

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

