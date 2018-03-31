// const window.con = require('mysql-ssh');
const fontawesome = require('@fortawesome/fontawesome');
const faSolid = require('@fortawesome/fontawesome-free-solid')
const { remote } = require('electron')
// fontawesome.library.add(solid.faServer)
// fontawesome.library.add(solid.faDatabase)

window.con = require('mysql-ssh');
window.mysql = undefined;

window.destroy = function() {
    database.closeAll();
};

function runQuery(query, callback) {
    if (window.mysql == undefined) {

    } else {
        addToHistory(query);
        window.mysql.query(query, callback)
    }
}

function addToHistory(query) {
    var history = notulous.storage.get('history');
    if (!history) {
        history = [];
    }
    history.unshift({
        date: Date(),
        query: query
    });
    if (history.length > 100) {
        history.pop();
    }
    notulous.storage.set("history", history);
}

function getDatabases() {
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.databases-but').addClass('active').show();
    runQuery('SHOW DATABASES', function (err, results, fields) {
        if (err) {
            throw err;
        }
        var databases = {system: [], user: []};
        for (var i=0; i<results.length; i++) {
            for (var prop in results[i]) {
                if (prop.toLowerCase() == 'database') {
                    switch (results[i][prop]) {
                        case 'information_schema':
                        case 'performance_schema':
                        case 'mysql':
                            databases.system.push(results[i][prop]);
                            break;
                        default:
                            databases.user.push(results[i][prop]);
                            break;
                    }
                }
            }
        }
        $("#menu .content").html(notulous.util.renderTpl("databases", databases))
    });
};

$(document).on('click',  '#list .tables li', function(e) {
    getTable($(this).text());
    $('#list .tables li.active').removeClass('active');
    $("#workspace .top .buttons").not(".database").hide();
    $(this).addClass('active');
});

function getTable(table, page, sort, order) {
    var limit = 1000;
    var start = page ? page - 1 : 0;
    var start = start * limit;
    var query = 'SELECT * FROM ' + table;
    if (sort && order) {
        query += " ORDER BY " + sort + " " + order;
    }
    query += " LIMIT " + start + ", " + limit + ";";
    runQuery(query , function (err, records, fields) {
        if (err) {
            throw err;
        }
        $("#workspace .content").html(
            notulous.util.renderTpl("table", {
                fields: fields,
                records: records,
                table: table,
                page: page,
                sort: sort,
                order: order
            }
        ));
        $("#workspace .content table th").on("click", function() {
            var order = $(this).data("order");
            if (notulous.util.empty(order)) {
                order = 'desc';
            }
            getTable($("#workspace .content table").data("table"), undefined, $(this).data("sort"), order);
        });
    });
};

function getTable(table, page, sort, order) {
    var data = {
        table: table,
        sort: sort,
        order: order,
        limit: 1000,
        query: 'SELECT * FROM ' + table
    };
    data.page = page ? page : 1;
    data.start = data.page - 1;
    data.start = data.start * data.limit;
    if (sort && order) {
        data.query += " ORDER BY " + sort + " " + order;
    }
    data.query += " LIMIT " + data.start + ", " + data.limit + ";";
    __getTable(data);
};

function __getTable(data) {
    runQuery("SHOW TABLE STATUS WHERE `Name` = '" + data.table + "';" , function (err, records, fields) {
        if (err) {
            throw err;
        }
        data.count = records[0].Rows;
        runQuery({sql:data.query, typeCast:false} , function (err, records, fields) {
            if (err) {
                throw err;
            }
            data.fields = fields;
            data.records = records;
            var length = data.records.length;
            data.end = data.start + length;
            if (data.page > 1) {
                data.previous = data.page - 1;
            }
            if (length == data.limit) {
                data.next = data.page + 1;
            }
            data.start += 1;
            var html = notulous.util.renderTpl("table", data);
            $("#workspace .content > div").hide();
            if ($("#workspace .content .table").length > 0) {
                $("#workspace .content .table").replaceWith(html);
                $("#workspace .content .table").show();
            } else {
                $("#workspace .content").append(html);
            }
            $("#workspace .content .table th").on("click", function() {
                var order = $(this).data("order");
                if (notulous.util.empty(order)) {
                    order = 'desc';
                }
                getTable($("#workspace .content .table").data("table"), undefined, $(this).data("sort"), order);
            });
            $("#workspace .content .status .next, #workspace .content .status .previous").on("click", function() {
                var table = $("#workspace .content .table");
                getTable(table.data("table"), $(this).data("page"), table.data("sort"), table.data("order"));
            });
        });
    });

};

