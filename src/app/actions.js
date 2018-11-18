var app = app || {};

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
        app.session.reset();
    });
};

app.actions.tables = function() {
    $("#list .content .search input").focus();
    $('#list .tables li').on('click', function(e) {
        app.database.table.get(
            $(this).data('table')
        );
    });
};

app.actions.tableFilter = function()
{
    $("#workspace .content .table:visible .container").css({top: $("#workspace .content .table:visible .filters").outerHeight()});
    $("#workspace .content .table:visible .filters").show();
    $("#workspace .content .table:visible .filters .filter").on('change', "[name='filter']", function(e) {
        var selected = $(this).find(":selected");
        if (selected.data('hidevalue')) {
            $(this).parent().parent().find("input[name='value1']").hide();
            $(this).parent().parent().find("input[name='value2']").hide();
        } else {
            $(this).parent().parent().find("input[name='value1']").show();
            $(this).parent().parent().find("input[name='value2']").hide();
        }
        if (selected.data('showsecond')) {
            $(this).parent().parent().find("input[name='value2']").show();
        }
    });

    $("#workspace .content .table:visible .filters .filter").on('click', "a.clear", function(e) {
        var data = $(this).closest(".table").find("table").data();
        app.database.table.__data.filter = undefined;
        app.database.table.get(
            data.table,
            data.page,
            data.sort,
            data.order
        );
    });

    $("#workspace .content .table:visible .filters .filter").on('click', "a.add", function(e) {
        var query = $("#workspace .content .table:visible .filters .query-tpl").clone();
        query.removeClass("query-tpl");
        query.addClass("query");
        query.insertAfter("#workspace .content .table:visible .filters .query:last");
        $("#workspace .content .table:visible .container").css({top: $("#workspace .content .table:visible .filters").outerHeight()});
    });

    $("#workspace .content .table:visible .filters .filter").on('click', ".query .remove", function(e) {
        $(this).parent().remove();
        $("#workspace .content .table:visible .container").css({top: $("#workspace .content .table:visible .filters").outerHeight()});
    });

    $("#workspace .content .table:visible .filters").on('submit', function(e) {
        e.stopPropagation();
        e.preventDefault();
        $("#workspace .content .table:visible .filters a.clear").show();
        var filter = "";
        $("#workspace .content .table:visible .filters .query:visible").each(function() {
            var operator = $(this).find("[name='operator']");
            filter += app.convertToQuery(
                (operator ? operator.val() : undefined),
                $(this).find("[name='field']").val(),
                $(this).find("[name='filter']").val(),
                $(this).find("[name='value1']").val(),
                $(this).find("[name='value2']").val()
            );
            console.log(filter);
        });
        var data = $("#workspace .content .table:visible table").data();
        app.database.table.get(
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
            app.instance.customQuery(query);
        });
    });
};

app.actions.topMenus = function() {
    $(".top").on("dblclick", function(e) {
        e.preventDefault();
        e.stopPropagation();
        remote.getCurrentWindow().maximize();
    });

    $('#menu .top .button.instances-but').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        app.instance.get();
    });

    $('#menu .top .button.databases-but').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        app.instance.databases();
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
        $("#workspace .content .table." + app.database.table.__data.table).show();
        $("#workspace .top .buttons.table").show();
        $("#workspace .top .buttons.terminal").hide();
    });

    $('#workspace .top .buttons.table .filter').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if ($("#workspace .content .table:visible .filters").length <= 0) {
            return;
        }
        if ($("#workspace .content .table:visible .filters").html().trim() != "") {
            $("#workspace .content .table:visible .filters").html("");
            $("#workspace .content .table:visible .container").css({top: 0});
            $("#workspace .content .table:visible .filters").hide();
            return;
        }
        $("#workspace .content .table:visible .filters").html(
            notulous.util.renderTpl("filter", {
                columns: app.database.table.columns($("#workspace .content .table:visible table").data("table"))
            })
        );
        app.actions.tableFilter();
    });

    $('#workspace .top .previous').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var item = app.session.getPrevious();
        switch (item.type) {
            case 'table':
                app.view.setTableName(item.data.table);
                app.database.table.__get(item.data);
                break;
            default:
                app.instance.customQuery(item.data.query, item.data.sort, item.data.order);
                break;
        }
     });

    $('#workspace .top .next').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var item = app.session.getNext();
        switch (item.type) {
            case 'table':
                app.view.setTableName(item.data.table);
                app.database.table.__get(item.data);
                break;
            default:
                app.instance.customQuery(item.data.query, item.data.sort, item.data.order);
                break;
        }
    });

    $('#workspace .top .buttons.table .refresh').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.table.refresh();
    });

    $('#workspace .top .buttons.table .info').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.table.info();
    });

    $('#workspace .top .buttons.table .structure').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        app.database.table.structure();
    });

    $('#workspace .top .buttons.table .transpose').on('click', function(e) {
        if ($("#workspace .content .table:visible").length <= 0) {
            return;
        }
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

        app.view.getAndRunCustomQuery();
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

app.actions.copyToClipboard = function(el) {
    notulous.util.copyToClipboard(el.text());
};