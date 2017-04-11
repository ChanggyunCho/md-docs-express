var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var convertMarkdown = require('./markdown');

var mdDir, debug, hasSetting, docList, title, hasSwaggerDoc, swaggerDoc;
var mdFiles = {};
var swagger_cache = {};

// for swagger
fs.readFile('./node_modules/swagger-ui/dist/index.html', function (err, html) {
    if (err) {throw err;}        
    
    swagger_cache['index'] = Buffer.from( String(html).replace('css/reset.css','') );
});

fs.readFile('./node_modules/swagger-ui/dist/swagger-ui.js', function (err, html) {
    if (err) {throw err;}
    swagger_cache['uiscript'] = html;
    // return html;
});	

// routes
function routes(options) {
    if (!options.mddir) {
        throw new Error("mddir is not specified");
    }

    mdDir = options.mddir;
    debug = options.debug || false;
    hasSetting = options.hasSetting || false;
    title = options.title || "";
    hasSwaggerDoc = options.swagger || false;
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
            console.log("md file name list: ", docList);
            return;
        }
    });
    router.get('/', function(req, res) {
        let param = {
            title: title,
            content : null,
            customCssDomain : '/css/swagger-custom.css',
            hasSwaggerDoc: hasSwaggerDoc,
            list: docList
        };

        res.render(path.join(__dirname, '../views/docs'), param);
    });

    router.get('/swagger', function(req, res) {
        let param = {
            title: title,
            content : swagger_cache.index,
            customCssDomain : '/css/swagger-custom.css',
            hasSwaggerDoc: hasSwaggerDoc,
            list: docList
        };
        res.render('webContents/docs', param);
    });

    // consider route as static
    router.get('/swagger-ui.js', function(req, res) {
        res.status(200).send(swagger_cache.uiscript);
    });

    router.get('/swagger/apidoc', function(req, res) {
        res.status(200).send(swaggerDoc);
    });

    router.get('/:filename', function(req, res) {
        let filename = mdFiles[req.params.filename];
        if (filename) {
            console.log("File: ", filename);
            convertMarkdown(filename, function(err, html) {
                if (err) return res.status(500).json(err);
                let param = {
                    title: title,
                    content : html,
                    customCssDomain : '/css/swagger-custom.css',
                    hasSwaggerDoc: hasSwaggerDoc,
                    list: docList
                };
                res.render(path.join(__dirname, '../views/docs'), param);
            });
        } else {
            res.status(404).send();
        }
    });

    return router;
}

module.exports = routes;