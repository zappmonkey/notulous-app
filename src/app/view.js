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