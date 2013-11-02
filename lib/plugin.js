var events = require('events');
var util = require('util');
var _ = require('underscore');
var Q = require('q');


var Plugin = function(config, app) {
    var that = this;
    _.extend(this, config);
    this.app = app;

    // Load the plugin
    this.load = function() {
        var deferred = Q.defer();
        var imports = {};

        if (that.consumes) {
            that.consumes.forEach(function (name) {
                imports[name] = that.app.services[name];
            });
        }

        var register = function(err, services) {
            if (err) return that.emit("error", err);

            // check services provided
            _.each(that.provides, function(toProvide) {
                if (!services[toProvide]) {
                    var err = new Error("Plugin failed to provide " + toProvide + " service.");
                    that.emit("error", err);
                    deferred.reject(err);
                    return;
                }
                that.app.services[toProvide] = services[toProvide];

                if (typeof services[toProvide] != "function")
                    services[toProvide].name = toProvide;

                that.app.emit("service", toProvide, services[toProvide]);
                deferred.resolve(that);
            });
        }

        var setup = require(that.packagePath);
        try {
            setup(that, imports, register, that.app);
        } catch(e) {
            app.emit("error", e);
            deferred.reject(e);
        }

        return deferred.promise;
    };

    // Unload and destroy plugin
    this.destroy = function() {
        if (that.provides.length) {
            // @todo, make it possible if all consuming plugins are also dead
            var err = new Error("Plugins that provide services cannot be destroyed.");
            return that.app.emit("error", err);
        }

        that.emit("destroy");
        that.app.emit("destroy", that);
    };
};
util.inherits(Plugin, events.EventEmitter);



module.exports = Plugin;