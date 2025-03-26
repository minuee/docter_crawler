function bold(s){
	return `<b>${s}</b>`
}

function getSingleIF(newBlock, callback){
	newBlock.find(".docsum-citation").each(function(i){
		try {
			var journalVitation = $($(this).find('.docsum-journal-citation')[0]);

			var journalName = journalVitation.text().match(/[^.]+/gi)[0];

			var imfQ = dataSource[journalName.toUpperCase()];
			if (imfQ !== undefined){
				var impactFactor = imfQ[0];
				var q = imfQ[1];
				ifList.push(impactFactor);
				journalVitation.html(journalVitation.text().replace(journalName, `<b><i>${journalName}</i></b> (IF: <span class="if"><u>${impactFactor}</u></span><span>; </span><span class="quartile"><b>${q}</b></span>)`));
			}

			else{
				journalVitation.html(journalVitation.text().replace(journalName, `<b><i>${journalName}</i></b> (<a href=${link} target="_blank">Report missing IFs</a>)`));
			}
			var item = $(this).parents('.full-docsum');
			if ((imfQ === undefined && threshold > 0) || (impactFactor < threshold) || (!qsChecked.includes(q) && qsChecked.length < 4)){
				//item.attr("class", "labs-full-docsum hiddenRprt");
				item.hide();
			}
		} catch (error) {
			
		}

		var snippet = item.find('.docsum-snippet');
		var noAbstractLabel = $(this).find('.no-abstract');
		var pmidEle = $(this).find(".docsum-pmid");
		var pmid = pmidEle.text();

		if(noAbstractLabel.length > 0){

		}
		else if(snippet.length > 0){
			var shownSnippet = snippet.find('div:visible').css('display', 'inline');
			var oldHtml = shownSnippet.html();
			//shownSnippet.html(shownSnippet.html().replaceAll('…', ''));
			$('<span></span>').html('>>>').insertAfter(shownSnippet).css({
				'display': 'inline',
				'font-weight': '600',
				'color': '#C05600'
			}).on({
				mouseenter: function() {
					$(this).css({
						'cursor':'pointer',
						'color': '#0056C0',
						'font-weight': '700',
					});
				}, 
				mouseleave: function() {
					$(this).css({
						'cursor': 'auto',
						'color': '#C05600',
						'font-weight': '600',
					});
				},
				click: function(e){
					if ($(e.target).text() == '>>>'){
						getAbstract(pmid, function(t){
							terms.forEach(element => {
								var regEx = new RegExp(element, "ig");
								t = t.replaceAll(regEx, bold);
							});
							shownSnippet.html(t);
							$(e.target).html('<<<');
						});
					}
					else{
						shownSnippet.html(oldHtml);
						$(e.target).html('>>>');
					}
				},
			});
		}

		else{	// snippet not shown
			var abstractEle = $('<div></div>').appendTo($(this)).text("").css(
				'color', 'black'
			).hide();
			$('<span></span>').insertBefore(abstractEle).html('Show Abstract').addClass(
				'spaced-citation-item'
			).css(
				{
					'font-weight': '600',
					'color': '#C05600'
				}
			).on({
				mouseenter: function() {
					$(this).css({
						'cursor':'pointer',
						'color': '#0056C0',
						'font-weight': '700',
					});
				}, 
				mouseleave: function() {
					$(this).css({
						'cursor': 'auto',
						'color': '#C05600',
						'font-weight': '600',
					});
				},
				click: function(e){
					if ($(e.target).text() == "Show Abstract"){
						if(abstractEle.text() == ""){
							getAbstract(pmid, function (t) { 
							
								terms.forEach(element => {
									var regEx = new RegExp(element, "ig");
									t = t.replaceAll(regEx, bold);
								});
								abstractEle.html(t);						
							 });
						}
						abstractEle.slideDown();
						$(e.target).text("Hide Abstract");
					}
					else{
						abstractEle.slideUp();
						$(e.target).text("Show Abstract");
					}
					
				},
			});
		}
		
		$(this).find('.free-resources:contains("Free PMC article")').on({
			mouseenter: function() {
				$(this).css({
					'cursor':'pointer',
					'color': '#0056C0',
					'font-weight': '700',
				});
			}, 
			mouseleave: function() {
				$(this).css({
					'cursor': 'auto',
					'color': '#C05600',
					'font-weight': '600',
				});
			},
			click: function(){
				getPmcId(pmid);
			},
		});
		
	});

	newBlock.find(".journal-actions-trigger").each(function(){
		var journalName1 = $(this).text().trim();
		var imfQ = dataSource[journalName1.toUpperCase()];
		if (imfQ !== undefined){
			var impactFactor = imfQ[0];
			var q = imfQ[1];
			//console.log(imfQ);
			ifList.push(impactFactor);
			$(this).html($(this).html().replace(journalName1, `<b><i>${journalName1}</i></b> (IF: <span class="if"><u>${impactFactor}</u></span><span>; </span><span class="quartile"><b>${q}</b></span>)`));
		}

		else{
			$(this).html($(this).html().replace(journalName1, `<b><i>${journalName1}</i></b> (<a href=${link} target="_blank">Report missing IFs</a>)`));
		}
		if ((imfQ === undefined && threshold > 0) || (impactFactor < threshold) || (!qsChecked.includes(q) && qsChecked.length < 4)){
			// item.attr("class", "results-article hiddenRprt");
			$(this).parents('.results-article').hide();
		  }
	});

	callback(ifList);
}

