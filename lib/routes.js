var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var convertMarkdown = require('./markdown');

var mdDir, debug, hasSetting, docList, title, hasSwaggerDoc, swaggerDoc;
var mdFiles = {};
var swagger_cache = {};
var mdCache = {};
var docEjs = path.join(__dirname, '../views/docs');

router.use('/asset/', express.static(path.join(__dirname, '../public')));
// for swagger
fs.readFile(path.join(__dirname, '../public/index.html'), function (err, html) {
    if (err) {throw err;}        
    swagger_cache['index'] = html; //Buffer.from( String(html).replace('css/reset.css','') );
});

// routes
function routes(options) {
    "use strict";

    if (!options.mddir) {
        throw new Error("mddir is not specified");
    }

    mdDir = options.mddir;
    debug = options.debug || false;
    hasSetting = options.hasSetting || false;
    title = options.title || "";
    hasSwaggerDoc = options.swaggerDoc? true: false;
    swaggerDoc = options.swaggerDoc;

    // open md mddir
    fs.readdir(mdDir, function(err, files) {
        if (err) throw err;

        if (hasSetting) {
            fs.open(path.join(mdDir, 'settings.json'), 'r', function(err, fd) {
                if (err) {
                    if (err.code == "ENOENT") {
                        console.error("You set hasSetting true but ", mdDir, "/settings.json is not exist");
                    }

                    throw err;
                }

                // read mddir/settings.json
                fs.readFile(fd, 'utf8', (err, data) => {
                    var settings = JSON.parse(data);
                    if (settings.listorder) {
                        docList = settings.listorder;
                        if (debug) console.log("List up md files... ", docList);

                        // check file existance
                        docList.forEach(name => {
                            let wholename = name + ".md";
                            let file = files.find(filename => (wholename === filename));
                            if (file) {
                                mdFiles[name] = path.join(mdDir, file);
                            } else {
                                console.error("settings.json defines file: ", name, "but the file is not exist in ", mdDir);
                                throw new Error("File " + name + " is not exist");
                            }
                        });
                    }
                });
            });
        } else {
            // read alphabetical order
            files.forEach(function(filename) {
                if (filename.endsWith('.md')) {
                    mdFiles[filename.substring(0, filename.length - 3)] = path.join(mdDir, filename);
                }
            });
            docList = Object.keys(mdFiles);
            if (debug) console.log("md file name list: ", docList);
            return;
        }
    });
    router.get('/', function(req, res) {
        let param = {
            title: title,
            content : null,
            hasSwaggerDoc: hasSwaggerDoc,
            baseUrl: req.baseUrl,
            list: docList
        };

        res.render(docEjs, param);
    });

    router.get('/swagger', function(req, res) {
        let param = {
            title: title,
            content : swagger_cache.index,
            hasSwaggerDoc: hasSwaggerDoc,
            baseUrl: req.baseUrl,
            list: docList
        };
        res.render(docEjs, param);
    });

    router.get('/swagger/apidoc', function(req, res) {
        res.status(200).send(swaggerDoc);
    });

    router.get('/:filename', function(req, res) {
        let filename = req.params.filename;
        let filepath = mdFiles[filename];
        if (filepath) {
            if (debug) console.log("File: ", filepath);
            // check cache
            fs.stat(filepath, function(err, stats) {
                if (mdCache[filename] && (mdCache[filename].mtime.getTime() === stats.mtime.getTime())) {
                    // use cache
                    if (debug) console.log("Using cached value");
                    let param = {
                        title: title,
                        mdfilename: filename,
                        content : mdCache[filename].html,
                        hasSwaggerDoc: hasSwaggerDoc,
                        baseUrl: req.baseUrl,
                        list: docList
                    };
                    res.render(docEjs, param);
                } else {
                    // read from file and add cache
                    convertMarkdown(filepath, function(err, html) {
                        if (err) return res.status(500).json(err);
                        // add cache
                        mdCache[filename] = {
                            mtime: stats.mtime,
                            html: html
                        };

                        // render page
                        let param = {
                            title: title,
                            mdfilename: filename,
                            content : html,
                            hasSwaggerDoc: hasSwaggerDoc,
                            baseUrl: req.baseUrl,
                            list: docList
                        };
                        res.render(docEjs, param);
                    });
                }
            });
        } else {
            res.status(404).send();
        }
    });

    return router;
}

module.exports = routes;
