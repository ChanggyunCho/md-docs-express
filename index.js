var router = require('./lib/routes');

function mddocs_express_router(options) {
    return router(options);
}

module.exports = mddocs_express_router;