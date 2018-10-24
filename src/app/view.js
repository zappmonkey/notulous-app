var app = app || {};

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