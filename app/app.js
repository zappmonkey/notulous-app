var crypt = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

var app = {
    name: "Notulous",
    __con: undefined,
    __mysql: undefined,
    __editor: undefined,
    __config: undefined
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

app.config = function() {
    if (!app.__config) {
        app.__config = notulous.config.load();
    }
    return app.__config;
};

app.instance = {
    __selected: undefined,
    __selected_data: undefined,
    __instances: undefined
};

app.instance.getSelected = function() {
    return app.instance.__selected;
};
app.instance.getSelectedData = function() {
    return app.instance.__selected_data;
};

app.instance.remove = function(instance) {
    var config = app.config();
    if (config.instances[instance]) {
        config.instances[instance] = undefined;
    }
    try {
        app.__config = config;
        notulous.config.save(app.__config);
        $("#menu .top .instances").trigger("click");
        app.instance.get();
    } catch(e) {
        return app.error(err);
    }
};

app.instance.edit = function(instance) {
    app.instance.add(notulous.config.instance(instance));
};

app.instance.duplicate = function(instance) {
    var instance = JSON.parse(JSON.stringify(notulous.config.instance(instance)));
    instance.name += " (duplicate)";
    if (instance.hash) {
        instance.password = app.decrypt(instance.password, instance.hash+instance.key);
        if (instance.type == "ssh+sql" && instance.ssh_password) {
            instance.ssh_password = app.decrypt(instance.ssh_password, instance.hash+instance.key);
        }
    }
    instance.key = undefined;
    instance.hash = undefined;
    app.instance.add(instance);
};

app.instance.add = function(instanceData) {
    $("body").append(
        notulous.util.renderTpl("instance-add", {instance: instanceData})
    );
    $("#overlay .overlay-bg, #modal .close").on("click", function() {
        $("#overlay").remove();
    });
    $("#modal input[name='type']").on("change", function() {
        if ($(this).val() == "sql") {
            $("#modal .content .ssh").hide();
        } else {
            $("#modal .content .ssh").show();
        }
    });

    if (!instanceData || instanceData.type == "sql") {
        $("#modal .content .ssh").hide();
    } else {
        $("#modal .content .ssh").show();
    }

    $("#modal .save").on("click", function() {
        var data = {};
        var save = true;
        $("#modal input[type=hidden], #modal input[type=radio]:checked, #modal input[type=text]:visible, #modal input[type=password]:visible").each(function() {
            data[$(this).attr('name')] = $(this).val();
            if (data[$(this).attr('name')] == "") {
                data[$(this).attr('name')] = $(this).data("default");
                if ($(this).attr('required')) {
                    $(this).addClass('invalid');
                    $(this).on("change", function() {
                        $(this).removeClass('invalid');
                        $(this).off();
                    });
                    save = false;
                }
            }
        });
        if (save) {
            var config = app.config();
            if (notulous.util.empty(data.name)) {
                data.name = data.host;
            }
            if (notulous.util.empty(data.key)) {
                data.key = app.hash();
                if (config.instances[data.key]) {
                    data.key = app.hash();
                }
            }
            if (notulous.util.empty(data.hash)) {
                data.hash = app.hash();
            }
            if (data.hasOwnProperty("password") && !notulous.util.empty(data.password)) {
                data.password = app.encrypt(data.password, data.hash+data.key);
            }
            if (data.type == "ssh+sql" && data.hasOwnProperty("ssh_password") && !notulous.util.empty(data.ssh_password)) {
                data.ssh_password = app.encrypt(data.ssh_password, data.hash+data.key);
            }
            if (config.instances[data.key]) {
                if (data.hasOwnProperty("password") && notulous.util.empty(data.password)) {
                    data.password = config.instances[data.key].password;
                }
                if (data.hasOwnProperty("ssh_password") && notulous.util.empty(data.ssh_password)) {
                    data.ssh_password = config.instances[data.key].ssh_password;
                }
            }
            config.instances[data.key] = data;
            try {
                app.__config = config;
                notulous.config.save(app.__config);
                $("#menu .top .instances").trigger("click");
                $("#overlay .actions .close").trigger("click");
                app.instance.get();
            } catch(e) {
                return app.error(err);
            }
        }
    });
};

app.instance.get = function() {
    $("#menu .content").html(
        notulous.util.renderTpl("instances", app.config())
    );
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.instances-but').addClass('active').show();
    $("#workspace .content").html("");
    $("#list .top label").html("");
    $("#list .content").html("");
    $("#workspace .top .buttons").hide();
    $("#menu .content .search input").focus();
    app.actions.instances();
};

app.instance.set = function(instance) {
    var data = notulous.config.instance(instance);
    if (data.hash && data.password) {
        data.password = app.decrypt(data.password, data.hash+data.key);
        if (data.type == "ssh+sql" && data.ssh_password) {
            data.ssh_password = app.decrypt(data.ssh_password, data.hash+data.key);
        }
    }
    // clear all
    app.database.__selected = undefined;
    $('#menu .databases li.active').removeClass('active');
    $("#list .content").html("");
    $("#list .top label").html("");
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").hide();
    $("#workspace .top .buttons.table").hide();
    $("#workspace .top .buttons.database").hide();

    database.load(data, function(client) {
        app.__mysql = client;
        app.instance.__selected = instance;
        app.instance.__selected_data = {
            name: data.name,
            host: data.host,
            key: data.key,
            color: data.color
        };
        app.database.databases(data.database);
    }, true);
};

app.database = {
    __selected: undefined,
    __lastCustomQuery: undefined,
    __tableData: undefined,
    __data: undefined,
    __columns: []
};

app.database.set = function(database) {
    app.database.tables(database);
    $("#list .top label").html("<i class='fas fa-database'></i>" + database);
    $("#workspace .content .table").remove();
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").hide();
    $("#workspace .top .buttons.table").hide();
    $("#workspace .top .buttons.database").show();
    $('#menu .databases li.active').removeClass('active');
    $('#menu .databases li[data-database="' + database + '"').addClass('active');

};

app.database.query = function(query, callback) {
    if (app.__mysql == undefined) {

    } else {
        app.history.add(query);
        app.__mysql.query(query, callback)
    }
};

app.database.databases = function(database) {
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.databases-but').addClass('active').show();

    app.database.query('SHOW DATABASES;', function (err, results, fields) {
        if (err) {
            return app.error(err);
        }
        var databases = {instance: app.instance.getSelectedData(), system: [], user: []};
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
        if (database) {
            $("#db-" + database).trigger("click");
        }
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

    $('#list .tables li.active').removeClass('active');
    $("#workspace .top .buttons").not(".database").hide();
    $("#workspace .top .buttons.table label").html("<i class='fas fa-table'></i>" + table);
    $("#workspace .top .buttons.table").show();
    $('#list .tables li[data-table="' + table + '"]').addClass('active');
    if ($("#workspace .content .table." + table).length > 0 && $("#workspace .content .table." + table).data("sort") == sort && $("#workspace .content .table." + table).data("order") == order && $("#workspace .content .table." + table).data("page") == page) {
        $("#workspace .content > div").hide();
        $("#workspace .content .table." +table).show();
        return;
    }

    app.database.tableColumns(table);

    var data = {
        table: table,
        filter: filter,
        sort: sort,
        order: order,
        limit: 1000,
        query: "SELECT * FROM" + " `" + table + "`"
    };
    if (data.filter) {
        data.query += " WHERE " + data.filter;
    }
    data.page = page ? page : 1;
    data.start = data.page - 1;
    data.start = data.start * data.limit;
    data.hash = crypt.createHash('md5').update(JSON.stringify(data)).digest('hex');
    if (sort && order) {
        data.query += " ORDER BY `" + sort + "` " + order;
    }
    data.query += " LIMIT " + data.start + ", " + data.limit + ";";
    app.database.__getTable(data);
};

app.database.showTableInfo = function() {
    app.database.__tableinfo = {
        create: undefined,
        encoding: undefined,
        status: undefined
    };
    app.database.query("SHOW CREATE TABLE `" + app.database.__tableData.table + "`;", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__tableinfo.create = results[0][fields[1].name];
        app.database.__showTableInfo(app.database.__tableinfo);
    });
    app.database.query("SHOW TABLE STATUS LIKE '" + app.database.__tableData.table + "';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__tableinfo.status = results[0];
        app.database.__showTableInfo(app.database.__tableinfo);
    });
    app.database.query("SELECT CCSA.character_set_name FROM information_schema.`TABLES` T, information_schema.`COLLATION_CHARACTER_SET_APPLICABILITY` CCSA \
        WHERE CCSA.collation_name = T.table_collation \
        AND T.table_schema = '" + app.database.__selected + "' \
        AND T.table_name = '" + app.database.__tableData.table + "';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        if (results.length == 1) {
            app.database.__tableinfo.encoding = results[0][fields[0].name];
        } else {
            app.database.__tableinfo.encoding = "Default";
        }
        app.database.__showTableInfo(app.database.__tableinfo);
    });
};