var threshold;
var isFilter;
var qsChecked;
var terms;
var ifList = [];
var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var link = "https://docs.google.com/spreadsheets/d/1HdOk6pxH67Pt12FLTby6ZNPi3_1ixgKVKQULxjc1Fs4/edit?usp=sharing";

function checkOption(){
  chrome.storage.sync.get({
    tsh: 0.0,
	isf: true,
	qs: ['Q1', 'Q2', 'Q3', 'Q4']
  }, function(items) {
    threshold = items.tsh;
	isFilter = items.isf;
	qsChecked = items.qs;

	function isChecked(s){
		if(qsChecked.includes(s)){
			return 'checked';
		}
		return '';
	}


		$(".choice-group-wrapper").prepend(`<div class="choice-group articleattr"><strong class="title">JCR Quartile</strong><ul class="items" id="qs" style="display: flex">
		<li> <input class="quartileBox"  type="checkbox" id="id_q1" value="Q1" ${isChecked('Q1')}> <label for="id_q1" style="padding-left: 2rem; padding-right: 1rem"> Q1 </label> </li>
		<li> <input class="quartileBox"  type="checkbox" id="id_q2" value="Q2" ${isChecked('Q2')}> <label for="id_q2" style="padding-left: 2rem; padding-right: 1rem"> Q2 </label> </li>
		<li> <input class="quartileBox"  type="checkbox" id="id_q3" value="Q3" ${isChecked('Q3')}> <label for="id_q3" style="padding-left: 2rem; padding-right: 1rem"> Q3 </label> </li>
		<li> <input class="quartileBox"  type="checkbox" id="id_q4" value="Q4" ${isChecked('Q4')}> <label for="id_q4" style="padding-left: 2rem; padding-right: 1rem"> Q4 </label> </li>
		</ul></div>`);
	  
		var ifFilterEle = $(`<div class="timeline-filter side-timeline-filter lots-of-bars" style="">

		<strong class="title">
		  Results by impact factor
		</strong>

		<div class="inner-wrap">
		  <div class="histogram" id="if-histogram">
			<svg xmlns="http://www.w3.org/2000/svg">
				 			<g class="bar-group selected" data-bar-index="0">
							 <rect class="bar-bg" x="0%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="0%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="1">
							 <rect class="bar-bg" x="3.3333333333333335%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="3.3333333333333335%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="2"
							 ><rect class="bar-bg" x="6.666666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="6.666666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="3">
							 <rect class="bar-bg" x="10%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="10%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="4">
							 <rect class="bar-bg" x="13.333333333333334%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="13.333333333333334%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="5">
							 <rect class="bar-bg" x="16.666666666666668%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="16.666666666666668%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="6">
							 <rect class="bar-bg" x="20%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="20%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="7">
							 <rect class="bar-bg" x="23.333333333333336%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="23.333333333333336%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="8">
							 <rect class="bar-bg" x="26.666666666666668%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="26.666666666666668%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="9">
							 <rect class="bar-bg" x="30%" y="0" width="3.3333333333333335%" height="100%">
							 </rect><rect class="bar" x="30%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="10">
							 <rect class="bar-bg" x="33.333333333333336%" y="0" width="3.3333333333333335%" height="100%">
							 </rect><rect class="bar" x="33.333333333333336%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="11">
							 <rect class="bar-bg" x="36.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="36.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="12">
							 <rect class="bar-bg" x="40%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="40%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="13">
							 <rect class="bar-bg" x="43.333333333333336%" y="0" width="3.3333333333333335%" height="100%">
							 </rect><rect class="bar" x="43.333333333333336%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="14">
							 <rect class="bar-bg" x="46.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="46.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="15">
							 <rect class="bar-bg" x="50%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="50%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="16">
							 <rect class="bar-bg" x="53.333333333333336%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="53.333333333333336%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="17">
							 <rect class="bar-bg" x="56.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="56.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="18">
							 <rect class="bar-bg" x="60%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="60%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="19">
							 <rect class="bar-bg" x="63.333333333333336%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="63.333333333333336%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="20">
							 <rect class="bar-bg" x="66.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="66.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="21">
							 <rect class="bar-bg" x="70%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="70%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="22">
							 <rect class="bar-bg" x="73.33333333333334%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="73.33333333333334%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="23">
							 <rect class="bar-bg" x="76.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="76.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="24">
							 <rect class="bar-bg" x="80%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="80%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="25">
							 <rect class="bar-bg" x="83.33333333333334%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="83.33333333333334%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="26">
							 <rect class="bar-bg" x="86.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="86.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="27">
							 <rect class="bar-bg" x="90%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="90%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="28">
							 <rect class="bar-bg" x="93.33333333333334%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="93.33333333333334%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
							 <g class="bar-group selected" data-bar-index="29+">
							 <rect class="bar-bg" x="96.66666666666667%" y="0" width="3.3333333333333335%" height="100%"></rect>
							 <rect class="bar" x="96.66666666666667%" y="50%" width="3.3333333333333335%" height="50%"></rect>
							 </g>
			</svg>
	
			<div class="hint">
			  <span class="ifVal">0</span>
			</div>
		  </div>
		  <div class="slider" style="">
		  	<div class="noUi-base">
		  		<input type="range" min="0" max="29" value="${threshold}" class="ifSlider noUi-connect noUi-draggable" id="slider" style="transform: translate(0%, 0px) scale(1, 1);">
		 	 </div>
			
			</div>
		</div>
	</div>`)
	
		$('#static-filters-form').before(ifFilterEle);

		ifFilterEle.find('g').on({
			mouseenter: function (e) {
				var offsetX = ifFilterEle.find("#if-histogram").offset().left;
				var thresholdText = $(this).attr('data-bar-index');
				var hint = ifFilterEle.find('.hint');
				//hint.find('.ifVal').text(thresholdText);
				hint.find('.ifVal').text(`IF ${thresholdText}: ${counts[parseInt(thresholdText)]}`);
				hint.css('left', `${e.pageX - offsetX}px`);
				hint.addClass('active');
			  },
			mouseleave: function () {
				ifFilterEle.find('.hint').removeClass('active');
			  },
			click: function () {
				var thisg = $(this);
				threshold = parseFloat($(this).attr('data-bar-index'));
				$("#slider").val(threshold);
				showHide(threshold, function(){
					thisg.find('.bar').css('opacity', '1');
					thisg.prevAll().find('.bar').each(function () { 
						$(this).css('opacity', '0.2');
					});
					thisg.nextAll().find('.bar').each(function () { 
						$(this).css('opacity', '1');
					});
				  }
				);
			}
		}).slice(0,threshold).find('.bar').css('opacity', '0.2');

		$(".quartileBox").on('input', (function(e){
			showHidebyQ();
		}));

		$("#slider").css({
			'height': '1px',
			'outline': 'none',
			'padding-right': '0px',
			'-webkit-appearance': 'none',
  			'opacity': '0.7',
		}).on({
			mouseenter: function () {
				$(this).css('opacity', '1');
			  },
			mouseleave: function () {
				$(this).css('opacity', '0.7');
				var hint = ifFilterEle.find('.hint');
				hint.removeClass('active');
			  },
			input: function(e){
				var ifVal = $(e.target).val();
				var offsetX = ifFilterEle.find("#if-histogram").offset().left;
				try{
					var barX = $("#if-histogram").find(`g:nth-child(${ifVal})>.bar`).offset().left;
				}
				catch{
					var barX = e.pageX;
				}
				
				var hint = ifFilterEle.find('.hint');
				hint.find('.ifVal').text(ifVal);
				hint.css('left', `${barX - offsetX}px`);
				hint.addClass('active');
			},
			change: function(e){
				threshold = parseFloat($(e.target).val());
				showHide(threshold, function(){
					$("#if-histogram").find('.bar').each(function (indexInArray, valueOfElement) { 
						if(indexInArray < threshold){
							$(this).css('opacity', '0.2');
						}
						 else{
							$(this).css('opacity', '1');
						 }
					});
				});
			},
		});
		
		getSingleIF($(document.body), updateIfSlide);
	
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
			   var added = mutation.addedNodes;
			   if(added !== null){
				   var $node = $(added);
				   $node.each(function(){

					   if ($($(this)[0]).hasClass("results-chunk")){
						   var newBlock = $($(this)[0]);
							getSingleIF(newBlock, updateIfSlide);
					   }
		   
				   })
			   }
			})
		   });
		 observer.observe(document, { childList: true, subtree : true });
		try{
			terms = $('#id_term').val().split(' ');
		}
		catch{
			terms = [];
		}
		
  });
  
}

