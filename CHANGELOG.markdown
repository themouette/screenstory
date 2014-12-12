v0.7.1
------

* fix timeout === null or undefined

v0.7.0
------

* Fix timeout=0
* Update webdrivercss to ^1.0

v0.6.4
------

* Allow timeout to be configured in screenstory.yml

v0.6.3
------

* Rename flag to `--no-mocha-colors`
* Add `--screenshot-diff` flag

v0.6.2
------

* Add `--mocha-colors` and `--mocha-no-colors` flags

v0.6.1
------

* Restore scroll after screenshot
* Fix error when story is not set

v0.6.0
------

* Use screenstory.yml for options
* Change `--wd-resolution` to `--resolution`
* Migrate from Promises to Async
* Add some tests
* Phantomjs does not relies on webdrivercss anymore
* Cli version is in sync with package.json

v0.5.1
------

* Fix screen resolution in saucelabs
* default capabilities are windows, to leverage screen width

v0.5.0
------

* Use webdrivercss (for full page screenshots)
* Add ability to store screenshots in
* Capture with webrdrivercss
* Store screenshots in --screenshot-root argument path
* Forward to [webdrivercss-adminpanel](https://github.com/webdriverio/webdrivercss-adminpanel)
* Add command line option to use adminpanel
* Scope by stories in adminpanel
* Add --screenshot-width and --screenshot-orientation client options
* Screenstory should expects base64 strings with images
* Add generated images to screenstory report
* Automatically load screenstory.yml files
* Use webdrivercss saveDocumentScreenshot method
* Update README
