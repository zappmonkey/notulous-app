var app = app || {};

app.view = {};
app.view.restore = function()
{
    var windowSizes = notulous.storage.get("window");
    if (windowSizes) {
        $("#menu").width(windowSizes.menu);
        $("#list").width(windowSizes.list);
        app.view.resize();
    }
};

app.view.resize = function()
{
    $("#list").css({
        left: $("#menu").width()
    });
    $("#workspace").css({
        left: $("#menu").width() + $("#list").width()
    });
};

app.view.elementVisible = function(container, element, offset)
{
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

app.view.showTableInfo = function(data)
{
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

app.view.showTableStructure = function(data)
{
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

app.view.setTableName = function(table)
{
    $('#list .tables li.active').removeClass('active');
    $("#workspace .top .buttons").not(".database").hide();
    $("#workspace .top .buttons.table label").html("<i class='fas fa-table'></i>" + table);
    $("#workspace .top .buttons.table").show();
    $('#list .tables li[data-table="' + table + '"]').addClass('active');
};

app.view.getAndRunCustomQuery = function() {
    var queries = app.database.terminal.get();
    var hasSelection = false;
    if (app.__editor.getSelection().trim().length > 4) {
        hasSelection = true;
    } else {
        if (!queries) {
            return;
        } else if (queries.length == 1) {
            return app.instance.customQuery(queries[0]);
        }
    }
    $("body").append(
        notulous.util.renderTpl("queries-terminal", {queries: queries, hasSelection: hasSelection})
    );
    $("#modal ul li").on("click", function() {
        switch ($(this).data("key")) {
            case "selection":
                app.instance.customQuery(app.__editor.getSelection().trim());
                break;
            case "all":
                for (var key in queries) {
                    app.instance.customQuery(queries[key]);
                }
                break;
            default:
                app.instance.customQuery(queries[$(this).data("key")]);
        }
        $("#overlay .overlay-bg").trigger("click");
    });
    $("#overlay .overlay-bg").on("click", function() {
        $("#overlay").remove();
    });
};

app.view.checkQueryNavigation = function()
{
    if (app.session.hasNext()) {
        $("#workspace .top .next").visible();
    } else {
        $("#workspace .top .next").invisible();
    }
    if (app.session.hasPrevious()) {
        $("#workspace .top .previous").visible();
    } else {
        $("#workspace .top .previous").invisible();
    }
};

app.view.modal = app.view.modal || {
    __on_modal_close: undefined
};


app.view.modal.open = function(content, on_close, on_show, classes)
{
    app.view.modal.__on_modal_close = on_close;
    if ($("#modal").length > 0) {
        if (!$("#modal").hasClass(classes)) {
            $("#modal").addClass(classes)
        }
        $("#modal .content").html(content);
        if (on_show) {
            on_show();
        }
        return;
    }
    $("body").append(
        notulous.util.renderTpl("modal", {
            content: content,
            maxheight: $(window).height()-250,
            classes: classes
        })
    );
    $("#overlay .overlay-bg, #modal .close").on("click", app.view.modal.close);
    if (on_show) {
        on_show();
    }
};

app.view.modal.close = function() {
    $("#overlay").remove();
    if (app.view.modal.__on_modal_close) {
        app.view.modal.__on_modal_close();
    }
    return false;
};
