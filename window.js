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
