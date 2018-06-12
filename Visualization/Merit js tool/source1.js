function loadJSON(callback) {   
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', 'content.json', true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(JSON.parse(xobj.responseText));
    }
  };
  xobj.send(null);  
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function createTable(title, data){

	var totalMerit=0;
	var txt = "<table border='1'>"
        txt +="<tr><th colspan='6'>" + title + "</th></tr>"
        txt +="<tr><th>Tx</th><th>From</th><th>To</th><th>Merits</th><th>Date</th><th>Msg</th></tr>"
        for (x in data) {
            totalMerit+=data[x].merit;
	    
            txt += "<tr><td>" + data[x].tx + "</td><td><a href='?id=" + data[x].from + "'>" + data[x].from + "</a> (<a href='https://bitcointalk.org/index.php?action=profile;u=" + data[x].uidFrom + "'>btk</a>)</td><td><a href='?id=" + data[x].to + "'>" + data[x].to + "</a>(<a href='https://bitcointalk.org/index.php?action=profile;u=" + data[x].uidTo + "'>btk</a>)</td><td>" + data[x].merit + "</td><td>" + data[x].date + "</td><td><a href='https://bitcointalk.org/index.php?topic=" + data[x].Msg + "#" + data[x].Msg.split('.')[1] + "'>Msg</a></td></tr>";
        }
        txt +="<tr><th colspan='6'>Total: " + totalMerit + "</th></tr>"
        txt += "</table>"        

	return txt;
}


function isValidData(data){
		if (data != null && data !='')
			return true;
		else
			return false;

}

function getDataRange(start, end, data){
		var startDate = new Date(start);
        var endDate = new Date(end);
		
		var filteredData = data.filter(function(a){
			var aDate = new Date(a.date);
			return aDate >= startDate && aDate <= endDate;
		});

	return filteredData;

}

function getDataAbove(datetime, data){
		var limitDate = new Date(datetime);
		
		var filteredData = data.filter(function(a){
			var aDate = new Date(a.date);
			return aDate >= limitDate;
		});

	return filteredData;

}

function getDataBelow(datetime, data){
		var limitDate = new Date(datetime);
		
		var filteredData = data.filter(function(a){
			var aDate = new Date(a.date);
			return aDate <= limitDate;
		});

	return filteredData;

}

function getDataEqual(datetime, data){
	var limitDate = new Date(datetime);
	
	var filteredData = data.filter(function(a){
		var aDate = new Date(a.date);
		return aDate == limitDate;
	});

return filteredData;

}

function getMeritRange(meritLow, meritHigh, data){
		
		var filteredData = data.filter(function(a){
			return a.merit >= meritLow && a.merit <= meritHigh;
		});

	return filteredData;

}

function getMeritAbove(merit, data){

		var filteredData = data.filter(function(a){
			return a.merit >= merit;
		});

	return filteredData;

}

function getMeritBelow(merit, data){
		
		var filteredData = data.filter(function(a){
			return a.merit <= merit;
		});

	return filteredData;

}

function getMeritEqual(merit, data){
		
	var filteredData = data.filter(function(a){
		return a.merit == merit;
	});

return filteredData;

}


function filterData(json){

var result=json;
var tx=getParameterByName("tx");
var userid=getParameterByName("id");
var meritEqual=getParameterByName("meritequal");
var meritGreater=getParameterByName("meritgreater");
var meritLower=getParameterByName("meritlower");
var fromUser=getParameterByName("fromuser");
var toUser=getParameterByName("touser");
var dateLower=getParameterByName("datelower");
var dateGreater=getParameterByName("dategreater");
var dateEqual=getParameterByName("dateequal");
				
		// This case we show the all merit history	
		if (isValidData(userid)){
			result = $(json).filter(function (i,n){return n.from.toLowerCase()==userid.toLowerCase()}).toArray();
			var table = createTable("Sent Merit",result);
			document.getElementById("tableSent").innerHTML = table;
			
			
			result = $(json).filter(function (i,n){return n.to.toLowerCase()==userid.toLowerCase()}).toArray();
			table = createTable("Received Merit",result);
			document.getElementById("tableReceived").innerHTML = table;
			
			return;
		}
		

		if (isValidData(tx)){
			result = $(result).filter(function (i,n){return n.tx==tx}).toArray();
		}
			
		
		if (isValidData(dateGreater) && isValidData(dateLower)) 
			result = getDataRange(dateGreater,dateLower,result);
		else if (isValidData(dateGreater)) 
			result = getDataAbove(dateGreater,result);
		else if (isValidData(dateLower)) 
			result = getDataBelow(dateLower,result);
		else if (isValidData(dateEqual)) 
			result = getDataEqual(dateEqual,result);

		if (isValidData(meritGreater) && isValidData(meritLower)) 
			result = getMeritRange(meritGreater,meritLower,result);
		else if (isValidData(meritGreater)) 
			result = getMeritAbove(meritGreater,result);
		else if (isValidData(meritLower)) 
			result = getMeritBelow(meritLower,result);
		else if (isValidData(meritEqual)) 
			result = getMeritEqual(meritEqual,result);
			
		if (isValidData(fromUser))
			result = $(result).filter(function (i,n){return n.from.toLowerCase()==fromUser.toLowerCase()}).toArray();
			
		if (isValidData(toUser))
			result = $(result).filter(function (i,n){return n.to.toLowerCase()==toUser.toLowerCase()}).toArray();
		
		if (isValidData(meritEqual))
			result = $(result).filter(function (i,n){return n.merit==meritEqual}).toArray();
			
		if (result == json){		
			document.getElementById("tableSent").innerHTML = "Apply some filter!";
		}
		else{
			var table = createTable("Merit Transactions",result);
			document.getElementById("tableSent").innerHTML = table;
		}
}
