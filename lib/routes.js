var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var convertMarkdown = require('./markdown');

var mdDir, debug, hasSetting, docList, title, hasSwaggerDoc, swaggerDoc;
/**
 * {
 *  title: {type: "dir"|"md", file: "path", files: [name, {type:..., file:...}]}
 * }
 */
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

function readSubdir(dirpath) {
    files = fs.readdirSync(dirpath);
    ret = [];
    files.forEach(function(filename) {
        if (filename.endsWith('.md')) {
            ret.push([filename.substring(0, filename.length - 3), {type: "md", file: path.join(dirpath, filename)}]);
        }
    });
    return ret;
}

function createMDListWithUserDefined(userDefinedList, fileListInDir, mdDir, debug) {
    if (debug) console.log("List up md files... ", userDefinedList);
    checks = userDefinedList.slice();

    fileListInDir.forEach(filename => {
        let fullPath = path.join(mdDir, filename);
        let lstat = fs.lstatSync(fullPath);
        if (lstat.isDirectory()) {
            let idx = checks.indexOf(filename);
            if (idx >= 0) {
                checks.splice(idx, 1);
                let filesInSubdir = readSubdir(fullPath);
                mdFiles[filename] = {
                    type: "dir",
                    files: filesInSubdir
                }
                // add md list under subdirectory key: "folder/file", value: {type:..., file:...}
                filesInSubdir.forEach(([name, property]) => {
                    let key = path.join(filename, name);
                    mdFiles[key] = property;
                });
            }
        } else if (filename.endsWith('.md')) {
            let name = filename.substring(0, filename.length-3);
            let idx = checks.indexOf(name);
            if (idx >= 0) {
                checks.splice(idx, 1);
                mdFiles[name] = {
                    type: "md",
                    file: fullPath
                };
            }
        }
    });

    if (checks.length != 0) {
        throw new Error("These files are not exist: " + checks.toString());
    }

    docList = [];
    userDefinedList.forEach(name => {
        docList.push([name, mdFiles[name]]);
    });
}

function createMDList(mdDir, debug, hasSetting, title, hasSwaggerDoc, swaggerDoc) {
    // open md mddir, check file existence if hasSetting is on, traverse up to level1 sub-directory
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
                        createMDListWithUserDefined(settings.listorder, files, mdDir, debug);
                    }
                });
            });
        } else {
            // read alphabetical order
            docList = [];
            files.forEach(function(filename) {
                let fullPath = path.join(mdDir, filename);
                let lstat = fs.lstatSync(fullPath);
                // read subdirectory
                if (lstat.isDirectory()) {
                    let filesInSubdir = readSubdir(fullPath);
                    mdFiles[filename] = {
                        type: "dir",
                        files: filesInSubdir
                    };
                    // add md list under subdirectory key: "folder/file", value: {type:..., file:...}
                    filesInSubdir.forEach(([name, property]) => {
                        let key = path.join(filename, name);
                        mdFiles[key] = property;
                    });
                    docList.push([filename, mdFiles[filename]]);
                } else if (filename.endsWith('.md')) {
                    let name = filename.substring(0, filename.length - 3);
                    mdFiles[name] = {
                        type: "md",
                        file: fullPath
                    };
                    docList.push([name, mdFiles[name]]);
                }
            });
            // docList = Object.keys(mdFiles);
            if (debug) console.log("md file/subdir name list: ", docList);
            return;
        }
    });
}

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

    createMDList(mdDir, debug, hasSetting, title, hasSwaggerDoc, swaggerDoc);

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
        let property = mdFiles[filename];
        if (property) {
            if (debug) console.log("Requested property: ", property);
            // check cache
            let filepath = property.file;
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
