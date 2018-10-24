var app = app || {};

app.search = {
    __allHandled: false
};
app.search.all = function()
{
    if ($("#search-all").length > 0) {
        return $("#search-all").remove();
    }
    $("body").append(notulous.util.renderTpl("search-all"));

    $("#search-all input").focus();

    $("#search-all input").on('blur', function() {
        $("#search-all").remove();
    });

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
                // src.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
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
                        // src.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
                        break;
                    }
                }
                list.find("li:not(.title)").first().addClass('focussed');
                // src.view.elementVisible(list, list.find("li.focussed"), list.find(".search").outerHeight());
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
            var instances = app.config()['instances'];
            for (var key in instances) {
                if (notulous.util.fuzzyCompare(query, instances[key].name, true)) {
                    hasResult = true;
                    data.instances.push(instances[key]);
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
                app.instance.customQuery(query);
                break;
            case "command":
                console.log("run command", $(this).data("value"));
                break;
            case "instance":
                app.instance.set($(this).data("key"));
                break;
            case "database":
                app.database.set($(this).data("key"));
                break;
            case "table":
                app.database.table.get($(this).data("key"));
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