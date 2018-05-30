var Picture = class Picture {
  constructor(width, height, pixels) {
    this.width = width;
    this.height = height;
    this.pixels = pixels;
  }
  static empty(width, height, color) {
    let pixels = new Array(width * height).fill(color);
    return new Picture(width, height, pixels);
  }
  pixel(x, y) {
    return this.pixels[x + y * this.width];
  }
  draw(pixels) {
    let copy = this.pixels.slice();
    for (let {x, y, color} of pixels) {
      copy[x + y * this.width] = color;
    }
    return new Picture(this.width, this.height, copy);
  }
}

function updateState(state, action) {
  return Object.assign({}, state, action);
}

function elt(type, props, ...children) {
  let dom = document.createElement(type);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }
  return dom;
}

var scale = 1;

var PictureCanvas = class PictureCanvas {
  constructor(picture, pointerDown) {
    this.dom = elt("canvas", {
      onmousedown: event => this.mouse(event, pointerDown),
      ontouchstart: event => this.touch(event, pointerDown)
    });
    drawPicture(picture, this.dom, scale);
  }
  setState(picture) {
    if (this.picture == picture) return;
    this.picture = picture;
    drawPicture(this.picture, this.dom, scale);
  }
}

function drawPicture(picture, canvas, scale) {
  if (typeof picture === "undefined")
	return;

  console.log("drawPicture called" + scale);
  canvas.width = picture.width * scale;
  canvas.height = picture.height * scale;
  let cx = canvas.getContext("2d");

  for (let y = 0; y < picture.height; y++) {
    for (let x = 0; x < picture.width; x++) {
      cx.fillStyle = picture.pixel(x, y);
      cx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

PictureCanvas.prototype.mouse = function(downEvent, onDown) {
  if (downEvent.button != 0) return;
  let pos = pointerPosition(downEvent, this.dom);
  let onMove = onDown(pos);
  if (!onMove) return;
  let move = moveEvent => {
    if (moveEvent.buttons == 0) {
      this.dom.removeEventListener("mousemove", move);
    } else {
      let newPos = pointerPosition(moveEvent, this.dom);
      if (newPos.x == pos.x && newPos.y == pos.y) return;
      pos = newPos;
      onMove(newPos);
    }
  };
  this.dom.addEventListener("mousemove", move);
};

function pointerPosition(pos, domNode) {
  let rect = domNode.getBoundingClientRect();
  return {x: Math.floor((pos.clientX - rect.left) / scale),
          y: Math.floor((pos.clientY - rect.top) / scale)};
}

PictureCanvas.prototype.touch = function(startEvent,
                                         onDown) {
  let pos = pointerPosition(startEvent.touches[0], this.dom);
  let onMove = onDown(pos);
  startEvent.preventDefault();
  if (!onMove) return;
  let move = moveEvent => {
    let newPos = pointerPosition(moveEvent.touches[0],
                                 this.dom);
    if (newPos.x == pos.x && newPos.y == pos.y) return;
    pos = newPos;
    onMove(newPos);
  };
  let end = () => {
    this.dom.removeEventListener("touchmove", move);
    this.dom.removeEventListener("touchend", end);
  };
  this.dom.addEventListener("touchmove", move);
  this.dom.addEventListener("touchend", end);
};

var PixelEditor = class PixelEditor {
  constructor(state, config) {
    let {tools, controls, dispatch} = config;
    this.state = state;

    this.canvas = new PictureCanvas(state.picture, pos => {
      let tool = tools[this.state.tool];
      let onMove = tool(pos, this.state, dispatch);
      if (onMove) return pos => onMove(pos, this.state);
    });
    this.controls = controls.map(
      Control => new Control(state, config));
    this.dom = elt("div", {}, this.canvas.dom, elt("br"),
                   ...this.controls.reduce(
                     (a, c) => a.concat(" ", c.dom), []));
  getData(dispatch);
  }
  setState(state) {
    this.state = state;
    this.canvas.setState(state.picture);
    for (let ctrl of this.controls) ctrl.setState(state);
  }
}

var ToolSelect = class ToolSelect {
  constructor(state, {tools, dispatch}) {
    this.select = elt("select", {
      onchange: () => dispatch({tool: this.select.value})
    }, ...Object.keys(tools).map(name => elt("option", {
      selected: name == state.tool
    }, name)));
    this.dom = elt("label", null, "🖌 Tool: ", this.select);
  }
  setState(state) { this.select.value = state.tool; }
}

var ScaleSelect = class ScaleSelect {
  constructor(state, {scales, dispatch}) {
    this.selectScale = elt("select", {
      onchange: () => dispatch({scale: this.selectScale.value})
    }, ...Object.keys(scales).map(name => elt("option", {
      selected: name == state.scale
    }, name)));
    this.dom = elt("label", null, "🖌 Scale: ", this.selectScale);
	  drawPicture(this.picture, this.dom, this.selectScale.value);
  }
  setState(state) { this.selectScale.value = state.scale; }
}

var ColorSelect = class ColorSelect {
  constructor(state, {dispatch}) {
    this.input = elt("input", {
      type: "color",
      value: state.color,
      onchange: () => dispatch({color: this.input.value})
    });
    this.dom = elt("label", null, "🎨 Color: ", this.input);
  }
  setState(state) { this.input.value = state.color; }
}

function draw(pos, state, dispatch) {
  function drawPixel({x, y}, state) {
    let drawn = {x, y, color: state.color};
    dispatch({picture: state.picture.draw([drawn])});
  }
  drawPixel(pos, state);
  return drawPixel;
}

function draw(pos, state, dispatch) {
  function connect(newPos, state) {
    let line = drawLine(pos, newPos, state.color);
    pos = newPos;
    dispatch({picture: state.picture.draw(line)});
  }
  connect(pos, state);
  return connect;
}

function drawLine(from, to, color) {
  let points = [];
  if (Math.abs(from.x - to.x) > Math.abs(from.y - to.y)) {
    if (from.x > to.x) [from, to] = [to, from];
    let slope = (to.y - from.y) / (to.x - from.x);
    for (let {x, y} = from; x <= to.x; x++) {
      points.push({x, y: Math.round(y), color});
      y += slope;
    }
  } else {
    if (from.y > to.y) [from, to] = [to, from];
    let slope = (to.x - from.x) / (to.y - from.y);
    for (let {x, y} = from; y <= to.y; y++) {
      points.push({x: Math.round(x), y, color});
      x += slope;
    }
  }
  return points;
}

function line(pos, state, dispatch) {
  return end => {
    let line = drawLine(pos, end, state.color);
    dispatch({picture: state.picture.draw(line)});
  };
}

function circle(pos, state, dispatch) {
  function drawCircle(to) {
    let radius = Math.sqrt(Math.pow(to.x - pos.x, 2) +
                           Math.pow(to.y - pos.y, 2));
    let radiusC = Math.ceil(radius);
    let drawn = [];
    for (let dy = -radiusC; dy <= radiusC; dy++) {
      for (let dx = -radiusC; dx <= radiusC; dx++) {
        let dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        if (dist > radius) continue;
        let y = pos.y + dy, x = pos.x + dx;
        if (y < 0 || y >= state.picture.height ||
            x < 0 || x >= state.picture.width) continue;
        drawn.push({x, y, color: state.color});
      }
    }
    dispatch({picture: state.picture.draw(drawn)});
  }
  drawCircle(pos);
  return drawCircle;
}

function rectangle(start, state, dispatch) {
  function drawRectangle(pos) {
    let xStart = Math.min(start.x, pos.x);
    let yStart = Math.min(start.y, pos.y);
    let xEnd = Math.max(start.x, pos.x);
    let yEnd = Math.max(start.y, pos.y);
    let drawn = [];
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        drawn.push({x, y, color: state.color});
      }
    }
    dispatch({picture: state.picture.draw(drawn)});
  }
  drawRectangle(start);
  return drawRectangle;
}

var around = [{dx: -1, dy: 0}, {dx: 1, dy: 0},
                {dx: 0, dy: -1}, {dx: 0, dy: 1}];

function fill({x, y}, state, dispatch) {
  let targetColor = state.picture.pixel(x, y);
  let drawn = [{x, y, color: state.color}];
  for (let done = 0; done < drawn.length; done++) {
    for (let {dx, dy} of around) {
      let x = drawn[done].x + dx, y = drawn[done].y + dy;
      if (x >= 0 && x < state.picture.width &&
          y >= 0 && y < state.picture.height &&
          state.picture.pixel(x, y) == targetColor &&
          !drawn.some(p => p.x == x && p.y == y)) {
        drawn.push({x, y, color: state.color});
      }
    }
  }
  dispatch({picture: state.picture.draw(drawn)});
}

function pick(pos, state, dispatch) {
  dispatch({color: state.picture.pixel(pos.x, pos.y)});
}

var SaveButton = class SaveButton {
  constructor(state) {
    this.picture = state.picture;
    this.dom = elt("button", {
      onclick: () => this.save()
    }, "💾 Save");
  }
  save() {
    let canvas = elt("canvas");
    drawPicture(this.picture, canvas, 1);
    let link = elt("a", {
      href: canvas.toDataURL(),
      download: "pixelart.png"
    });
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setState(state) { this.picture = state.picture; }
}

var LoadButton = class LoadButton {
  constructor(_, {dispatch}) {
    this.dom = elt("button", {
      onclick: () => startLoad(dispatch)
    }, "📁 Load");
  }
  setState() {}
}

function startLoad(dispatch) {
  let input = elt("input", {
    type: "file",
    onchange: () => finishLoad(input.files[0], dispatch)
  });
  document.body.appendChild(input);
  input.click();
  input.remove();
}

function finishLoad(file, dispatch) {
  if (file == null) return;
  let reader = new FileReader();
  reader.addEventListener("load", () => {
    let image = elt("img", {
      onload: () => dispatch({
        picture: pictureFromImage(image)
      }),
      src: reader.result
    });
  });
  reader.readAsDataURL(file);
}

function pictureFromImage(image) {
  let width = image.width;
  let height = image.height;
  let canvas = elt("canvas", {width, height});
  let cx = canvas.getContext("2d");
  cx.drawImage(image, 0, 0);
  let pixels = [];
  let {data} = cx.getImageData(0, 0, width, height);

  function hex(n) {
    return n.toString(16).padStart(2, "0");
  }
  for (let i = 0; i < data.length; i += 4) {
    let [r, g, b] = data.slice(i, i + 3);
    pixels.push("#" + hex(r) + hex(g) + hex(b));
  }
  return new Picture(width, height, pixels);
}

function historyUpdateState(state, action) {
  if (action.undo == true) {
    if (state.done.length == 0) return state;
    return Object.assign({}, state, {
      picture: state.done[0],
      done: state.done.slice(1),
      doneAt: 0
    });
  } else if (action.picture &&
             state.doneAt < Date.now() - 1000) {
    return Object.assign({}, state, action, {
      done: [state.picture, ...state.done],
      doneAt: Date.now()
    });
  } else {
    return Object.assign({}, state, action);
  }
}

var UndoButton = class UndoButton {
  constructor(state, {dispatch}) {
    this.dom = elt("button", {
      onclick: () => dispatch({undo: true}),
      disabled: state.done.length == 0
    }, "⮪ Undo");
  }
  setState(state) {
    this.dom.disabled = state.done.length == 0;
  }
}

var PixelUnpacking = class PixelUnpacking {
  constructor(state, {dispatch}) {
    this.picture = state.picture;
    this.dom = elt("button", {
      onclick: () => this.unpack(dispatch)
    }, "?? Unpack");
  }
  unpack(dispatch) {
  
  console.clear();
  console.log("Begin");
  getData(dispatch);
	
	
  }
  setState(state) { this.picture = state.picture; }
}

var PixelPacking = class PixelPacking {
  constructor(state, {dispatch}) {
    this.picture = state.picture;
    this.dom = elt("button", {
      onclick: () => this.save(dispatch)
    }, "?? PixelPacking");
  }
  save(dispatch) {
   
  
  console.clear();
   
	//Get the png bytes. 
	var bytes = getByteStringJson(this.picture);
	console.log("To send to smrt contract: " + bytes);
	
	storeData(bytes);
	
  }
  setState(state) { this.picture = state.picture; }
}




var startState = {
  tool: "draw",
  scale: 1,
  color: "#000000",
  picture: Picture.empty(60, 30, "#f0f0f0"),
  done: [],
  doneAt: 0
};

var baseTools = {draw, fill, line, rectangle, circle, pick};
var baseScales = {'1':1, '2':2,'3':3 };

var baseControls = [
   ScaleSelect, ToolSelect, ColorSelect, SaveButton, LoadButton, UndoButton, PixelPacking,PixelUnpacking
];

function startPixelEditor({state = startState,
                           tools = baseTools,
			   scales = baseScales,
                           controls = baseControls}) {
  let app = new PixelEditor(state, {
    tools,
    scales,
    controls,
    dispatch(action) {
      state = historyUpdateState(state, action);
      app.setState(state);
    }
  });
  return app.dom;
}

//This is what i need to save from the canvas.
function getByteStringJson(picture){
	let canvas = elt("canvas");
    	drawPicture(picture, canvas, 1);
	var dataUrl = canvas.toDataURL();
	var data = atob(dataUrl.replace('data:image/png;base64,', '')),
        bytes = new Uint8Array(data.length);
	for (var i = 0, len = data.length; i < len; i++) {
   		bytes[i] = data.charCodeAt(i) & 0xff;
  	}

	return byteToHexString(bytes);
}

//This is what i need to draw to the canvas starting from the bytes.
function drawImageFromBytes(bytes){
	
    var i = bytes.length;
    var binaryString = [i];
    while (i--) {
        binaryString[i] = String.fromCharCode(bytes[i]);
    }
	
	var data = binaryString.join('');

    var base64 = window.btoa(data);
	
	
	return dataURItoBlob('data:image/png;base64,' + base64);
}

function strEncodeUTF16(str) {
  var buf = new ArrayBuffer(str.length*2);
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return bufView;
}

function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], {type: mimeString});
  return blob;

}