$(document).on("dblclick", ".top", function(e) {
    window.maximize();
});

$(document).on('click',  '#menu .databases li', function(e) {
    $("#workspace .content").html("");
    $("#workspace .top .buttons.database").show();
    runQuery('USE `' + $(this).text() + '`');
    runQuery('SHOW TABLES;' , function (err, results, fields) {
        if (err) {
            throw err;
        }
        $("#list .content").html(notulous.util.renderTpl("tables", {tables: results}))
    });
    $('#menu .databases li.active').removeClass('active');
    $(this).addClass('active');
});

$(document).on('click',  '#menu .top .button.instances-but', function(e) {
    $("#menu .content").html(notulous.util.renderTpl("instances", notulous.config.load()));
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.instances-but').addClass('active').show();
    $("#workspace .content").html("");
    $("#list .content").html("");
    $("#workspace .top .buttons").hide();
});

$(document).on('click',  '#menu .top .button.databases-but', function(e) {
    getDatabases();
});

$(document).on('click',  '#menu .instances li', function(e) {
    database.load(notulous.config.instance($(this).data('key')), function(client) {
        window.mysql = client;
        getDatabases();
    });
});

$(document).on('click',  '#workspace .top .database .terminal', function(e) {
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").show();
    if ($("#workspace .content .terminal").length > 0) {
        $("#workspace .content .terminal").show();
    } else {
        var html = notulous.util.renderTpl("database-terminal");
        $("#workspace .content").append(html);
        window.editor = CodeMirror.fromTextArea($("#workspace #editor")[0], {
            mode: "text/x-mysql",
            // mode: "sql",
            keyMap: "sublime",
            // theme: "tomorrow-night-bright",
            indentWithTabs: false,
            lineWrapping: true,
            smartIndent: true,
            lineNumbers: true,
            matchBrackets : true,
            autofocus: true,
        });
    }
});

$(document).on('click',  '#workspace .top .buttons.terminal .run', function(e) {
    var query = window.editor.getValue();
    runQuery(query , function (err, records, fields) {
        if (err) {
            throw err;
        }
        $("#workspace .content .results").html(
            notulous.util.renderTpl("table", {
                fields: fields,
                records: records,
                // table: table,
                // page: page,
                // sort: sort,
                // order: order
            }
        ));
        // $("#workspace .content table th").on("click", function() {
        //     var order = $(this).data("order");
        //     if (notulous.util.empty(order)) {
        //         order = 'desc';
        //     }
        //     getTable($("#workspace .content table").data("table"), undefined, $(this).data("sort"), order);
        // });
    });
});

$(document).on('mousedown',  '#menu .resize, #list .resize', function(e) {
    var container = $(this).parent();
    $("#workspace .container").hide();
    $(document).on("mouseup", function(e) {
        $(document).off("mousemove");
        $(document).off("mousup");
        var sizes = {
            menu: $("#menu").width(),
            list: $("#list").width()
        };
        notulous.storage.set("window", sizes);
        $("#workspace .container").show();
    });
    $(document).on("mousemove", function(e) {
        var width = e.pageX - container.offset().left;
        if (width < 200) {
            width = 200;
        }
        container.width(width);
        resizeWindow();
    });
});

function resizeWindow() {
    $("#list").css({left: $("#menu").width()});
    $("#workspace").css({left: $("#menu").width() + $("#list").width()});
};

$(document).on('keyup',  '#menu .search input, #list .search input', function(e) {
    var query = $(this).val();
    $(this).parent().parent().find("ul li").each(function() {
        if (notulous.util.fuzzyCompare(query, $(this).text())) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
});

$(document).ready(function() {
    $("#menu .content").html(notulous.util.renderTpl("instances", notulous.config.load()));
    var window = notulous.storage.get("window");
    if (window) {
        $("#menu").width(window.menu);
        $("#list").width(window.list);
        resizeWindow();
    }
});
