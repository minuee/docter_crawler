//console.log("hello");
var url = window.location.toString();
//console.log(url);

if (url.includes("scholar.google.") == true){

   googlescholaraltmetric();
}else{
	pubmedaltmetric();
}

function googlescholaraltmetric () {

    googlescholar();

}

function pubmedaltmetric(){

	pubmed();
}

function googlescholar() {
	var nodes = document.getElementsByClassName('gs_rt');
	var dois = [];
    for(var i = 0; i < nodes.length; i++){
        var element = nodes[i].getElementsByTagName('a');
		//console.log(typeof(link));
		if (typeof element[0] !== "undefined"){
		   var link = element[0].href;
		    if (link.includes("10.")===true){
			  var doi = link.substring(link.indexOf("10."));
			  doi = doi.replace("&rep=rep1&type=pdf", "");
			  doi = doi.replace(".pdf", "");
			  doi = doi.replace("/full/html", "")
			  doi = doi.replace("/meta", "");
			  doi = doi.replace("&type=googlepdf", "");
			  dois.push("doi/"+doi);
		    }
		    else if(link.includes("arxiv") === true){
			  var doi = link.substring(link.indexOf("abs/")+4);
			  dois.push("arxiv/"+doi);
		    }
		    else if(link.includes("sciencedirect") === true){
			  var pii = link.substring(link.indexOf("pii/")+4);
			  var doi = getelsevierdoi(pii);
		 	  dois.push("doi/"+doi);
		    }
		    else if(link.includes("nature") === true){
			  var doi = link.substring(link.indexOf("articles/")+9);
			  doi = doi.replace("/briefing/signup/","");
			  doi = "10.1038/" + doi;
			  dois.push("doi/"+doi);
			}
			else if(link.includes("rsc") === true){
			  var doi = link.substring(52, 62);
			  doi = "10.1039/" + doi;
			  dois.push("doi/"+doi);
			}
		    else {
			  dois.push("none");
	        }
		}
		else {
			dois.push("none");
		}
		
    }
	var nodes = document.getElementsByClassName("gs_ri");
 	for(var i =0; i<dois.length; i++){
		//console.log(dois[i]);
 		modifywebpagegooglescholar(dois[i], nodes[i]);
	}
	//getaltmetric(links);
}

async function getdoi(links){

	api = 'http://127.0.0.1:8000/getdoi'
	headers = {'accept': 'application/json', 'Content-Type': 'application/json'}
	//links = ['1', '2']
	//console.log(link);
	//links = [link[0]];
	link = JSON.stringify(links);
	//console.log(link);
	let response = await fetch(api, {
	  "headers": headers,
	  "body": links,
	  "method": "POST"
	});
    if (response.status === 200) {
        //let data = await response.text();
		let data = await response.json();
        dois = data.dois;
    };
	return dois;
}

function modifywebpagegooglescholar(doi, node) {
	
	if(doi !== "none"){	
		var url = 'https://api.altmetric.com/v1/' + doi;
    
		fetch(url).then(function(response){
			if (response.ok) {
				response.json().then(function(data) {

					if(Math.round(data.score) == 0){
						var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/1.png';
					 }else{
						 var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/' + Math.round(data.score) + '.png';
					 }
 
					//var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/' + Math.round(data.score) + '.png';
	
					var a = document.createElement('a');
					a.setAttribute('href', data.details_url);
					a.setAttribute('target', '_blank');
					a.style.display = 'block';
	 
					var image = document.createElement('img');
					image.setAttribute('src', url);
					a.appendChild(image);

					node.insertBefore(a, node.childNodes[1]);
	
				});
			}
		
	
	        else {	
                //var folder = "extension/altmetric/Picture1.png"
				var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/0.png';
				//var url = "Picture1.png";
	
				//var a = document.createElement('a');
				// //a.setAttribute('href', data.details_url);
				// a.setAttribute('target', '_blank');
				// a.style.display = 'block';
	 
				var image = document.createElement('img');
				image.setAttribute('src', url);
				//image.setAttribute("class", "no_data");
				//a.appendChild(image);

				node.insertBefore(image, node.childNodes[1]);
	
	        }
		});
	}
}

function getelsevierdoi(pii){

	var url = "https://api.elsevier.com/content/article/PII:" + pii + "?httpAccept=text/xml";
	var xmlhttp = new XMLHttpRequest(); 
	xmlhttp.open("GET",url,false); 
	xmlhttp.send(""); 
	xmlDoc = xmlhttp.responseXML; 
	var doi = xmlDoc.getElementsByTagName("prism:doi")[0].childNodes[0].nodeValue;
	//console.log(doi);
    return doi;

}

//mutation observer to check the change on the pageload

const observer = new MutationObserver(function (mutations) {
mutations.forEach(function (mutation) {
 	  if (mutation.attributeName === 'href') {
 		pubmed();
 	  }
 	})
   })
  const button = document.getElementsByClassName('current-page-label')
  observer.observe(button[0], {
 	childList: false,
 	attributes: true
   })

function pubmed() {
	var nodes = document.getElementsByClassName("docsum-pmid");
	var div_dl = document.getElementsByClassName("docsum-content");

	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		//var text = node.innerText;
		var pmid = node.innerText;
		//var doi = text.substring(text.indexOf("doi: ") + 5, text.lastIndexOf(". "));
		//console.log(pmid);
        //dois.push(pmid);
		modifywebpagepubmed(pmid, div_dl[i]);
	}
}

function modifywebpagepubmed(pmid, node) {

		var url = 'https://api.altmetric.com/v1/pmid/' + pmid;
		var length = (node.childNodes).length  

        var request = new Request(url, {
			referrer: 'https://pubmed.ncbi.nlm.nih.gov/'
		});
    
		fetch(request).then(function(response){
			if (response.ok) {
				response.json().then(function(data) {
                /// check if the node alreday has the altmetric node, no node => 7, with node =>8
					if (length !== 8){

                       if(Math.round(data.score) == 0){
					      var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/1.png';
					   }else{
						   var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/' + Math.round(data.score) + '.png';
					   }
	
					    var a = document.createElement('a');
					    a.setAttribute('href', data.details_url);
						a.setAttribute('class', "altmetric_data");
					    a.setAttribute('target', '_blank');
					    a.style.display = 'block';
	 
					    var image = document.createElement('img');
					    image.setAttribute('src', url);
					    a.appendChild(image);

					    node.insertBefore(a, node.childNodes[3]);
					}
	
				}); 
			}
			else {
				if (length !== 8){	
				//var folder = "extension/altmetric/Picture1.png"
				var url = 'https://d1uo4w7k31k5mn.cloudfront.net/v1/0.png';
				var a = document.createElement('a');
				//a.setAttribute('href', data.details_url);
				//a.setAttribute('class', "altmetric_data");
				a.setAttribute('target', '_blank');
				a.style.display = 'block';
	 
				var image = document.createElement('img');
				image.setAttribute('src', url);
				a.appendChild(image);

				node.insertBefore(a, node.childNodes[3]);
				}
			}
		});
}
