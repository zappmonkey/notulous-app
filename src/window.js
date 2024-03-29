const fontawesome = require('@fortawesome/fontawesome');
const faSolid = require('@fortawesome/fontawesome-free-solid');
const ipcRenderer = require('electron').ipcRenderer;

window.destroy = function() {
    database.closeAll();
};

$(document).ready(function() {
    app.init();
});

ipcRenderer.on('search-all', function() {
    app.search.all();
});

ipcRenderer.on('editor', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .terminal").trigger("click");
    }
});

ipcRenderer.on('table', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .table").trigger("click");
    }
});

ipcRenderer.on('archive', function() {
    if ($("#workspace .buttons.database").is(":visible")) {
        $("#workspace .buttons.database .archive").trigger("click");
    }
});

ipcRenderer.on('table-filter', function() {
    if ($("#workspace .buttons.table").is(":visible")) {
        $("#workspace .buttons.table .filter").trigger("click");
    }
});

ipcRenderer.on('table-reload', function() {
    app.database.table.refresh();
});

ipcRenderer.on('table-transpose', function() {
    app.database.table.transpose();
});

ipcRenderer.on('table-info', function() {
    app.database.table.info();
});

ipcRenderer.on('table-structure', function() {
    app.database.table.structure();
});

ipcRenderer.on('previous-query', function() {
    app.view.previousQuery();
});

ipcRenderer.on('next-query', function() {
    app.view.nextQuery();
});

ipcRenderer.on('run-queries', function() {
    if ($("#workspace .buttons.terminal").is(":visible")) {
        $("#workspace .buttons.terminal .run").trigger("click");
    }
});

ipcRenderer.on('add-instance', function() {
    app.instance.add();
});

ipcRenderer.on('close-instance', function() {
    app.instance.close();
});

ipcRenderer.on('show-processlist', function() {
    app.instance.processlist.start();
});
