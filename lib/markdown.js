var marked = require('marked');
var fs = require('fs');

var markedRenderer = new marked.Renderer();

marked.setOptions({
    renderer: markedRenderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
});

// override renderer
markedRenderer.table = function(header, body) {
    return '<table class="table table-striped">\n'
        + '<thead>\n'
        + header
        + '</thead>\n'
        + '<tbody>\n'
        + body
        + '</tbody>\n'
        + '</table>\n';
}

// helper function for converting markdown to html string
function convertMarkdown(file, callback) {
    // read md file
    fs.open(file, 'r', function(err, fd) {
        if (err) return callback(err);

        // convert
        fs.readFile(fd, 'utf8', (err, mdString) => {
            if (err) return callback(err);
            return marked(mdString, callback);
        });
    });
}

module.exports = convertMarkdown;