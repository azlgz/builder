const Terser = require("terser");

const addFile = (info, args) => {
    return modify(info, args);
}

const modify = (info, args) => {
    if (args.maxSize && info.data.length > args.maxSize) {
        return info;
    }

    let result;
    if (typeof info.data !== 'string') {
        result = Terser.minify(info.data.toString());
    } else {
        result = Terser.minify(info.data);
    }

    if (result.error) {
        throw new Error(result.error);
    }
    if (result.warnings) {
        console.log(result.warnings);
    }
    info.data = result.code;

    return info;
}


exports.addFile = addFile;
exports.modify = modify;
