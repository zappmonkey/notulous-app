const $ = require('jquery');
const Handlebars = require('handlebars');
const fs = require("fs");

var notulous = {};

notulous.config = {
    __config: undefined
};
notulous.config.load = function() {
    if (notulous.config.__config == undefined) {
        var config = fs.readFileSync("./config.json");
        notulous.config.__config = JSON.parse(config);
    }
    return notulous.config.__config;
};
notulous.config.instance = function(key) {
    var config = notulous.config.load();
    if (config.instances.hasOwnProperty(key)) {
        return config.instances[key];
    }
    return undefined;
};

notulous.util = {};
notulous.util.empty = function(val) {
    switch (val) {
        case undefined:
        case null:
        case "":
        case false:
        case 0:
            return true;
    }
    return false;
}
notulous.util.fuzzyCompare = function(search, compare, startWith) {
    if (compare == undefined || search == undefined) {
        return false;
    }
    var queries = search.split("|");
    var regex = "";
    var first = ".*?";
    if (startWith) {
        first = "^";
    }
    for (var key in queries) {
        if (regex != "") {
            regex += "|";
        }
        regex += first + queries[key].toLowerCase().replace(/-/g, "\\-").split("").join(".*?") + ".*?";
    }
    return compare.toLowerCase().match(regex);
};

notulous.util.renderTpl = function(tpl, data) {
    if (data == undefined) {
        data = {};
    }
    return Handlebars.compile($("#tpl-" + tpl).html())(data);
};

notulous.storage = {};
notulous.storage.set = function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
};

notulous.storage.unset = function(key) {
    localStorage.removeItem(key);
};

notulous.storage.get = function(key) {
    var i = localStorage.getItem(key);
    if (!i) {
        return undefined;
    }
    return JSON.parse(i);
};

notulous.storage.clear = function() {
    localStorage.clear();
};

var DateFormats = {
       short: "DD MMMM YYYY",
       short_with_time: "[on the] Do [of] MMM YYYY [at] HH:mm",
       long: "dddd DD.MM.YYYY HH:mm"
};

Handlebars.registerHelper("formatDate", function(datetime, format) {
    if (moment) {
        // can use other formats like 'lll' too
        format = DateFormats[format] || format;
        return moment(datetime).format(format);
    } else {
        return datetime;
    }
});

Handlebars.registerHelper('ifEq', function(v1, v2, options) {
    if(v1 == v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifNotEq', function(v1, v2, options) {
    if(v1 != v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifSmaller', function(v1, v2, options) {
    if(v1 < v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('ifGreater', function(v1, v2, options) {
    if(v1 > v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

Handlebars.registerHelper('truncate', function(string, length, append) {
    if (!append) {
        append = "...";
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = string;
    text = tmp.textContent || tmp.innerText;
    text = text.replace(/(\r\n|\n|\r)/gm,"").trim();
    if (text.length > length) {
        text = text.substring(0, length) + append;
    }
    return text;
});

Handlebars.registerHelper('filesize', function(size) {
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
});

Handlebars.registerHelper('property', function(obj, property, startswith, caseinsensitive) {
    if (!startswith && !caseinsensitive) {
        try {
            if (obj[property]) {
                return obj[property];
            }
        } catch (err) {
            console.log(err);
        }
    } else {
        if (caseinsensitive) {
            property = property.toLowerCase();
        }
        for (var prop in obj) {
            tprop = prop
            if (caseinsensitive) {
                tprop = tprop.toLowerCase();
            }
            if (startswith) {
                if (tprop.startsWith(property)) {
                    return obj[prop];
                }
            } else if (tprop == property) {
                return obj[prop];
            }
        }
    }
    return null;
});
