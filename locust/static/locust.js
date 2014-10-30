var shouldRefresh = false;

$(window).ready(function() {
    if($("#locust_count").length > 0) {
        $("#locust_count").focus().select();
    }

    if(["hatching", "running"].indexOf($("body").attr("class")) != -1) {
      shouldRefresh = true;
      updateStats();
      updateExceptions();
    }

    $("#download-requests-timeline").click(function(e) {
      e.preventDefault();
      downloadRPSData();
    });
});

$("#box_stop a").click(function(event) {
    event.preventDefault();
    $.get($(this).attr("href"));
    $("body").attr("class", "stopped");
    shouldRefresh = false;
    $(".box_stop").hide();
    $("a.new_test").show();
    $("a.edit_test").hide();
    $(".user_count").hide();
});

$("#box_reset a").click(function(event) {
    event.preventDefault();
    $.get($(this).attr("href"));
});

$("#new_test").click(function(event) {
    event.preventDefault();
    $("#start").show();
    $("#locust_count").focus().select();
});

$(".edit_test").click(function(event) {
    event.preventDefault();
    $("#edit").show();
    $("#new_locust_count").focus().select();
});

$(".close_link").click(function(event) {
    event.preventDefault();
    $(this).parent().parent().hide();
});

var alternate = false;

$("ul.tabs").tabs("div.panes > div");

var stats_tpl = $('#stats-template');
var errors_tpl = $('#errors-template');
var exceptions_tpl = $('#exceptions-template');

$('#swarm_form').submit(function(event) {
    event.preventDefault();
    $.post($(this).attr("action"), $(this).serialize(),
        function(response) {
            if (response.success) {
                $("body").attr("class", "hatching");
                $("#start").fadeOut();
                $("#status").fadeIn();
                $(".box_running").fadeIn();
                $("a.new_test").fadeOut();
                $("a.edit_test").fadeIn();
                $(".user_count").fadeIn();
            }
            shouldRefresh = true;
            updateStats();
            updateExceptions();
        }
    );
});

$('#edit_form').submit(function(event) {
    event.preventDefault();
    $.post($(this).attr("action"), $(this).serialize(),
        function(response) {
            if (response.success) {
                $("body").attr("class", "hatching");
                $("#edit").fadeOut();
            }
        }
    );
});

var sortBy = function(field, reverse, primer){
    reverse = (reverse) ? -1 : 1;
    return function(a,b){
        a = a[field];
        b = b[field];
       if (typeof(primer) != 'undefined'){
           a = primer(a);
           b = primer(b);
       }
       if (a<b) return reverse * -1;
       if (a>b) return reverse * 1;
       return 0;
    }
}

// Sorting by column
var sortAttribute = "name";
var desc = false;
var report;
var reports = [];
$(".stats_label").click(function(event) {
    event.preventDefault();
    sortAttribute = $(this).attr("data-sortkey");
    desc = !desc;

    $('#stats tbody').empty();
    $('#errors tbody').empty();
    alternate = false;
    totalRow = report.stats.pop()
    sortedStats = (report.stats).sort(sortBy(sortAttribute, desc))
    sortedStats.push(totalRow)
    $('#stats tbody').jqoteapp(stats_tpl, sortedStats);
    alternate = false;
    $('#errors tbody').jqoteapp(errors_tpl, (report.errors).sort(sortBy(sortAttribute, desc)));
});

/**
* Needs to map the inputs to an array of { name: "Series X", data: { time: value, time_1: value_1 } }
* Google only supports two y-axes, so Users vs. Req/s it is then.
**/
function generateChartData(input) {
  var data = [
    { "name": "Users", "data": {} },
    { "name": "Req/s", "data": {} }
  ];
  var now = new Date();

  input.forEach(function( item, index) {
    var ticksAgo = input.length - index;
    var timeMark = new Date(now - (ticksAgo * 2000)); // JS Dates are in millis, and a tick is 2 seconds.
    data[0]["data"][timeMark] = item[0];
    data[1]["data"][timeMark] = item[1];
  });

  return data;
}

function extractChartData(report) {
  return [report.user_count, report.total_rps, report.fail_ratio];
}

function downloadRPSData() {
  chart = [ [ 'Time', 'Users', 'Req/s', 'Fail Ratio' ] ]
  var now = new Date();

  reports.forEach(function( item, index) {
    var ticksAgo = reports.length - index;
    var timeMark = new Date(now - (ticksAgo * 2000)); // JS Dates are in millis, and a tick is 2 seconds.
    chart.push([ timeMark, item[0], item[1], item[2] ])
  });

  chart = chart.map(function( row, index ) {
    return row.join(",");
  });

  var rps_doc = document.createElement('a');
  rps_doc.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent( chart.join("\n") ));
  rps_doc.setAttribute('download', 'requests_timeline.csv');
  rps_doc.click();
}

function updateStats() {
    $.get('/stats/requests', function (data) {
        report = JSON.parse(data);
        reports.push( extractChartData(report) );
        $("#total_rps").html(Math.round(report.total_rps*100)/100);
        //$("#fail_ratio").html(Math.round(report.fail_ratio*10000)/100);
        $("#fail_ratio").html(Math.round(report.fail_ratio*100));
        $("#status_text").html(report.state);
        $("#userCount").html(report.user_count);

        if (report.slave_count)
            $("#slaveCount").html(report.slave_count)

        $('#stats tbody').empty();
        $('#errors tbody').empty();

        alternate = false;

        totalRow = report.stats.pop()
        sortedStats = (report.stats).sort(sortBy(sortAttribute, desc))
        sortedStats.push(totalRow)
        $('#stats tbody').jqoteapp(stats_tpl, sortedStats);
        alternate = false;
        $('#errors tbody').jqoteapp(errors_tpl, (report.errors).sort(sortBy(sortAttribute, desc)));

        // Making a charty chart chart
        var data = generateChartData(reports);
        new Chartkick.LineChart("charty-charty-chart", data, {
          library: {
            series: { 1: { targetAxisIndex: 1 } },
            legend: { position: 'below' }
          }
        });

        if(shouldRefresh) { setTimeout(updateStats, 2000); }
    });
}

function updateExceptions() {
    $.get('/exceptions', function (data) {
        $('#exceptions tbody').empty();
        $('#exceptions tbody').jqoteapp(exceptions_tpl, data.exceptions);
        if(shouldRefresh) {  setTimeout(updateExceptions, 5000); }
    });
}