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
    if (query instanceof Object) {
        query = query.sql;
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
            return parseError(err);
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

function parseError(err) {
    addNotification("Error in query", err.message, "error");
    return err.message;
}

$(document).on('click',  '#notifications .notification', function(e) {
    $(this).remove();
});

function addNotification(title, content, type) {
    $("#notifications").prepend(notulous.util.renderTpl("notification", {title: title, content: content, type: type}));
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
            return parseError(err);
        }
        var html = notulous.util.renderTpl("table", {
                fields: fields,
                records: records,
                table: table,
                page: page,
                sort: sort,
                order: order
            }
        );
        if ($("#workspace .content > .table").length == 0) {
            $("#workspace .content").append(html);
        } else {
            $("#workspace .content > .table").replaceWith(html);
        }
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
            return parseError(err);
        }
        data.count = records[0].Rows;
        runQuery({sql:data.query, typeCast:false}, function (err, records, fields) {
            if (err) {
                return parseError(err);
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
            if ($("#workspace .content > .table").length > 0) {
                $("#workspace .content > .table").replaceWith(html);
                $("#workspace .content > .table").show();
            } else {
                $("#workspace .content").append(html);
            }
            $("#workspace .content > .table th").on("click", function() {
                var order = $(this).data("order");
                if (notulous.util.empty(order)) {
                    order = 'desc';
                }
                getTable($("#workspace .content > .table table").data("table"), undefined, $(this).data("sort"), order);
            });
            $("#workspace .content > .table .status .next, #workspace .content > .table .status .previous").on("click", function() {
                var table = $("#workspace .content > .table");
                getTable(table.data("table"), $(this).data("page"), table.data("sort"), table.data("order"));
            });
        });
    });
};

$(document).on("dblclick", ".top", function(e) {
    window.maximize();
});

$(document).on('click',  '#menu .databases li', function(e) {
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").hide();
    $("#workspace .top .buttons.database").show();
    runQuery('USE `' + $(this).text() + '`');
    runQuery('SHOW TABLES;' , function (err, results, fields) {
        if (err) {
            return parseError(err);
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
            lineNumbers: true,
            matchBrackets : true,
            autofocus: true,
        });
        var sizes = notulous.storage.get("terminal");
        if (sizes) {
            $("#workspace .content .terminal .editor-container").height(sizes.editor),
            $("#workspace .content .terminal .results").height($("#workspace .content .terminal").height() - sizes.editor - 1);
        };
    }
});

$(document).on('click',  '#workspace .top .database .table', function(e) {
    $("#workspace .content > div").hide();
    $("#workspace .content > .table").show();
});

$(document).on('click',  '#workspace .top .database .archive', function(e) {
    $("#workspace .content > div").hide();
    var history = notulous.storage.get("history");
    var html = notulous.util.renderTpl("archive", {archive: history});
    if ($("#workspace .content > .archive").length > 0) {
        $("#workspace .content > .archive").replaceWith(html);
        $("#workspace .content > .archive").show();
    } else {
        $("#workspace .content").append(html);
        $("#workspace .content .archive .action-copy").on('click', function() {
            copyToClipboard($(this).parent().parent().find(".query"));
        });
    }

});

$(document).on('click',  '#workspace .top .buttons.terminal .run', function(e) {
    getAndRunCustomQuery();
});

function getAndRunCustomQuery() {
    var queries = getEditorQueries();
    var hasSelection = false;
    if (window.editor.getSelection().trim().length > 4) {
        hasSelection = true;
    } else {
        if (!queries) {
            return;
        } else if (queries.length == 1) {
            return runCustomQuery(queries[0]);
        }
    }
    $("body").append(
        notulous.util.renderTpl("queries-terminal", {queries: queries, hasSelection: hasSelection})
    );
    $("#modal ul li").on("click", function() {
        switch ($(this).data("key")) {
            case "selection":
                runCustomQuery(window.editor.getSelection().trim());
                break;
            case "all":
                for (var key in queries) {
                    runCustomQuery(queries[key]);
                }
                break;
            default:
                runCustomQuery(queries[$(this).data("key")]);
        }
        $("#overlay .overlay-bg").trigger("click");
    });
    $("#overlay .overlay-bg").on("click", function() {
        $("#overlay").remove();
    });
};

var __lastCustomQuery;
function runCustomQuery(query, sort, order) {
    if (sort && order) {
        // var originalQuery = query;
        var lcQuery = query.toLowerCase();
        var baseQuery, postQueryString;
        if (lcQuery.indexOf('order') !== -1) {
            baseQuery = query.substring(0, lcQuery.indexOf('order'));
        }
        // determine if there is anything to put behind the sort
        if (lcQuery.indexOf('limit') !== -1) {
            postQueryString = query.substr(lcQuery.indexOf('limit'));
            if (!baseQuery) {
                baseQuery = query.substring(0, lcQuery.indexOf('limit'));
            }
        } else if (lcQuery.indexOf('having') !== -1) {
            postQueryString = query.substr(lcQuery.indexOf('having'));
            if (!baseQuery) {
                baseQuery = query.substring(0, lcQuery.indexOf('having'));
            }
        }
        if (baseQuery) {
            query = baseQuery;
        }
        query += " ORDER BY " + sort + " " + order;
        if (postQueryString) {
            query += " " + postQueryString;
        }
    }
    __lastCustomQuery = query;
    runQuery({sql:query, typeCast:false} , function (err, records, fields) {
        if (err) {
            return parseError(err);
        }
        $("#workspace .content .results").html(
            notulous.util.renderTpl("table", {
                fields: fields,
                records: records,
                sort: sort,
                order: order
            }
        ));
        $("#workspace .content .results table th").on("click", function() {
            var order = $(this).data("order");
            if (notulous.util.empty(order)) {
                order = 'desc';
            }
            runCustomQuery(__lastCustomQuery, $(this).data("sort"), order);
        });
    });
}

var customQueries;
function getEditorQueries() {
    var query = window.editor.getValue() + ";";
    var re = /[\S\s]*?;/g;
    var found = query.match(re);
    var queries = [];
    var q;
    if (found.length == 0) {
        return undefined;
    }
    for (var key in found) {
        q = found[key].trim();
        if (q.length <= 1 || q == ";") {
            continue;
        }
        queries.push(q);
    }
    customQueries = (queries.length == 0) ? undefined : queries;
    return customQueries;
};

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

$(document).on('mousedown',  '#workspace .terminal .resize', function(e) {
    var container = $(this).parent();
    $("#workspace .container").hide();
    $(document).on("mouseup", function(e) {
        $(document).off("mousemove");
        $(document).off("mousup");
        var sizes = {
            editor: $("#workspace .terminal .editor-container").height(),
            results: $("#workspace .terminal .results").height()
        };
        notulous.storage.set("terminal", sizes);
        $("#workspace .container").show();
    });
    $(document).on("mousemove", function(e) {
        var height = e.pageY - container.offset().top;
        if (height < 200) {
            height = 200;
        }
        container.height(height);
        $("#workspace .terminal .results").height(container.parent().height() - container.height() - 1);
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

function copyToClipboard(el) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(el.text()).select();
    document.execCommand("copy");
    $temp.remove();
};
