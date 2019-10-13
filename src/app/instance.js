var app = app || {};

app.instance = {
    __selected: undefined,
    __selected_data: undefined,
    __instances: undefined,
    __lastCustomQuery: undefined
};

app.instance.reset = function()
{
    app.instance.__selected = undefined;
    app.instance.__selected_data = undefined;
    app.instance.__instances = undefined;
    app.instance.__lastCustomQuery = undefined;
};

app.instance.getSelected = function()
{
    return app.instance.__selected;
};

app.instance.getSelectedData = function()
{
    return app.instance.__selected_data;
};

app.instance.getConfig = function(instance)
{
    var config = notulous.config.instance(instance);
    if (config.hash && config.password) {
        config.password = app.decrypt(config.password, config.hash+config.key);
        if (config.type == "ssh+sql" && config.ssh_password) {
            config.ssh_password = app.decrypt(config.ssh_password, config.hash+config.key);
        }
    }
    return config;
};

app.instance.remove = function(instance)
{
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

app.instance.edit = function(instance)
{
    app.instance.add(notulous.config.instance(instance));
};

app.instance.duplicate = function(instance)
{
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

app.instance.add = function(instanceData)
{
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
        $("#modal input[type=hidden], #modal input[type=radio]:checked, #modal input[type=text]:visible, #modal input[type=password]:visible, #modal select").each(function() {
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

app.instance.get = function()
{
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

app.instance.set = function(instance)
{
    var config = app.instance.getConfig(instance);
    // clear all
    app.database.__selected = undefined;
    $("body").attr("environment", "");
    $("body").attr("environment", config.environment);
    $("#menu .databases-but").css("display", "inline-block");
    $('#menu .databases li.active').removeClass('active');
    $("#list .content").html("");
    $("#list .top label").html("");
    $("#workspace .content > div").hide();
    $("#workspace .top .buttons.terminal").hide();
    $("#workspace .top .buttons.table").hide();
    $("#workspace .top .buttons.database").hide();

    database.load(config, function(client) {
        app.__mysql = client;
        app.instance.__selected = instance;
        app.instance.__selected_data = {
            name: config.name,
            host: config.host,
            key: config.key,
            color: config.color
        };
        app.instance.databases(config.database);
    }, true);
};

app.instance.close = function() {
    database.closeAll();
    app.instance.reset();
    $("#menu .databases-but").hide();
    $('#menu .top .button.instances-but').trigger('click');
    $("body").attr("environment", "");
};

app.instance.databases = function(database)
{
    $('#menu .top .button.active').removeClass('active');
    $('#menu .top .button.databases-but').addClass('active').show();

    app.instance.query('SHOW DATABASES;', function (err, results, fields) {
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

app.instance.processlist = app.instance.processlist || {
    __timer: undefined,
    __sort: undefined,
    __order: undefined,
    __timeout: 10000
};

app.instance.processlist.__timer = undefined;
app.instance.processlist.start = function()
{
    app.instance.processlist.__show();
};

app.instance.processlist.__show = function(sort, order)
{
    console.log("processlist");
    if (sort != undefined && order != undefined) {
        app.instance.processlist.__sort = sort;
        app.instance.processlist.__order = order;
    }
    var query = "SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST"
    if (app.instance.processlist.__sort != undefined && app.instance.processlist.__order != undefined) {
        query += " ORDER BY " + app.instance.processlist.__sort + " " + app.instance.processlist.__order + ";";
    }
    app.instance.query({sql: query, typeCast: false}, function (err, records, fields) {
        if (err) {
            return app.error(err);
        }
        var length   = records.length;
        var data = {
            sort:    sort,
            order:   order,
            table:   "processlist",
            fields:  fields,
            records: records,
            start:   1,
            end:     length - 1,
            page:    1
        };
        app.view.modal.open(
            notulous.util.renderTpl("table", data),
            function() {
                clearTimeout(app.instance.processlist.__timer);
            },
            function() {
                $("#modal table th").on("click", function() {
                    var order = $(this).data("order");
                    if (notulous.util.empty(order)) {
                        order = 'desc';
                    }
                    app.instance.processlist.__show($(this).data("sort"), order);
                });
            },
            "processlist no-padding"
        );
        app.instance.processlist.__timer = setTimeout(function() {
            app.instance.processlist.__show();
        }, app.instance.processlist.__timeout);
    });
};

app.instance.kill = function(id) {
    app.instance.query("KILL " + id + ";");
};

app.instance.killConnection = function(id) {
    app.instance.query("KILL CONNECTION " + id + ";");
};

app.instance.query = function(query, callback)
{
    if (app.__mysql != undefined) {
        if (!database.hasInstance(app.instance.getSelected())) {
            // Reset the instance and execute query
            database.load(app.instance.getConfig(app.instance.getSelected()), function(client) {
                app.__mysql = client;
                app.history.add(query);
                app.__mysql.query('USE `' + app.database.getSelected() + '`;');
                app.__mysql.query(query, callback);
            }, true);
        } else {
            app.history.add(query);
            app.__mysql.query(query, callback);
        }
    } else {
        app.notification.add("No active connection", "Unable to execute query because there is no active connection.", "error");
    }
};

app.instance.customQuery = function(query, sort, order)
{
    app.session.add('custom', {
        query: query,
        sort: sort,
        order: order
    });

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
    app.instance._lastCustomQuery = query;
    app.instance.query({sql:query, typeCast:false} , function (err, records, fields) {
        if (err) {
            return app.error(err);
        }
        var data = {
            fields: fields,
            records: records,
            sort: sort,
            order: order,
        };
        app.view.checkQueryNavigation();
        $("#workspace .content .results").html(
            notulous.util.renderTpl("table", data)
        );
        $("#workspace .content .results table th").on("click", function() {
            var order = $(this).data("order");
            if (notulous.util.empty(order)) {
                order = 'desc';
            }
            app.instance.customQuery(app.instance._lastCustomQuery, $(this).data("sort"), order);
        });
    });
};