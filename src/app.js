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
    __records: {},
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
    if ($("#workspace .content .table." + table).length > 0 && $("#workspace .content .table." + table).data("sort") == sort && $("#workspace .content .table." + table).data("order") == order && $("#workspace .content .table." + table).data("page") == page && app.database.__records[table] != undefined) {
        $("#workspace .content > div").hide();
        $("#workspace .content .table." + table).show();
        app.database.__tableData = $("#workspace .content .table." + table + " table").data();
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
            app.database.__records[data.table] = records;
            var length = data.records.length;
            data.end = data.start + length;
            if (data.page > 1) {
                data.previous = data.page - 1;
            }
            if (length == data.limit) {
                data.next = data.page + 1;
            }
            data.start += 1;
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
            data.records = undefined;
            app.database.__tableData = data;
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
                    record: app.database.__records[table][index]
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