function byteToHexString(uint8arr) {
  if (!uint8arr) {
    return '';
  }
  
  var hexStr=[];
  var byteString = '0x';
  for (var i = 0; i < uint8arr.length; i++) {
    var hex = (uint8arr[i] & 0xff).toString(16);
    hex = (hex.length === 1) ? '0' + hex : hex;
      //hexStr.push('"0x' + hex.toUpperCase() + '"');
    hexStr.push(hex.toUpperCase());
    byteString +=hex.toUpperCase();
  }
  
    //return '[' + hexStr + ']';
  return byteString;
}
//'0x89504e470d0a1a0a0000000d494844520000003c0000001e080600000070987d4f00000053494441545847edd4011100200cc430f06f760e40000e4a70c0a7b73d33677df4b60fc7b509c7811761c2b105241d037dbe4398706c0149c7401d2d494b3ab680a463a0aeb4a4251d5b40d23150575ad2f5a42f4d827261fa56bcfc0000000049454e44ae426082';
function formatByteStringFromSmartContract(byteString){
	//var arratyByteString = smartContractByteString.match(/.{1,2}/g);
	var arrayByteString = [];

	for (var i = 0, charsLength = byteString.length; i < charsLength; i += 2) {
		var singleByte = byteString.substring(i, i + 2);
		
		if (singleByte != '0x'){
			arrayByteString.push("0x" + singleByte.toUpperCase());
		}
	}

	return arrayByteString;
}

