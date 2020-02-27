/**
 * 读写文件数据使用异步，其余使用同步
 */

const fs = require('fs');
const fsPromise = fs.promises;
const { TYPES } = require('./watch');

/**
 * 创建文件
 * @param {*} info 
 * @param {Function} cb 
 */
const addFile = async function (info, builder) {
    let pipe = getPipe(info).then(readFile);

    const libs = builder[info.ext];
    if (libs) {
        for (let lib of libs) {
            if (lib.addFile) {
                pipe = pipe.then(function (info) {
                    lib.addFile(info, lib.args);
                    return info;
                })
            }
        }
    }

    return pipe.then(checkFileFolder).then(writeFile);
}

/**
 * 创建文件
 * @param {*} info 
 * @param {Function} cb 
 */
const addFolder = async function (info, builder) {
    let pipe = getPipe(info);

    const libs = builder[info.ext];
    if (libs) {
        for (let lib of libs) {
            if (lib.addFolder) {
                pipe = pipe.then(function (info) {
                    lib.addFolder(info, lib.args);
                    return info;
                })
            }
        }
    }

    return pipe.then(checkFolder);
}

/**
 * 更新文件
 * @param {*} info 
 * @param {*} builder
 */
const modify = async function (info, builder) {
    let pipe = getPipe(info).then(readFile);

    const libs = builder[info.ext];
    if (libs) {
        for (let lib of libs) {
            if (lib.modify) {
                pipe = pipe.then(function (info) {
                    lib.modify(info, lib.args);
                    return info;
                })
            }
        }
    }

    return pipe.then(writeFile);
}

/**
 * 更新文件夹
 * @param {*} info 
 * @param {*} builder
 */
const modifyFolder = async function (info, builder) {
    let pipe = getPipe(info);

    return pipe;
}

/**
 * 移除文件
 * @param {*} info 
 */
const removeFile = async function (info, builder) {
    let pipe = getPipe(info);

    const libs = builder[info.ext];
    if (libs) {
        for (let lib of libs) {
            if (lib.removeFile) {
                pipe = pipe.then(function (info) {
                    lib.removeFile(info, lib.args);
                    return info;
                })
            }
        }
    }

    return pipe.then(unlink);
}

const removeFolder = async function (info, builder) {
    let pipe = getPipe(info);

    const libs = builder[info.ext];
    if (libs) {
        for (let lib of libs) {
            if (lib.removeFolder) {
                pipe = pipe.then(function (info) {
                    lib.removeFolder(info, lib.args);
                    return info;
                })
            }
        }
    }

    return pipe.then(unlink);

}
// ==============================================================

const getPipe = function (info) {
    return Promise.resolve(info);
}

const readFile = async function (info) {
    return fsPromise.readFile(info.path).then(function (data) {
        info.data = data;
        info.size = Buffer.byteLength(data);
        return info;
    })
}

const writeFile = async function (info) {
    return fsPromise.writeFile(info.destPath, info.data).then(function () {
        info.sizeWrite = Buffer.byteLength(info.data);
        delete info.data;
        return info;
    });
}

/**
 * 移除文件夹/文件
 * @param {*} info 
 */
const unlink = function (info) {
    info.children.forEach(unlink);
    if (info.type === TYPES.FOLDER) {
        fs.rmdirSync(info.destPath);
    } else if (info.type === TYPES.FILE) {
        fs.unlinkSync(info.destPath);
    }

    return info;
}

/**
 * 检查文件夹路径，创建不存在的文件夹
 * @param {*} info 
 */
const checkFolder = function (info) {
    if (fs.existsSync(info.destPath)) {
        return info;
    } else {
        if (info.parent) {
            checkFolder(info.parent);
        }
        fs.mkdirSync(info.destPath);
        return info;
    }
}
/**
 *  检查文件路径，创建不存在的文件夹
 * @param {*} info 
 */
const checkFileFolder = function (info) {
    checkFolder(info.parent);
    return info;
}

exports.addFile = addFile;
exports.addFolder = addFolder;
exports.modify = modify;
exports.modifyFolder = modifyFolder;
exports.removeFile = removeFile;
exports.removeFolder = removeFolder;