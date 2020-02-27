/**
 * 处理 info 中的 data 然后返回 info
 */

const ts = require('typescript');

const addFile = (info, args) => {
    return modify(info, args);
}

const modify = (info, args) => {
    const result = ts.transpileModule(info.data.toString(), { compilerOptions: args });

    info.data = result.outputText.replace(/(import .* from\s+['"])(.*)(?=['"])/g, '$1$2.js');
    info.destPath = info.destPath.replace(/\.ts$/, '.js');

    return info;
}

const removeFile = (info, args) => {
    info.destPath = info.destPath.replace(/\.ts$/, '.js');
    return info;
}

exports.addFile = addFile;
exports.modify = modify;
exports.removeFile = removeFile;