function hexStringToByte(str) {
  if (!str) {
    return new Uint8Array();
  }
  
  var a = [];
  for (var i = 0, len = str.length; i < len; i+=2) {
    a.push(parseInt(str.substr(i,2),16));
  }
  
  return new Uint8Array(a);
}


function rgbToHex(R,G,B) {return toHex(R)+toHex(G)+toHex(B)}
	function toHex(n) {
	 n = parseInt(n,10);
	 if (isNaN(n)) return "00";
	 n = Math.max(0,Math.min(n,255));
	 return "0123456789ABCDEF".charAt((n-n%16)/16)
		  + "0123456789ABCDEF".charAt(n%16);
}	


function HextoRGB(hex){
	var components = {
		r: parseInt((cutHex(hex)).substring(0,2),16), 
		g: parseInt((cutHex(hex)).substring(2,4),16), 
		b: parseInt((cutHex(hex)).substring(4,6),16)
	};
	
	return components;
}

function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h}

//SMART CONTRACT COMMUNICATION

//var stroreSCAddress = '0xd63f7d0c9f7f0f1d52a7aac081c99df030e2d093';
//var abi = [{"constant":false,"inputs":[{"name":"enterBytes","type":"bytes"}],"name":"setInput","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"input","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"}];
var stroreSCAddress = '0xd1babbb97ee255198d0065865e3c23698172ce47';
var abi = [{"constant":true,"inputs":[],"name":"height","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"Y","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"width","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"X","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"enterBytes","type":"bytes"}],"name":"setInput","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"input","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"}];

  // MetaMask injects the web3 library for us.
    window.onload = function() {
      if (typeof web3 === 'undefined') {
        document.getElementById('meta-mask-required').innerHTML = 'You need <a href="https://metamask.io/">MetaMask</a> browser plugin to run this example'
      }

      //drawCanvas();
    }