app.database.__showTableInfo = function(data) {
    if (!data.create || !data.status || !data.encoding) {
        return;
    }
    html = notulous.util.renderTpl("table-info", data);
    $("#workspace .content > div").hide();
    if ($("#workspace .content .table-info").length > 0) {
        $("#workspace .content .table-info").replaceWith(html);
        $("#workspace .content .table-info").show();
    } else {
        $("#workspace .content").append(html);
    }

    CodeMirror($("#workspace .content .table-info pre")[0], {
        value: data.create,
        mode: "text/x-mysql",
        keyMap: "sublime",
        theme: "base16-light",
        readOnly: true,
    });
};

app.database.getTableStructure = function() {
    app.database.__tablestructure = {
        fields: undefined,
        indexes: undefined,
        relations: undefined
    };
    app.database.query("SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + app.database.__selected + "' AND TABLE_NAME = '" + app.database.__tableData.table + "';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        var fields = [];
        var field;
        var type;
        for (var key in results) {
            type = results[key].COLUMN_TYPE;
            field = {};
            field.column = results[key].COLUMN_NAME;
            field.type = results[key].DATA_TYPE.toUpperCase();
            field.unsigned = (type.indexOf("unsigned") > 0);
            field.length = type.substring(type.indexOf('(')+1, type.indexOf(')'));
            field.key = results[key].COLUMN_KEY;
            field.nullable = (results[key].IS_NULLABLE == 'YES');
            field.default = (notulous.util.empty(results[key].COLUMN_DEFAULT) && field.nullable) ? 'NULL' : results[key].COLUMN_DEFAULT;
            field.extra = results[key].EXTRA;
            field.encoding = results[key].CHARACTER_SET_NAME;
            field.collation = results[key].COLLATION_NAME;
            fields.push(field);
        }
        app.database.__tablestructure.fields = fields;
        app.database.__showTableStructure(app.database.__tablestructure);
    });
    app.database.query("SHOW INDEX FROM `" + app.database.__tableData.table + "`;", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        var indexes = [];
        var index;
        for (var key in results) {
            index = {};
            index.key = results[key].Key_name;
            index.sequence = results[key].Seq_in_index;
            index.unique = (results[key].Non_unique == 0);
            index.column = results[key].Column_name;
            index.collation = results[key].Collation;
            index.cardinality = results[key].Cardinality;
            index.sub_part = results[key].Sub_part;
            index.packed = results[key].Packed;
            index.comment = results[key].Comment;
            indexes.push(index);
        }
        app.database.__tablestructure.indexes = indexes;
        app.database.__showTableStructure(app.database.__tablestructure);
    });
    app.database.query("SELECT `TABLE_NAME` AS `table`, `COLUMN_NAME` AS `column`, `REFERENCED_TABLE_NAME` AS `reference_table`, `REFERENCED_COLUMN_NAME` AS `reference_column` \
                        FROM `information_schema`.`KEY_COLUMN_USAGE` \
                        WHERE `TABLE_SCHEMA` = '" + app.database.__selected + "' AND `TABLE_NAME` = '" + app.database.__tableData.table + "' AND `REFERENCED_TABLE_NAME` != ' AND `REFERENCED_COLUMN_NAME` != ';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        var relations = {};
        for (var key in results) {
            relations[results[key].column] = {
                table: results[key].reference_table,
                column: results[key].reference_column
            };
        }
        app.database.__tablestructure.relations = relations;
        app.database.__showTableStructure(app.database.__tablestructure);
    });
};

