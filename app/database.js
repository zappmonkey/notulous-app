var database = {
    __instances: {}
};

database.load = function(instance, callback, close_others) {
    if (!instance) {
        throw "database load instance not defined";
    }
    if (database._has_active_instance(instance)) {
        var mysql = database.__instances[instance.key].mysql;
        if (mysql.ping() == 'OK' && callback) {
            return callback(database.__instances[instance.key].mysql);
        }
    }
    if (close_others) {
        database.closeAll();
    }
    if (instance.type == 'sql') {
        var mysql = require('mysql2');
        var client = mysql.createConnection(database._mysql_config(instance));
        database.__instances[instance.key] = {mysql: client, ssh: undefined};
        if (callback) {
            callback(client)
        }
    } else {
        mysql_ssh = require('mysql-ssh');
        mysql_ssh.connect(database._ssh_config(instance), database._mysql_config(instance))
        .then(client => {
            database.__instances[instance.key] = {mysql: client, ssh: mysql_ssh};
            if (callback) {
                callback(client)
            }
        })
        .catch(err => {
            console.log(err)
        })
    }
};

database.close = function(instance) {
    if (database.__instances.hasOwnProperty(instance) && !notulous.util.empty(database.__instances[instance])) {
        if (!notulous.util.empty(database.__instances[instance].mysql) && 'end' in database.__instances[instance].mysql) {
            database.__instances[instance].mysql.end(function(err) {});
        }
        if (!notulous.util.empty(database.__instances[instance].ssh) && 'end' in database.__instances[instance].ssh) {
            database.__instances[instance].ssh.end();
        }
        database.__instances[instance] = undefined;
    }
};

database.closeAll = function() {
    for (var instance in database.__instances) {
        if (database._has_active_instance(instance)) {
            database.close(instance);
        }
    }
};

database._has_active_instance = function(instance) {
    return (database.__instances.hasOwnProperty(instance) && !notulous.util.empty(database.__instances[instance]));
};

database._ssh_config = function(instance) {
    var con = {};
    if (!notulous.util.empty(instance.ssh_host)) {
        con.host = instance.ssh_host;
    }
    if (!notulous.util.empty(instance.ssh_port)) {
        con.port = instance.ssh_port;
    }
    if (!notulous.util.empty(instance.ssh_username)) {
        con.user = instance.ssh_username;
    }
    if (!notulous.util.empty(instance.ssh_password)) {
        con.password = instance.ssh_password;
    }
    if (!notulous.util.empty(instance.ssh_key)) {
        con.privateKey = fs.readFileSync(instance.ssh_key);
    }
    return con;
};

database._mysql_config = function(instance) {
    var con = {};
    if (!notulous.util.empty(instance.host)) {
        con.host = instance.host;
    }
    if (!notulous.util.empty(instance.port)) {
        con.port = instance.port;
    }
    if (!notulous.util.empty(instance.socket)) {
        con.socket = instance.socket;
    }
    if (!notulous.util.empty(instance.username)) {
        con.user = instance.username;
    }
    if (!notulous.util.empty(instance.password)) {
        con.password = instance.password;
    }
    // if (!notulous.util.empty(instance.key)) {
    //     con.privateKey = fs.readFileSync(instance.key);
    // }
    return con;
};