function storeData(data) {
	
	var storeSC = web3.eth.contract(abi).at(stroreSCAddress);

	console.log('Calling the smart contract');	
	
	//data = '0x89504e470d0a1a0a0000000d494844520000003c0000001e080600000070987d4f00000156494441545847ed98590ec3200c44931b70ff53fa06adf840b21cc0631b932ee95fc5123fcf30a43d89e875fcd1e77c807f5ced47e11d0297522e8f21a21d8f3eb62adc407b70bc0999f05b8067a03d59adf32dd648058e149ea5780a700454aa25cf7bd4eecb8157c266d87d19b0b4606612479aea024660ea1c6e3ff9dd12342b95568111b851410870e48c7a9a38048ed8a636006d142f1a5dd31abc1c389a88886d67d70fd2742bf4d4d2d6cd1040c4fe7c8e5683362e9f773bb0567074fc01d6fe00d03aecb5710bb6594e6c3fc33c6d3d01d64bddba67db4b6ba6368e34cd64696ffccf94b1fc28b80d18551a85590982ecc55556dfb4e415c12d898e79e721c72815b867718baa6d3d02829ecf2dc0f2d5319ab4a3a4476090396e4bcf7eb58c8a46d5b4be81a10e70a574e4ae8dacd5d4d3c67bcf368556a478efdad115e781ad357c3cb0cc0bde38cf71f90a60af3b7aebde6ad67170c48934a80000000049454e44ae426082';

	storeSC.setInput(data, function (error, result) {
		if (!error)
			document.getElementById('result').innerHTML = 'Success:' + result
		else
			console.error(error);
	});
}

