var app = app || {};

app.instance = {
    __selected: undefined,
    __selected_data: undefined,
    __instances: undefined,
    __lastCustomQuery: undefined
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
        app.instance.databases(data.database);
    }, true);
};

app.instance.databases = function(database) {
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

app.instance.query = function(query, callback) {
    if (app.__mysql == undefined) {

    } else {
        app.history.add(query);
        app.__mysql.query(query, callback)
    }
};

app.instance.customQuery = function(query, sort, order) {
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
            order: order
        };
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