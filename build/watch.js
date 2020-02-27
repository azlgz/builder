
const fs = require('fs');
const path = require('path');

const TYPES = { FILE: 0, FOLDER: 1, LINK: 2 };
const CMD = { ADDFILE: 11, ADDFOLDER: 12, MODIFYFILE: 13, MODIFYFOLDER: 14, REMOVEFILE: 15, REMOVEFOLDER: 16 };
const CMDS = {
    ADD: [CMD.ADDFILE, CMD.ADDFOLDER],
    MODIFY: [CMD.MODIFYFILE, CMD.MODIFYFOLDER],
    REMOVE: [CMD.REMOVEFILE, CMD.REMOVEFOLDER]
}
const CMDTEXT = {
    11: 'Add file',
    12: 'Add folder',
    13: 'Modify file',
    14: 'Modify folder',
    15: 'Remove file',
    16: 'Remove folder'
}

/**
 * 监听器
 */
class Watcher {
    showLog = true;
    showErr = true;
    showCmd = true;
    fileMap = new Map(); // 存储监听文件和文件夹列表
    waitMap = new Map(); // 等待处理的文件
    root; // 监听的目录
    dest; // 处理后目标根目录
    check; // 排除规则
    callback; // 监听处理函数
    watcher; //监听器

    /**
     * @param {object} cfg 
     * @param {(str:string)=>boolean} check 
     * @param {(cmd:string,info:FileInfo)=>void} back 
     */
    constructor(cfg, check, callback) {
        this.root = path.normalize(cfg.path);
        this.dest = path.normalize(cfg.dest);
        this.check = check;
        this.callback = callback;
        this.delDir(this.dest);
        this.listFile(this.root);
        this.init().then(this.watch);
    }

    init = () => {
        const arr = [];
        const obj = {};
        const total = { count: 0, size: 0 }
        this.fileMap.forEach(v => {
            if (v.type === TYPES.FILE) {
                v.cmd = CMD.ADDFILE;
                arr.push(this.handleFile(v));
                if (obj[v.ext]) {
                    obj[v.ext].size += v.size;
                    obj[v.ext].count++;
                } else {
                    obj[v.ext] = { count: 1, size: v.size }
                }
                total.size += v.size;
                total.count++;
            }
        })
        obj.total = total;
        
        return Promise.all(arr).then(()=>{
            console.table(obj);
        });
    }

    watch = () => {
        this.watcher = fs.watch(this.root, { recursive: true }, (event, filename) => {
            if (!filename) {
                this.errMsg('Ignor cmd : no filename');
                return;
            }

            this.addEvent(event, filename);
        })

        console.log(`Watch ${this.root}\\ change ... `);
    }

    addEvent = (event, filename) => {
        if (this.check(filename) === false) {
            this.logMsg(`File excluded : ${this.root}\\${filename}`);
            return
        }

        if (this.waitMap.has(filename)) {
            this.logMsg(`In queue : ${event} ${this.root}\\${filename}`);
            return;
        }

        this.waitMap.set(filename, event);

        if (!this.timer) {
            this.timer = setTimeout(this.handleEvent, 100);
        }
    }

    handleEvent = () => {
        const handleList = [];
        this.waitMap.forEach((event, filename) => {
            // 同一列队忽略子文件更改
            // 比如复制文件夹时只执行目录的复制
            const dir = path.parse(filename).dir;
            if (this.waitMap.has(dir)) {
                const inMap = this.fileMap.has(dir);
                const exist = fs.existsSync(path.join(this.root, dir));
                // 此时dir必为文件夹，忽略文件夹的change事件
                if (this.waitMap.get(dir) === 'change' && inMap && exist) {
                    this.logMsg(`Ignor folder change : ${this.root}\\${dir}`);
                    this.waitMap.delete(dir);
                } else {
                    this.logMsg(`Ignor child change : ${this.root}\\${filename}`);
                    return false;
                }
            }

            const inMap = this.fileMap.has(filename);
            const info = inMap ? this.fileMap.get(filename) : this.getInfo(path.join(this.root, filename));
            const exist = fs.existsSync(info.path);
            info.cmd = this.getCmd(info.type, exist, inMap);

            handleList.push(info);
        })

        this.waitMap.clear();
        this.timer = null;

        const arr = handleList.map(v => Promise.resolve(v).then(this.handleFile));
        Promise.all(arr).then(this.handleBack.bind(this.handleBack, handleList));
    }

    // 处理文件
    handleFile = (info) => {
        return Promise.resolve(info)
            .then(this.callback)
            .then(this.cmdMsg)
            .then(this.handleFolder)
            .catch(this.errMsg)
    }

    // 添加文件夹时检测文件夹内部文件
    handleFolder = (info) => {
        if (info.cmd === CMD.ADDFOLDER) {
            const files = fs.readdirSync(info.path);
            files.forEach(v => {
                this.addEvent('rename', path.join(info.key, v))
            })
        }
        return info;
    }