app.database.__showTableStructure = function(data) {
    if (!data.fields || !data.indexes || !data.relations) {
        return;
    }
    console.log(data);
    html = notulous.util.renderTpl("table-structure", data);
    $("#workspace .content > div").hide();
    if ($("#workspace .content .table-structure").length > 0) {
        $("#workspace .content .table-structure").replaceWith(html);
        $("#workspace .content .table-structure").show();
    } else {
        $("#workspace .content").append(html);
    }
};

app.database.refreshTable = function() {
    app.database.__getTable(app.database.__tableData);
};

app.database.tableTransposed = function() {
    return $("#workspace .top .buttons.table .transpose").hasClass("active");
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
            var filters = $("#workspace .content .table:visible .filters").length;
            var html = $("#workspace .content .table:visible .filters").length > 0 ? $("#workspace .content .table:visible .filters").html().trim() : undefined;
            if (data.filter && filters > 0 && html != "") {
                filterHTML = $("#workspace .content .table:visible .filters").clone();
                filterHTML.find("[name=field]").val($("#workspace .content .table:visible .filters [name=field]").val());
                filterHTML.find("[name=filter]").val($("#workspace .content .table:visible .filters [name=filter]").val());
            }
            data.transposed = app.database.tableTransposed();
            html = notulous.util.renderTpl("table", data);
            $("#workspace .content > div").hide();
            if ($("#workspace .content .table." + data.table).length > 0) {
                $("#workspace .content .table." + data.table).replaceWith(html);
                $("#workspace .content .table." + data.table).show();
            } else {
                $("#workspace .content").append(html);
            }
            if (filterHTML) {
                $("#workspace .content .table." + data.hash + " .filters").replaceWith(filterHTML);
                app.actions.tableFilter();
            }
            $("#workspace .content .table." + data.hash + " th").on("click", function() {
                var order = $(this).data("order");
                if (notulous.util.empty(order)) {
                    order = 'desc';
                }
                var data = $(this).closest("table").data();
                app.database.table(
                    data.table,
                    undefined,
                    $(this).data("sort"),
                    order,
                    data.filter
                );
            });
            $("#workspace .content .table." + data.hash + " tbody tr").not(".header").on("click", function() {
                var index = $(this).data('index');
                var el = $(this).closest("table");
                var table = $(this).closest("table").data("table");
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
            $("#workspace .content .table." + data.hash + " .status .next, #workspace .content .table." + data.hash + " .status .previous").on("click", function() {
                var table = $(this).closest(".table").find("table");
                app.database.table(table.data("table"), $(this).data("page"), table.data("sort"), table.data("order"), table.data("filter"));
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
        query += " ORDER BY `" + sort + "` " + order;
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
        app.database.set(
            $(this).data('database')
        );
    });
};

app.actions.tables = function() {
    $("#list .content .search input").focus();
    $('#list .tables li').on('click', function(e) {
        app.database.table(
            $(this).data('table')
        );
    });
};

app.actions.tableFilter = function() {
    $("#workspace .content .table:visible .container").css({top: $("#workspace .content .table:visible .filters").outerHeight()});
    $("#workspace .content .table:visible .filters").show();
    $("#workspace .content .table:visible .filters [name='filter']").on('change', function(e) {
        var selected = $(this).find(":selected");
        if (selected.data('hidevalue')) {
            $("#workspace .content .filters [name='value1']").hide();
            $("#workspace .content .filters [name='value2']").hide();
        } else {
            $("#workspace .content .filters [name='value1']").show();
            $("#workspace .content .filters [name='value2']").hide();
        }
        if (selected.data('showsecond')) {
            $("#workspace .content .filters [name='value2']").show();
        }
    });
    $("#workspace .content .table:visible .filters a.clear").on('click', function(e) {
        var data = $(this).closest(".table").find("table").data();
        app.database.__tableData.filter = undefined;
        app.database.table(
            data.table,
            data.page,
            data.sort,
            data.order
        );
    });
    $("#workspace .content .table:visible .filters").on('submit', function(e) {
        e.stopPropagation();
        e.preventDefault();
        $("#workspace .content .table:visible .filters a.clear").show();
        var filter = app.convertToQuery(
            $("#workspace .content .table:visible .filters [name='field']").val(),
            $("#workspace .content .table:visible .filters [name='filter']").val(),
            $("#workspace .content .table:visible .filters [name='value1']").val(),
            $("#workspace .content .table:visible .filters [name='value2']").val()
        );
        var data = $("#workspace .content .table:visible table").data();
        app.database.table(
            data.table,
            undefined,
            data.sort,
            data.order,
            filter,
        );
    });
};

app.actions.instances = function() {
    $('#menu .instances li').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        app.instance.set($(this).data('key'));
        $("html title").text(app.name + " - " +  $(this).data('name'));
        $(this).addClass('active');
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
        e.preventDefault();
        e.stopPropagation();

        window.maximize();
    });

    $('#menu .top .button.instances-but').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        app.instance.get();
    });

    $('#menu .top .button.databases-but').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        app.database.databases();
    });

    $('#workspace .top .database .terminal').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

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
                theme: "base16-light",
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
        e.preventDefault();
        e.stopPropagation();

        $("#workspace .content > div").hide();
        $("#workspace .content .table." + app.database.__tableData.table).show();
        $("#workspace .top .buttons.table").show();
        $("#workspace .top .buttons.terminal").hide();
    });

    $('#workspace .top .buttons.table .filter').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if ($("#workspace .content .table:visible .filters").html().trim() != "") {
            $("#workspace .content .table:visible .filters").html("");
            $("#workspace .content .table:visible .container").css({top: 0});
            $("#workspace .content .table:visible .filters").hide();
            return;
        }
        $("#workspace .content .table:visible .filters").html(
            notulous.util.renderTpl("filter", {
                columns: app.database.tableColumns($("#workspace .content .table:visible table").data("table"))
            })
        );
        app.actions.tableFilter();
    });

    $('#workspace .top .buttons.table .refresh').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.refreshTable();
    });

    $('#workspace .top .buttons.table .info').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.showTableInfo();
    });

    $('#workspace .top .buttons.table .structure').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.getTableStructure();
    });

    $('#workspace .top .buttons.table .transpose').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if ($("#workspace .content .table:visible").hasClass("transpose")) {
            $("#workspace .content .table:visible").removeClass("transpose");
            $('#workspace .top .buttons.table .transpose').removeClass('active');
        } else {
            $("#workspace .content .table:visible").addClass("transpose");
            $('#workspace .top .buttons.table .transpose').addClass('active');
        }
    });

    $('#workspace .top .buttons.terminal .run').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

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

