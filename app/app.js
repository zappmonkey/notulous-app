var app = {
    __con: undefined,
    __mysql: undefined,
    __editor: undefined
};

app.init = function() {
    app.view.restore();
    app.actions.init();
    app.instance.get();
    app.search.init();
};

app.error = function(err) {
    app.notification.add("Error in query", err.message, "error");
    return err.message;
}

app.instance = {
    __selected: undefined
};

app.instance.getSelected = function() {
    return app.instance.__selected;
};

app.instance.get = function() {
    $("#menu .content").html(
        notulous.util.renderTpl("instances", notulous.config.load())
    );
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.instances-but').addClass('active').show();
    $("#workspace .content").html("");
    $("#list .content").html("");
    $("#workspace .top .buttons").hide();
    $("#menu .content .search input").focus();
    app.actions.instances();
};

app.database = {
    __selected: undefined,
    __lastCustomQuery: undefined,
    __tableData: undefined,
    __data: undefined,
    __columns: []
};
app.database.query = function(query, callback) {
    if (app.__mysql == undefined) {

    } else {
        app.history.add(query);
        app.__mysql.query(query, callback)
    }
};

app.database.databases = function() {
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.databases-but').addClass('active').show();

    app.database.query('SHOW DATABASES;', function (err, results, fields) {
        if (err) {
            return app.error(err);
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
        $("#menu .content").html(
            notulous.util.renderTpl("databases", databases)
        );
        app.actions.databases();
    });
};

app.database.getSelected = function () {
    return app.database.__selected;
};

app.database.tables = function(database) {
    app.database.__selected = database;
    app.database.query('USE `' + database + '`;');
    app.database.query('SHOW TABLES;' , function (err, results, fields) {
        if (err) {
            return app.error(err);
        }
        $("#list .content").html(
            notulous.util.renderTpl("tables", {tables: results})
        );
        app.actions.tables();
    });
};

app.database.table = function(table, page, sort, order, filter) {

    app.database.tableColumns(table);

    var data = {
        table: table,
        filter: filter,
        sort: sort,
        order: order,
        limit: 1000,
        query: 'SELECT * FROM ' + table
    };
    if (filter) {
        data.query += " WHERE " + data.filter;
    }
    data.page = page ? page : 1;
    data.start = data.page - 1;
    data.start = data.start * data.limit;
    if (sort && order) {
        data.query += " ORDER BY " + sort + " " + order;
    }
    data.query += " LIMIT " + data.start + ", " + data.limit + ";";
    app.database.__getTable(data);
};

app.database.refreshTable = function() {
    app.database.__getTable(app.database.__tableData);
};

app.database.tableColumns = function(table, force) {
    if (!force && app.database.__columns[table]) {
        return app.database.__columns[table];
    }
    app.database.query('SHOW COLUMNS FROM `' + table + '`;' , function (err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__columns[table] = results;
    });
};

app.database.__getTable = function(data) {
    app.database.query("SHOW TABLE STATUS WHERE `Name` = '" + data.table + "';" , function (err, records, fields) {
        if (err) {
            return app.error(err);
        }
        data.count = records[0].Rows;
        app.database.query({sql:data.query, typeCast:false}, function (err, records, fields) {
            if (err) {
                return app.error(err);
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
            app.database.__tableData = data;
            var filterHTML;
            if ($("#workspace .content .filters").length > 0 && $("#workspace .content .filters").html().trim() != "") {
                filterHTML = $("#workspace .content .filters").clone();
                filterHTML.find("[name=field]").val($("#workspace .content .filters [name=field]").val());
                filterHTML.find("[name=filter]").val($("#workspace .content .filters [name=filter]").val());
            }
            var html = notulous.util.renderTpl("table", data);
            $("#workspace .content > div").hide();
            if ($("#workspace .content > .table").length > 0) {
                $("#workspace .content > .table").replaceWith(html);
                $("#workspace .content > .table").show();
            } else {
                $("#workspace .content").append(html);
            }
            if (filterHTML) {
                $("#workspace .content .filters").replaceWith(filterHTML);
                app.actions.tableFilter();
            }
            $("#workspace .content > .table th").on("click", function() {
                var order = $(this).data("order");
                if (notulous.util.empty(order)) {
                    order = 'desc';
                }
                app.database.table(
                    $("#workspace .content > .table table").data("table"),
                    undefined,
                    $(this).data("sort"),
                    order,
                    app.database.__tableData.filter
                );
            });
            $("#workspace .content > .table tbody tr").on("click", function() {
                var index = $(this).data('index');
                var table = $("#workspace .content > .table table").data("table");
                var data = {
                    maxheight: $(window).height()-250,
                    table: table,
                    columns: app.database.tableColumns(table),
                    record: app.database.__tableData.records[index]
                };
                $("body").append(
                    notulous.util.renderTpl("record", data)
                );
                $("#overlay .overlay-bg, #modal .close").on("click", function() {
                    $("#overlay").remove();
                });
                $("#modal .save").on("click", function() {
                    var key;
                    var fields = [];
                    $("#modal .fields input, #modal .fields textarea").each(function() {
                        if ($(this).val() != $(this).data("value")) {
                            fields.push('`' + $(this).data("field") + '` = "' + $(this).val() + '"');
                        }
                        if ($(this).hasClass("primary")) {
                            key ='`' + $(this).data("field") + '` = "' + $(this).data("value") + '"';
                        }
                    });
                    if (fields.length == 0) {
                        return $("#overlay").remove();
                    }
                    var query = 'UPDATE `' + $("#modal .fields").data("table") + '` SET ' + fields.join(", ") + ' WHERE ' + key + ';';
                    app.database.query({sql:query, typeCast:false}, function (err, records, fields) {
                        if (err) {
                            return app.error(err);
                        }
                        app.database.refreshTable();
                        $("#overlay").remove();
                    });
                });
            });
            $("#workspace .content > .table .status .next, #workspace .content > .table .status .previous").on("click", function() {
                var table = $("#workspace .content > .table table");
                app.database.table(table.data("table"), $(this).data("page"), table.data("sort"), table.data("order"));
            });
        });
    });
};

app.database.getAndRunCustomQuery = function() {
    var queries = app.database.terminal.get();
    var hasSelection = false;
    if (app.__editor.getSelection().trim().length > 4) {
        hasSelection = true;
    } else {
        if (!queries) {
            return;
        } else if (queries.length == 1) {
            return app.database.runCustomQuery(queries[0]);
        }
    }
    $("body").append(
        notulous.util.renderTpl("queries-terminal", {queries: queries, hasSelection: hasSelection})
    );
    $("#modal ul li").on("click", function() {
        switch ($(this).data("key")) {
            case "selection":
                app.database.runCustomQuery(app.__editor.getSelection().trim());
                break;
            case "all":
                for (var key in queries) {
                    app.database.runCustomQuery(queries[key]);
                }
                break;
            default:
                app.database.runCustomQuery(queries[$(this).data("key")]);
        }
        $("#overlay .overlay-bg").trigger("click");
    });
    $("#overlay .overlay-bg").on("click", function() {
        $("#overlay").remove();
    });
};

app.database.runCustomQuery = function(query, sort, order) {
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
    app.database.__lastCustomQuery = query;
    app.database.query({sql:query, typeCast:false} , function (err, records, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__data = {
            fields: fields,
            records: records,
            sort: sort,
            order: order
        };
        $("#workspace .content .results").html(
            notulous.util.renderTpl("table", app.database.__data)
        );
        $("#workspace .content .results table th").on("click", function() {
            var order = $(this).data("order");
            if (notulous.util.empty(order)) {
                order = 'desc';
            }
            app.database.runCustomQuery(app.database.__lastCustomQuery, $(this).data("sort"), order);
        });
    });
};

app.database.terminal = {
    __customQueries: undefined
};
app.database.terminal.get = function() {
    var query = app.__editor.getValue() + ";";
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
    app.database.terminal.__customQueries = (queries.length == 0) ? undefined : queries;
    return app.database.terminal.__customQueries;
};

app.history = {
    maxLength: 1000,
};
app.history.add = function(query) {
    var history = notulous.storage.get('history');
    if (!history) {
        history = [];
    }
    if (query instanceof Object) {
        query = query.sql;
    }
    history.unshift({
        date: Date(),
        instance: app.instance.getSelected(),
        database: app.database.getSelected(),
        query: query
    });
    if (history.length > app.history.maxLength) {
        history.pop();
    }
    notulous.storage.set("history", history);
};

app.notification = {};
app.notification.add = function(title, content, type) {
    $("#notifications").prepend(
        notulous.util.renderTpl("notification", {
            title: title,
            content: content,
            type: type
        })
    );
    $('#notifications .notification:first').on('click', function(e) {
        $(this).remove();
    });
};

app.view = {};
app.view.restore = function() {
    var windowSizes = notulous.storage.get("window");
    if (windowSizes) {
        $("#menu").width(windowSizes.menu);
        $("#list").width(windowSizes.list);
        app.view.resize();
    }
};

app.view.resize = function() {
    $("#list").css({
        left: $("#menu").width()
    });
    $("#workspace").css({
        left: $("#menu").width() + $("#list").width()
    });
};

app.view.elementVisible = function(container, element, offset) {
    if (!container || !element || element == undefined || container == undefined || element.offset() == undefined) {
        return;
    }
    //Determine container top and bottom
    let cTop = container.scrollTop();

    //Determine element top and bottom
    let eTop = element.offset().top - offset;
    let eBottom = eTop + element.outerHeight() + 10;

    //Check if out of view
    if (eTop < 0) {
        container.scrollTop(cTop + eTop);
    } else if (eBottom > container.outerHeight()) {
        container.scrollTop(cTop + (eBottom - container.outerHeight()));
    }
};

app.actions = {
    __timer: undefined
};
app.actions.init = function() {
    app.actions.workspace();
    app.actions.topMenus();
    $(window).resize(function(){
        $("#workspace .container").hide();
        app.actions.__timer && clearTimeout(app.actions.__timer);
        app.actions.__timer = setTimeout(function() {
            $("#workspace .container").show();
        }, 100);
    });
};

app.actions.databases = function() {
    $("#menu .content .search input").focus();
    $('#menu .databases li').on('click', function(e) {
        app.database.tables($(this).text());
        $("#workspace .content > div").hide();
        $("#workspace .top .buttons.terminal").hide();
        $("#workspace .top .buttons.table").hide();
        $("#workspace .top .buttons.database").show();
        $('#menu .databases li.active').removeClass('active');
        $(this).addClass('active');
    });
};

app.actions.tables = function() {
    $("#list .content .search input").focus();
    $('#list .tables li').on('click', function(e) {
        app.database.table($(this).text());
        $('#list .tables li.active').removeClass('active');
        $("#workspace .top .buttons").not(".database").hide();
        $("#workspace .top .buttons.table").show();
        $(this).addClass('active');
    });
};

app.actions.tableFilter = function() {
    $("#workspace .content .container").css({top: $("#workspace .content .filters").outerHeight()});
    $("#workspace .content .filters").show();
    $("#workspace .content .filters").on('submit', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var query = app.convertToQuery(
            $("#workspace .content .filters [name='field']").val(),
            $("#workspace .content .filters [name='filter']").val(),
            $("#workspace .content .filters [name='value']").val()
        );
        app.database.table(
            $("#workspace .content table").data("table"),
            undefined,
            app.database.__tableData.sort,
            app.database.__tableData.order,
            query
        );
    });
};

app.actions.instances = function() {
    $('#menu .instances li').on('click', function(e) {
        var instance = $(this).data('key');
        database.load(notulous.config.instance(instance), function(client) {
            app.__mysql = client;
            app.instance.__selected = instance;
            app.database.databases();
        });
    });
};

app.actions.workspace = function() {
    $('#workspace .top .database .archive').on('click', function(e) {
        $("#workspace .content > div").hide();
        $("#workspace .top .buttons.terminal").hide();
        $("#workspace .top .buttons.table").hide();

        var history = notulous.storage.get("history");
        var html    = notulous.util.renderTpl("archive", {archive: history});

        if ($("#workspace .content > .archive").length > 0) {
            $("#workspace .content > .archive").replaceWith(html);
            $("#workspace .content > .archive").show();
        } else {
            $("#workspace .content").append(html);
        }

        $("#workspace .content .archive .action-copy").on('click', function() {
            app.actions.copyToClipboard($(this).parent().parent().find(".query"));
        });

        $("#workspace .content .archive .action-terminal").on('click', function() {
            var query = $(this).parent().parent().find(".query").text();
            query = query.trim();
            if (query.substr(-1) != ';') {
                query += ';';
            }
            $('#workspace .top .database .terminal').trigger('click');
            var editorQuery = app.__editor.getValue();
            if (editorQuery != "") {
                editorQuery += '\n';
            }
            app.__editor.setValue(editorQuery + query);
            app.database.runCustomQuery(query);
        });
    });
};

app.actions.topMenus = function() {
    $(".top").on("dblclick", function(e) {
        window.maximize();
    });

    $('#menu .top .button.instances-but').on('click', function(e) {
        app.instance.get();
    });

    $('#menu .top .button.databases-but').on('click', function(e) {
        app.database.databases();
    });

    $('#workspace .top .database .terminal').on('click', function(e) {
        $("#workspace .content > div").hide();
        $("#workspace .top .buttons.terminal").show();
        $("#workspace .top .buttons.table").hide();
        if ($("#workspace .content .terminal").length > 0) {
            $("#workspace .content .terminal").show();
        } else {
            $("#workspace .content").append(
                notulous.util.renderTpl("database-terminal")
            );
            app.__editor = CodeMirror.fromTextArea($("#workspace #editor")[0], {
                mode: "text/x-mysql",
                // mode: "sql",
                keyMap: "sublime",
                theme: "monokai",
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
            app.actions.terminal();
        }
    });

    $('#workspace .top .database .table').on('click', function(e) {
        $("#workspace .content > div").hide();
        $("#workspace .content > .table").show();
        $("#workspace .top .buttons.table").show();
        $("#workspace .top .buttons.terminal").hide();
    });

    $('#workspace .top .buttons.table .filter').on('click', function(e) {
        if ($("#workspace .content .filters").html().trim() != "") {
            $("#workspace .content .filters").html("");
            $("#workspace .content .container").css({top: 0});
            $("#workspace .content .filters").hide();
            return;
        }
        $("#workspace .content .filters").html(
            notulous.util.renderTpl("filter", {
                columns: app.database.tableColumns($("#workspace .content table").data("table"))
            })
        );
        app.actions.tableFilter();
    });

    $('#workspace .top .buttons.terminal .run').on('click', function(e) {
        app.database.getAndRunCustomQuery();
    });

    $('#menu .resize, #list .resize').on('mousedown', function(e) {
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
            app.view.resize();
        });
    });
};

app.actions.terminal = function() {
    $('#workspace .terminal .resize').on('mousedown', function(e) {
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
};

app.search = {};
app.search.init = function() {
    $('#menu, #list').on('keydown', '.search input', function(e) {
        var handled = false;
        var parent = $(this).closest(".content");
        switch (e.keyCode) {
            // enter
            case 13:
                handled = true;
                var focussed = parent.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    focussed.removeClass("focussed");
                    focussed.trigger('click');
                }
                break;
            // esc
            case 27:
                $(this).val("");
                break;
            // up
            case 38:
                handled = true;
                var focussed = parent.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    var previous = focussed.prevAll('li:visible').not('.seperator').first();
                    focussed.removeClass('focussed');
                    if (previous.length == 1) {
                        previous.addClass('focussed');
                        app.view.elementVisible(parent, parent.find("li.focussed"), parent.find(".search").outerHeight());
                        break;
                    }
                }
                parent.find("li:visible").last().addClass('focussed');
                app.view.elementVisible(parent, parent.find("li.focussed"), parent.find(".search").outerHeight());
                break;
            // down
            case 40:
                handled = true;
                var focussed = parent.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    var next = focussed.nextAll('li:visible').not('.seperator').first();
                    focussed.removeClass('focussed');
                    if (next.length == 1) {
                        next.addClass('focussed');
                        app.view.elementVisible(parent, parent.find("li.focussed"), parent.find(".search").outerHeight());
                        break;
                    }
                }
                parent.find("li:visible").first().addClass('focussed');
                app.view.elementVisible(parent, parent.find("li.focussed"), parent.find(".search").outerHeight());
                break;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    $('#menu, #list').on('keyup',  '.search input', function(e) {
        var query = $(this).val();
        var parent = $(this).closest(".content");
        parent.find("ul li").each(function() {
            if (notulous.util.fuzzyCompare(query, $(this).text(), true)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
        var focussed = parent.find("li.focussed");
        if (focussed.length == 1) {
            if (focussed.is(":visible")) {
                app.view.elementVisible(parent, parent.find("li.focussed"), parent.find(".search").outerHeight());
            } else {
                focussed.removeClass("focussed");
            }
        }
    });
};

app.actions.copyToClipboard = function(el) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(el.text()).select();
    document.execCommand("copy");
    $temp.remove();
};

app.convertToQuery = function(field, filter, value) {
    var query = '`' + field + '` ';
    switch (filter.toLowerCase()) {
        case 'not contains':
            query += 'NOT LIKE "%' + value + '%"';
            break;
        case 'contains':
            query += 'LIKE "%' + value + '%"';
            break;
        case 'is null':
        case 'is not null':
            query += filter;
            break;
        default:
            query += filter + ' "' + value + '"';
    }
    return query;
};
