const fontawesome = require('@fortawesome/fontawesome');
const faSolid = require('@fortawesome/fontawesome-free-solid');
// const { remote } = require('electron');
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

ipcRenderer.on('run-queries', function() {
    if ($("#workspace .buttons.terminal").is(":visible")) {
        $("#workspace .buttons.terminal .run").trigger("click");
    }
});
