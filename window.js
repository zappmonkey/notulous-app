const fontawesome = require('@fortawesome/fontawesome');
const faSolid = require('@fortawesome/fontawesome-free-solid')
const { remote } = require('electron')

window.destroy = function() {
    database.closeAll();
};

$(document).ready(function() {
    app.init();
});
