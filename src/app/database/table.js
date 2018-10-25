var app = app || {};

app.database = app.database || {};

app.database.table = {
    __data: undefined,
    __records: {},
    __columns: [],
    __structure: []
};

app.database.table.reset = function()
{
    app.database.table.__data = undefined;
    app.database.table.__records = {};
    app.database.table.__columns = [];
    app.database.table.__structure = [];
};

app.database.table.get = function(table, page, sort, order, filter) {

    $('#list .tables li.active').removeClass('active');
    $("#workspace .top .buttons").not(".database").hide();
    $("#workspace .top .buttons.table label").html("<i class='fas fa-table'></i>" + table);
    $("#workspace .top .buttons.table").show();
    $('#list .tables li[data-table="' + table + '"]').addClass('active');
    if ($("#workspace .content .table." + table).length > 0 && $("#workspace .content .table." + table).data("sort") == sort && $("#workspace .content .table." + table).data("order") == order && $("#workspace .content .table." + table).data("page") == page && app.database.table.__records[table] != undefined) {
        $("#workspace .content > div").hide();
        $("#workspace .content .table." + table).show();
        app.database.table.__data = $("#workspace .content .table." + table + " table").data();
        return;
    }
    app.database.table.structure(table, function(structure) {
        app.database.table.columns(table);
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
        app.database.table.__get(data);
    });
};

app.database.table.info = function() {
    app.database.__tableinfo = {
        create: undefined,
        encoding: undefined,
        status: undefined
    };
    app.instance.query("SHOW CREATE TABLE `" + app.database.table.__data.table + "`;", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__tableinfo.create = results[0][fields[1].name];
        app.view.showTableInfo(app.database.__tableinfo);
    });
    app.instance.query("SHOW TABLE STATUS LIKE '" + app.database.table.__data.table + "';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.__tableinfo.status = results[0];
        app.view.showTableInfo(app.database.__tableinfo);
    });
    app.instance.query("SELECT CCSA.character_set_name FROM information_schema.`TABLES` T, information_schema.`COLLATION_CHARACTER_SET_APPLICABILITY` CCSA \
        WHERE CCSA.collation_name = T.table_collation \
        AND T.table_schema = '" + app.database.__selected + "' \
        AND T.table_name = '" + app.database.table.__data.table + "';", function(err, results, fields) {
        if (err) {
            return app.error(err);
        }
        if (results.length == 1) {
            app.database.__tableinfo.encoding = results[0][fields[0].name];
        } else {
            app.database.__tableinfo.encoding = "Default";
        }
        app.view.showTableInfo(app.database.__tableinfo);
    });
};



app.database.table.structure = function(table, callback)
{
    if (!table) {
        table = app.database.table.__data.table;
    }

    if (!callback || typeof callback  !== "function") {
        callback = app.view.showTableStructure;
    }

    var structure;
    if (!notulous.util.empty(app.database.table.__structure[table])) {
        structure = app.database.table.__structure[table];
        callback(structure);
        return;
    }

    structure = {
        fields: undefined,
        indexes: undefined,
        relations: undefined
    };

    app.instance.query("SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + app.database.__selected + "' AND TABLE_NAME = '" + table + "';", function(err, results, fields) {
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
        structure.fields = fields;
        if (structure.fields && structure.indexes && structure.relations) {
            app.database.table.__structure[table] = structure;
            callback(structure);
        }
    });
    app.instance.query("SHOW INDEX FROM `" + table + "`;", function(err, results, fields) {
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
        structure.indexes = indexes;
        if (structure.fields && structure.indexes && structure.relations) {
            app.database.table.__structure[table] = structure;
            callback(structure);
        }
    });
    app.instance.query("SELECT `TABLE_NAME` AS `table`, `COLUMN_NAME` AS `column`, `REFERENCED_TABLE_NAME` AS `reference_table`, `REFERENCED_COLUMN_NAME` AS `reference_column` \
                        FROM `information_schema`.`KEY_COLUMN_USAGE` \
                        WHERE `TABLE_SCHEMA` = '" + app.database.__selected + "' AND `TABLE_NAME` = '" + table + "' AND `REFERENCED_TABLE_NAME` != ' AND `REFERENCED_COLUMN_NAME` != ';", function(err, results, fields) {
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
        structure.relations = relations;
        if (structure.fields && structure.indexes && structure.relations) {
            app.database.table.__structure[table] = structure;
            callback(structure);
        }
    });
};

app.database.table.refresh = function()
{
    app.database.table.__get(app.database.table.__data);
};

app.database.table.transposed = function() {
    return $("#workspace .top .buttons.table .transpose").hasClass("active");
};

app.database.table.columns = function(table, force)
{
    if (!force && app.database.table.__columns[table]) {
        return app.database.table.__columns[table];
    }
    app.instance.query('SHOW COLUMNS FROM `' + table + '`;' , function (err, results, fields) {
        if (err) {
            return app.error(err);
        }
        app.database.table.__columns[table] = results;
    });
};

app.database.table.__get = function(data)
{
    app.session.add('table', data);
    app.instance.query("SHOW TABLE STATUS WHERE `Name` = '" + data.table + "';" , function (err, records, fields) {
        if (err) {
            return app.error(err);
        }
        data.count = records[0].Rows;
        app.instance.query({sql:data.query, typeCast:false}, function (err, records, fields) {
            if (err) {
                return app.error(err);
            }

            data.fields = fields;
            data.records = records;
            app.database.table.__records[data.table] = records;
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
            data.transposed = app.database.table.transposed();
            data.relations = app.database.table.__structure[data.table].relations;
            app.view.checkQueryNavigation();
            html = notulous.util.renderTpl("table", data);
            data.records = undefined;
            app.database.table.__data = data;
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
                app.database.table.get(
                    data.table,
                    undefined,
                    $(this).data("sort"),
                    order,
                    data.filter
                );
            });

            $("#workspace .content .table." + data.hash + " tbody tr td .has-foreign").on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                app.database.table.get($(this).data('table'), undefined, undefined, undefined, $(this).data('column') + " = '" + $(this).parent().text() + "'");
            });

            $("#workspace .content .table." + data.hash + " tbody tr").not(".header").on("click", function() {
                var index = $(this).data('index');
                var el = $(this).closest("table");
                var table = $(this).closest("table").data("table");
                var data = {
                    maxheight: $(window).height()-250,
                    table: table,
                    columns: app.database.table.columns(table),
                    record: app.database.table.__records[table][index]
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
                    app.instance.query({sql:query, typeCast:false}, function (err, records, fields) {
                        if (err) {
                            return app.error(err);
                        }
                        app.database.table.refresh();
                        $("#overlay").remove();
                    });
                });
            });
            $("#workspace .content .table." + data.hash + " .status .next, #workspace .content .table." + data.hash + " .status .previous").on("click", function() {
                var table = $(this).closest(".table").find("table");
                app.database.table.get(table.data("table"), $(this).data("page"), table.data("sort"), table.data("order"), table.data("filter"));
            });
        });
    });
};