function updateIfSlide(ifs){
	ifs.forEach(element => {
		if(element>29){
			counts[29] = counts[29] + 1;
		}
		else{
			var index = Math.floor(element);
			counts[index] = counts[index] + 1;
		}
	});
	
	var max = Math.max(...counts);
	if(max == 0){
		max++;
	}
	var percentage = counts.map(function (param) {
		return param * 100/max;
	  });

	$("#if-histogram").find('.bar').each(function (indexInArray, valueOfElement) { 
		 $(this).attr('height', `${percentage[indexInArray]}%`);
		 $(this).attr('y', `${100 - percentage[indexInArray]}%`);
	});
}

function showHide(threshold, callback){
	qsChecked = [];
	$("#qs").find("input:checkbox:checked").each(function(){
		qsChecked.push($(this).val());
	});
	$('.full-docsum').each(function(){
		var ifVal = parseFloat($(this).find(".if").text());
		var qText = $(this).find(".quartile").text();
		if((ifVal > threshold || threshold == 0) && (qsChecked.includes(qText) || qsChecked.length == 4)){
			$(this).slideDown();
		}
		else{
			$(this).slideUp();
		}
	});
	$(".results-article").each(function(){
		var ifVal = parseFloat($(this).find(".if").text());
		var qText = $(this).find(".quartile :first").text();
		if((ifVal > threshold || threshold == 0) && (qsChecked.includes(qText) || qsChecked.length == 4)){
			$(this).slideDown();
		}
		else{
			$(this).slideUp();
		}
	});
	callback();
}

