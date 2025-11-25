var pmid = "";
var curr_url = window.location.toString();


//var server_url = "https://static.doodlebook.org/cora/"; // port 9001
//var server_url = "https://static.doodlebook.org/cora9001/"; // port 9001 : in the future
//var server_url = "https://static.doodlebook.org/cora9003/"; // port 9003 : in the future
var server_url = "https://static.doodlebook.org/cora9002/"; // port 9002. manifest version: 0.20

var cora_btn_disabled = '';
var quick_response = '';
if (/pubmed.ncbi.nlm.nih.gov\/\d\d\d+/.test(curr_url)) {
	pmid = curr_url.match(/\d+/g).join('');
	task = 'check_if_ready_to_insert_the_CORA_button_for_the_current_pubmed_page';
	$.post(server_url, wrap_data({task:task, pmid:pmid})).done(function(response) {
		if (response=='ok') {
			cora_btn_disabled = '';
			add_search_btn_to_web_page();
		} else {
			cora_btn_disabled = 'disabled';
			console.log('- cora button disabled');
			//if (response=='null') { }
			quick_response = response;
			add_search_btn_to_web_page();
		}
	})
}

function wrap_data(data) {
	human_signature = ['a', '1']; for (var i=human_signature.length;i<24;i++) human_signature.push('z');
	data['signature'] = human_signature.join('');
	data['page_title'] = $('title').html();
	data['page_doi'] = $('.citation-doi').text();
	let authors = [];
	$('#heading .inline-authors .authors-list a.full-name').each(function() { authors.push($(this).html()); });
	data['page_authors'] = authors.join(' ; ');
	data['page_abstract'] = $('#abstract').text().replace(/\s+/mg, ' ')
	//console.log('- doi:', data.page_doi);
	//console.log(data.page_authors);
	//console.log(data.page_abstract);
	return data
}


function add_search_btn_to_web_page() {
	setTimeout(function(){
		let sty = cora_btn_disabled==''? ' ' : 'style="color:#999;background:#eee;border-color:#aaa"';
		let snippet =
			`<button type="button" class="btn-sm btn btn-danger" ${sty} id=btn_search_citation_contexts>CORA: Citation Contexts</button>` +
			'<button type="button" class="btn-sm btn btn-danger search_btn" id=btn_search_news_reports>Related News</button>' +
			'<button type="button" class="btn-sm btn btn-danger search_btn" id=btn_search_grants>Related Grants</button>' +
			'<div class=my_snippet id="div_lit_results"></div>';
		$('#toggle-authors').after(snippet);
		setTimeout(function(){
			$('#btn_search_citation_contexts').click(handler_click_btn_search_cora_citation);
			$('#btn_search_news_reports').click(handler_click_btn_search_news_reports);
			$('#btn_search_grants').click(handler_click_btn_search_grants);
		}, 100);
	}, 200); // I need to add this one to get the snippet inserted or modified or have effect
}

CatID_Label = {
    purpose: {0:'information', 1:'use', 2:'comparison', 3:'critique'},
    aspect: {0:'claim', 1:'method', 2:'background', 3:'data', 4:'goal-problem-challenge'},
	tone:  {
    0:'neutral', 1:'negative', 2:'positive',
    3:'accordance', 4:'discordance',
    5:'different', 6:'similar',
    7:'advantage', 8:'disadvantage',
    9:'mixed-positive-negative',
    10:'mixed-similar-different',
    11:'mixed-accordance-discordance',
    12:'mixed-advantage-disadvantage'
	}
}

function insert_search_results_next_to_the_search_button(response) {
	$('#cora_img_loading').hide();
	$('#div_lit_results').html(response).show();

    var show_limit = 5;
	setTimeout(function() {
			/*for (citation_purpose_label=0; citation_purpose_label<4; citation_purpose_label++) {
				for (j=0; j<show_limit; j++) { // at most {} citation context for each citation purpose
					$("#citedby_"+citation_purpose_label+"_"+j).click(display_citedby_detail);
				}
			}*/
			let page_size = 100;
			for (j=0; j<page_size; j++) { // TODO 2022-05-17
				$("#citedby_"+j).click(display_citedby_detail);
			}

			// added 2022-05-17
			for (let dim in CatID_Label) {
				for (let id in CatID_Label[dim]) {
					//console.log(dim, id, CatID_Label[dim][id])
					$("#filter_"+dim + "_" +  CatID_Label[dim][id]).click(click_filter_cora);
				}
			}

			$('.news-item').click(click_news_item);
			$('.grant-item').click(click_grant_item);
	}, 500);
}