    // 清理数据
    handleBack = (handleList) => {
        handleList.forEach(v => {
            if (v.cmd === CMD.REMOVEFILE || v.cmd === CMD.REMOVEFOLDER) {
                this.removeInfo(v)
                v.removeFromParent();
            }
        })
    }

    // 从fileMap 中移除信息
    removeInfo = (info) => {
        this.fileMap.delete(info.key);
        info.children.forEach(v => {
            this.removeInfo(v);
        });
    }

    dispose = () => {
        this.watcher.close();
        this.fileMap.clear();
        this.waitMap.clear();
        this.check = undefined;
        this.callback = undefined;
        this.watcher = undefined;
    }

    /**
     * 列出文件信息
     */
    listFile = (dir) => {
        if (!this.check(dir)) {
            return null
        }
        let info = this.getInfo(dir);
        if (info && info.type === TYPES.FOLDER) {
            // 读文件夹目录
            const files = fs.readdirSync(info.path);
            files.forEach(v => {
                this.listFile(path.join(dir, v));
            })

        }
    }

    /**
     * 获取文件信息
     */
    getInfo = (dir) => {
        const file = new FileInfo(this.root, this.dest, dir, this.fileMap);
        // 文件和文件夹信息写入hash表
        if (file.type === TYPES.FILE || file.type === TYPES.FOLDER) {
            this.fileMap.set(file.key, file);
            const parent = file.parent;
            if (parent) {
                parent.children.push(file);
            }
            return file;
        }
    }

    delDir = (dir) => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(v => {
                const curPath = path.join(dir, v);
                if (fs.statSync(curPath).isDirectory()) {
                    this.delDir(curPath);
                } else {
                    this.cmdMsg({ cmd: CMD.REMOVEFILE, path: curPath });
                    fs.unlinkSync(curPath);
                }
            });
            this.cmdMsg({ cmd: CMD.REMOVEFILE, path: dir });
            fs.rmdirSync(dir);
        }
    }

    errMsg = (params) => {
        if (this.showErr) {
            if (params.message) {
                params = params.message;
            }
            console.log('\x1b[91m%s\x1b[0m', `❌ ${params}`)
        }
    }

    logMsg = (params) => {
        if (this.showLog) {
            console.log(params);
        }
    }

    cmdMsg = (info) => {
        if (this.showCmd) {
            let msg = `${CMDTEXT[info.cmd]}: ${info.path}`;
            if (info.cmd === CMD.ADDFILE || info.cmd === CMD.MODIFY) {
                msg += `    size:${info.size} -> ${info.sizeWrite}`
            }

            console.log('\x1b[92m%s\x1b[0m', msg);
        }
        return info;
    }

    getCmd = function (fileType, exist, inMap) {
        if (inMap && exist) { // 有 → 有 = 替换
            return CMDS.MODIFY[fileType];
        } else if (inMap) { // 有 → 无 = 删除
            return CMDS.REMOVE[fileType];
        } else if (!inMap && exist) { // 无 → 有 = 添加
            return CMDS.ADD[fileType];
        }

        throw new Error(`unexpected cmd: fileType=${fileType},exist=${exist},inMap=${inMap}`);
    }
}

class FileInfo {
    // 后缀 .html
    ext;
    // 文件名 index
    name;
    // 根目录 root
    root;
    // 文件大小 number 暂时没用到
    size;
    // 类型 TYPES
    type;
    // 修改时间 number
    ctime;
    // 完整路径 ---- 读文件
    path;
    // 目标路径 ---- 写文件
    destPath;
    // 相对根目录的路径 ---- fileMap key
    key;
    // 父级 FileInfo
    parent;
    // 子文件 FileInfo[]
    children = [];

    /**
     * @param {fs.Stats} stat 
     * @param {string} dir 
     */
    constructor(root, dest, dir, fileMap) {
        const obj = path.parse(dir);
        const stat = fs.statSync(dir);
        this.ext = obj.ext;
        this.name = obj.name;

        this.root = root;
        this.size = stat.size;
        this.type = this.getType(stat);
        this.ctime = stat.ctimeMs;

        this.path = path.format({ dir: obj.dir, name: this.name, ext: this.ext });
        this.key = path.relative(this.root, this.path);
        this.destPath = path.join(dest, this.key);
        this.parent = obj.dir ? fileMap.get(path.relative(this.root, obj.dir)) : null;
    }

    removeFromParent() {
        const index = this.parent.children.findIndex(v => v === this);
        this.parent.children.splice(index, 1);
    }

    /**
     * 获取文件类型
     * @param {fs.Stats} stat 
     */
    getType(stat) {
        if (stat.isFile()) {
            return TYPES.FILE;
        }
        if (stat.isDirectory()) {
            return TYPES.FOLDER;
        }
        if (stat.isSymbolicLink()) {
            return TYPES.LINK;
        }
    }
}

exports.FileInfo = FileInfo;
exports.Watcher = Watcher;
exports.TYPES = TYPES;
exports.CMD = CMD;