## 本构建器功能和特色
+ 构建信息丰富，结构简洁明了代码量少，易于拓展
+ 无第三方库依赖
+ 支持插件，当然需要你自己写
+ 内置ts编译和js压缩的插件

## 配置
```
{
    "path": "./client",
    "dest": "./public",
    "include": [],
    "exclude": [
        "*.d.ts"
    ],
    "task": [
        {
            "suf": ".ts",
            "libs": [
                "ts2js"
            ],
            "args": [
                {
                    "removeComments": true,
                    "target": "es6"
                }
            ]
        }
    ]
}
```
+ path 构建源目录
+ dest 目标目录
+ include 包含规则
    ```
    采用glob通配符转换成正则匹配，支持 *, **, ? 三种规则，详见 /build/glob.js
    ```
+ exclude 排除规则
+ task 构建任务
    ```
    针对不同后缀文件创建不同构建任务
    sur     文件后缀(带.)
    libs    依次需要执行的构建操作，对应build/lib/目录下的插件，如ts转js然后压缩，libs应为 ["ts2js","minjs"]
    args    对应libs所需的参数
    ```

## 插件
参考 build/lib/ts2js.js

配置每个操作对应的方法：
```
exports.addFile = addFile;          // 无配置则复制文件到目标路径
exports.addFolder = addFolder;      // 无配置则创建同名目录到目标路径
exports.modify = modify;            // 无配置则替换文件到目标路径
exports.modifyFolder = modifyFolder;// 无配置则做不处理
exports.removeFile = removeFile;    // 无配置则删除目标路径同名文件
exports.removeFolder = removeFolder;// 无配置则删除目标路径同名文件夹及子文件
```
一般 addFile 和 modify 是执行同一操作。

如果在文件/文件夹被操作的各个过程无需其他多余处理，可略过其方法。

比如：压缩js不涉及文件夹的所有操作，无需配置 addFolder、modifyFolder、removeFolder。而ts转js需要将文件名改为 *.js，故而必须配置 addFile、modify、removeFile。

构建过程类似gulp，每个插件处理完数据后将data绑定到 fileInfo 上，fileInfo 信息可查看 build/watch.js

## 脚本
scripts 中包含快速启动构建器的脚本，你也可以通过vscode启动调试构建，相关配置已经配好 /.vscode/launch.json

## 依赖
如果你需要使用内置的ts转js插件和js代码压缩插件，需要为本项目安装typescript 和terser 依赖。