let dim_val_desc = {
	'comparison': 'Authors cite another work in order to compare some features.',
	'critique': 'Authors cite another work in order to offer an explicit opinion on it.',
	'use': 'Authors cite another work because they use some part of that work in their own.',
	'information': 'Authors cite another work to provide the reader with additional information',

	'claim': 'The results or findings of research. Claims can also be arguments or positions.',
	'method': 'The ways that researchers reach their findings, the procedures they use in their experiments, the specific ways of measuring the data in a research setting, or an aspect that refers to specific forms of treatment.',
	'data': 'Refers to where researchers get data.',
	'goal-problem-challenge': 'the intent behind the research or the extent of the researcher’s investigation. It can also be the problem or challenge the research is focusing on.',
	'background': 'This aspect is used when the knowledge isn’t very specific; the citations are added so that readers can learn more elsewhere.',


	'accordance': 'Findings agree or consistent between the works',
	'discordance': 'Findings disagree or are not consistent',
	'accordance-discordance': 'Mixture of both (agreement in certain respects, discordance in others)',
	'similar': 'Methods are similar',
	'different': 'Methods are different',
	'similar-different': 'Mixture of both (similar in certain respects, different in others)',
	'advantage': 'Author clearly assigns advantage to one method over another',
	'disadvantage': 'Author clearly assigns the disadvantage to one method of another',
	'advantage-disadvantage': 'Mixture of both (advantageous in some ways, disadvantageous in others)',

	'positive': 'Positive tone',
	'negative': 'Negative tone',
	'positive-negative': 'Mixed positive and negative tones',
	'neutral': 'No positive or negative tone.'

}

function click_filter_cora() {
	//console.log('filter_cora:', this.id);
	let arr = this.id.split('_');
	$('.div_citing_purpose_box').hide();
	let dim = arr[1], dim_val = arr[2];
	$(`[data-${dim}=${dim_val}]`).show();

	$.post(server_url, wrap_data({task: 'post_click_cora_filter', pmid:pmid, div_id:this.id})).done(function(response) {
	})

	try {
		let desc = dim_val_desc[dim_val];
		let desc_html = `<b>Citation ${dim} (${dim_val}): </b> ${desc}`
		$('#cora_filter_description').html(desc_html);
	} catch(error) {
		console.log('- check description for:', dim_val);
	}
}
function display_citedby_detail() {
	//console.log('display_citedby_detail:', this.id);
	$("#csrc_" + this.id).toggle();
	$.post(server_url, wrap_data({task: 'post_click_cit_ctx_for_citedby_detail', pmid:pmid, div_id:this.id})).done(function(response) {
	})
}

function click_external_link(task, id) {
	$.post(server_url, wrap_data({task: task, pmid: pmid, id: id})).done(function(response) {})
}
function click_news_item() {
	click_external_link('post_click_eureka_url', this.id)
}
function click_grant_item() {
	click_external_link('post_click_grant_url', this.id)
}


function add_loading_gif() {
	if ($('#cora_img_loading').length) {
		$('#cora_img_loading').show();
	} else {
		var image = document.createElement("img");
		image.src = chrome.runtime.getURL("loading.gif");
		image.style.marginLeft = "10px";
		image.id = "cora_img_loading";
		$('#btn_search_grants').after(image);
		image.height = 28;
	}
}
function handler_click_btn_search_cora_citation() {
	if (cora_btn_disabled == 'disabled') {
		//response = 'Sorry, no citation context was found for this paper!';
		insert_search_results_next_to_the_search_button(quick_response);
		return
	}
	add_loading_gif();
	task = 'get_citation_purpose_for_sentences';
	data = {task: task, pmid: pmid}
	$.post(server_url, wrap_data(data)).done(function(response) {
		if (!response || response=='null') {
			console.log('- NO response.');
		} else {
			insert_search_results_next_to_the_search_button(response);
		}
	})
}

function handler_click_btn_search_grants() {
	add_loading_gif();
	task = 'search_grants_for_pmid';
	$.post(server_url, wrap_data({task: task, pmid:pmid})).done(function(response) {
		insert_search_results_next_to_the_search_button(response);
	})
}
function handler_click_btn_search_news_reports() {
	add_loading_gif();

	task = 'search_news_articles_for_pmid';
	$.post(server_url, wrap_data({task: task, pmid:pmid})).done(function(response) {
		insert_search_results_next_to_the_search_button(response);
	})
}

$(document).ready(function() {
	setTimeout(function(){
	}, 500);
});