function getData(dispatch) {
	
	var storeSC = web3.eth.contract(abi).at(stroreSCAddress);

	console.log('Calling the smart contract');

	var getNumbers;

	storeSC.input(function (error, result) {
		if (!error) {

			//To retrieve from the smart contrqact
		    //var smartContractByteString= '0x89504e470d0a1a0a0000000d494844520000003c0000001e080600000070987d4f00000156494441545847ed98590ec3200c44931b70ff53fa06adf840b21cc0631b932ee95fc5123fcf30a43d89e875fcd1e77c807f5ced47e11d0297522e8f21a21d8f3eb62adc407b70bc0999f05b8067a03d59adf32dd648058e149ea5780a700454aa25cf7bd4eecb8157c266d87d19b0b4606612479aea024660ea1c6e3ff9dd12342b95568111b851410870e48c7a9a38048ed8a636006d142f1a5dd31abc1c389a88886d67d70fd2742bf4d4d2d6cd1040c4fe7c8e5683362e9f773bb0567074fc01d6fe00d03aecb5710bb6594e6c3fc33c6d3d01d64bddba67db4b6ba6368e34cd64696ffccf94b1fc28b80d18551a85590982ecc55556dfb4e415c12d898e79e721c72815b867718baa6d3d02829ecf2dc0f2d5319ab4a3a4476090396e4bcf7eb58c8a46d5b4be81a10e70a574e4ae8dacd5d4d3c67bcf368556a478efdad115e781ad357c3cb0cc0bde38cf71f90a60af3b7aebde6ad67170c48934a80000000049454e44ae426082';
		    var smartContractByteString= result;
			var bytes = formatByteStringFromSmartContract(smartContractByteString);
			
			//console.log(bytes);
			var file = drawImageFromBytes(bytes);
			
			
			
			console.log(file);
			if (file == null) return;
			  let reader = new FileReader();
			  reader.addEventListener("load", () => {
				let image = elt("img", {
				  onload: () => dispatch({
					picture: pictureFromImage(image)
				  }),
				  src: reader.result
				});
			  });
		  reader.readAsDataURL(file);
		

			document.getElementById('result').innerHTML = "Result: " + result
		}
		else
			console.error(error);
	});

}