app.search = {
    __allHandled: false
};
app.search.all = function() {
    if ($("#search-all").length > 0) {
        return $("#search-all").remove();
    }
    $("body").append(notulous.util.renderTpl("search-all"));

    $("#search-all input").focus();
    // $("#search-all input").on('blur', function() {
    //     $("#search-all").remove();
    // });

    $("#search-all input").on('keydown', function(e) {
        app.search.__allHandled = false;
        var list = $(this).parent().find("ul");
        switch (e.keyCode) {
            // enter
            case 13:
                app.search.__allHandled = true;
                var focussed = list.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    focussed.removeClass("focussed");
                    focussed.trigger('mousedown');
                }
                break;
            // esc
            case 27:
                $("#search-all").remove();
                break;
            // up
            case 38:
                app.search.__allHandled = true;
                var focussed = list.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    var previous = focussed.prevAll("li:not(.title)").first();
                    focussed.removeClass('focussed');
                    if (previous.length == 1) {
                        previous.addClass('focussed');
                        app.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
                        break;
                    }
                }
                list.find("li:not(.title)").last().addClass('focussed');
                // app.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
                break;
            // down
            case 40:
                app.search.__allHandled = true;
                var focussed = list.find("li.focussed");
                if (focussed && focussed.length == 1) {
                    var next = focussed.nextAll("li:not(.title)").first();
                    focussed.removeClass('focussed');
                    if (next.length == 1) {
                        next.addClass('focussed');
                        // app.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
                        break;
                    }
                }
                list.find("li:not(.title)").first().addClass('focussed');
                // app.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
                break;
        }
        if (app.search.__allHandled) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
        return true;
    });

    $("#search-all input").on('keyup', function(e) {
        if (app.search.__allHandled) {
            return;
        }
        var query = $(this).val();
        if (query.length < 1) {
            $("#search-all .results").hide();
            return;
        }
        var data = {
            commands: [],
            instances: [],
            databases: [],
            tables: [],
        };
        var hasResult = false;
        if (query.substr(0,3) == "q: " && app.database.getSelected()) {
            data.commands.push({
                type: 'query',
                data: query.substr(3)
            });
            hasResult = true;
        }
        if (!hasResult) {
            for (var key in app.config()['instances']) {
                if (notulous.util.fuzzyCompare(query, key, true)) {
                    hasResult = true;
                    data.instances.push(key);
                }
            }
            $("#menu .content ul.databases li").each(function() {
                if (notulous.util.fuzzyCompare(query, $(this).text(), true)) {
                    hasResult = true;
                    data.databases.push($(this).text());
                }
            });
            $("#list .content ul li").each(function() {
                if (notulous.util.fuzzyCompare(query, $(this).text(), true)) {
                    hasResult = true;
                    data.tables.push($(this).text());
                }
            });
        }
        if (hasResult) {
            $("#search-all .results").html(
                notulous.util.renderTpl("search-all-results", data)
            );
            return $("#search-all .results").show();
        }
        $("#search-all .results").show();
    });

    $("#search-all").on('mousedown', "li:not(.title)", function(e) {
        switch ($(this).data("type")) {
            case "query":
                var query = $(this).data("value");
                $('#workspace .top .database .terminal').trigger('click');
                var editorQuery = app.__editor.getValue();
                if (editorQuery != "") {
                    editorQuery += '\n';
                }
                app.__editor.setValue(editorQuery + query);
                app.database.runCustomQuery(query);
                break;
            case "command":
                console.log("run command", $(this).data("value"));
                break;
            case "instance":
                app.instance.set($(this).text());
                break;
            case "database":
                app.database.set($(this).text());
                break;
            case "table":
                app.database.table($(this).text());
                break;
        }
        $("#search-all").remove();
    });
};

