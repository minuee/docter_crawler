function save_options() {
  var threshold = document.getElementById('threshold').value;
  var isFilter = document.getElementById('isFilter').checked;

  var array = []
  var checkboxes = document.getElementById("qs").querySelectorAll('input[type=checkbox]:checked')

  for (var i = 0; i < checkboxes.length; i++) {
    array.push(checkboxes[i].value)
  }
  chrome.storage.sync.set({
    tsh: threshold,
    isf: isFilter, 
    qs: array
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    tsh: 0.0,
    isf: true,
    qs: ['Q1', 'Q2', 'Q3', 'Q4']
  }, function(items) {
    document.getElementById('threshold').value = items.tsh;
    document.getElementById('isFilter').checked = items.isf;
    document.getElementById('q1').checked = items.qs.includes('Q1');
    document.getElementById('q2').checked = items.qs.includes('Q2');
    document.getElementById('q3').checked = items.qs.includes('Q3');
    document.getElementById('q4').checked = items.qs.includes('Q4');
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);