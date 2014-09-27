var _       = require('lodash');
var expect  = require('chai').expect;
var VError  = require('verror');

module.exports = {
     assertTitle: function assertTitle(expectedTitle, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertTitle";
        }
        this.getTitle(function (err, title) {
            try {
                if (err) {throw err;}
                expect(title).to.equal(expectedTitle);
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },
     assertExists: function assertExists(selector, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertExists";
        }
        this.isExisting(selector, function (err, isExisting) {
            try {
                if (err) {throw err;}
                expect(isExisting).to.be.true;
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },

    assertIsVisible: function (selector, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertIsVisible";
        }
        this.isVisible(selector, function (err, isVisible) {
            try {
                if (err) {throw err;}
                expect(isVisible).to.be.true;
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },
    assertIsHidden: function (selector, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertIsHidden";
        }
        this.isVisible(selector, function (err, isVisible) {
            try {
                if (err) {throw err;}
                expect(isVisible).to.be.false;
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },

     assertText: function assertText(selector, expectedText, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertText";
        }
        this.getText(selector, function (err, text) {
            try {
                if (err) {throw err;}
                expect(text).to.equal(expectedText);
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },

    // Form

     assertFieldExists: function assertFieldExists(name, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertFieldExists";
        }

        this.isExisting(_.template('[name=<%= name %>]', {name: JSON.stringify(name)}), function (err, isExisting) {
            try {
                if (err) {throw err;}
                expect(isExisting).to.be.true;
                cb();
            } catch (e) {
                cb(new VError(e, message));
            }
        });
    },

    assertPathname: function assertPathname(expectedUrl, message, cb) {
        if (!cb) {
            cb = message;
            message = "assertPathname";
        }
        this.execute(function () {
                return window.location.pathname;
            }, function (err, url) {
                try {
                    if (err) {throw err;}
                    expect(url.value).to.equal(expectedUrl);
                    cb();
                } catch (e) {
                    cb(new VError(e, message));
                }
            });
    }
};
