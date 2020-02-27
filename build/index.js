
const fs = require('fs');

const build = require('./build');
const getCheck = require('./glob');
const { CMD, Watcher } = require('./watch');

const libsDir = './lib/';

/**
 * 获取json配置
 */
const getCfg = () => {
    const cfgPath = process.argv[2];

    const str = fs.readFileSync(cfgPath, "utf8");
    const cfg = JSON.parse(str);
    if (cfg.path[cfg.path.length - 1] === '/') {
        cfg.path = cfg.path.substr(0, cfg.path.length - 1);
    }
    if (cfg.dest[cfg.dest.length - 1] === '/') {
        cfg.dest = cfg.dest.substr(0, cfg.dest.length - 1);
    }

    return cfg;
}

/**
 * 处理任务配置
 * @param {*} libs 
 * @param {*} args 
 */
const getHandle = (libs, args) => {
    return libs.map((path, i) => {
        const lib = require(libsDir + path);
        const r = {
            args: args[i]
        };
        if (lib.addFile) {
            r.addFile = lib.addFile;
        }
        if (lib.modify) {
            r.modify = lib.modify;
        }
        if (lib.removeFile) {
            r.removeFile = lib.removeFile;
        }

        return r;
    })
}

/**
 * 传入配置返回构建器
 * @param {*} cfg 
 */
const getBuilder = (cfg) => {
    const builder = {};
    cfg.task.forEach(v => {
        builder[v.suf] = getHandle(v.libs, v.args);
    })

    return builder;
}

const cfg = getCfg();
const check = getCheck(cfg.include, cfg.exclude);
const builder = getBuilder(cfg);

/**
 * 构建处理文件
 * @param {*} info 文件信息
 */
const callback = function (info) {
    if (info.cmd === CMD.MODIFYFILE) {
        return build.modify(info, builder);
    } else if (info.cmd === CMD.MODIFYFOLDER) {
        return build.modifyFolder(info, builder);
    } else if (info.cmd === CMD.ADDFILE) {
        return build.addFile(info, builder);
    } else if (info.cmd === CMD.ADDFOLDER) {
        return build.addFolder(info, builder);
    } else if (info.cmd === CMD.REMOVEFILE) {
        return build.removeFile(info, builder);
    } else if (info.cmd === CMD.REMOVEFOLDER) {
        return build.removeFolder(info, builder);
    } else {
        throw new Error(`unknown cmd: ${info.cmd} ${info.path}`);
    }
}

const watcher = new Watcher(cfg, check, callback);