function showHidebyQ(){
	qsChecked = [];
	$("#qs").find("input:checkbox:checked").each(function(){
		qsChecked.push($(this).val());
	});

	var threshold = parseFloat($("#slider").val());

	var items = $('.full-docsum');
	var items1 = $(".results-article");
	items.each(function(){
		var ifText = $(this).find(".if").text();
		var ifVal = parseFloat(ifText);
		var qText = $(this).find(".quartile").text();
		if((ifVal > threshold || threshold == 0) && (qsChecked.includes(qText) || qsChecked.length == 4)){
			$(this).slideDown();
		}
		else{
			$(this).slideUp();
		}
	});
	items1.each(function(){
		var ifText = $(this).find(".if").text();
		var ifVal = parseFloat(ifText);
		var qText = $(this).find(".quartile :first").text();
		// console.log(qText);
		if((ifVal > threshold || threshold == 0) && (qsChecked.includes(qText) || qsChecked.length == 4)){
			$(this).slideDown();
		}
		else{
			$(this).slideUp();
		}
	});
}



function getPmcId(pmid){
	  var url = 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=medline&id=';
	  $.get(url+pmid, function(data, status){
		var rawText = data.match(/PMC - PMC\d+/i)[0];
			var text = rawText.replace("PMC - PMC", "");
			var href = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${text}/`;
			window.open(href, "_blank"); 
	  });
}


function getAbstract(id, callback){
  var xhr = new XMLHttpRequest();
  var url = 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=medline&id=';
  // var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=';
  xhr.open("GET", url+id);
  xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var rawText = xhr.response.match(/AB\s+-\s+[\s\S]+?[A-Z]{2,4}\s+-\s+/i)[0];
		var text = rawText.replace(/[A-Z]{2,4}\s+-\s+/ig, '');
        callback(text);
      }
    }
  xhr.send();
}

/*
function getCitation(id, elem){
	var xhr = new XMLHttpRequest();
	var url = 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=citation&id=';
	// var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=';
	xhr.open("GET", url+id);
  	xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var rawText = $.parseJSON(xhr.response);
		var text = rawText[fmt].format;
		
		elem.html(text);
		elem.parent().slideDown();
		// alert("Copied!");
      }
    }
  	xhr.send();
  }
*/

$(document).ready(checkOption);