app.search.init = function() {
    $('#menu, #list').on('keydown', '.search input', function(e) {
        app.search.__allHandled = false;
        var parent = $(this).closest(".content");
        switch (e.keyCode) {
            // enter
            case 13:
                app.search.__allHandled = true;
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
                app.search.__allHandled = true;
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
                app.search.__allHandled = true;
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
        if (app.search.__allHandled) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    });

    $('#menu, #list').on('keyup',  '.search input', function(e) {
        if (app.search.__allHandled) {
            return;
        }
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

app.hash = function(length) {
    if (!length) {
        length = 12;
    }
    var hash = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
        hash += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return hash;
};

app.urlify = function(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "-").replace(/^-+|-+$/g, '');
};

app.encrypt = function(text, secret) {
    var cipher = crypt.createCipher(algorithm, password+secret);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
};

app.decrypt = function(text, secret) {
    var decipher = crypt.createDecipher(algorithm, password+secret);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
};

app.convertToQuery = function(field, filter, value1, value2) {
    var query = '`' + field + '` ';
    switch (filter.toLowerCase()) {
        case 'not contains':
            query += 'NOT LIKE "%' + value1 + '%"';
            break;
        case 'contains':
            query += 'LIKE "%' + value1 + '%"';
            break;
        case 'is null':
        case 'is not null':
            query += filter;
            break;
        case 'between':
            query += filter + ' "' + value1 + '" AND "' + value2 + '"';
            break;
        case 'in':
            query += 'IN (' + value1 + ')';
            break;
        default:
            query += filter + ' "' + value1 + '"';
    }
    return query;
};
