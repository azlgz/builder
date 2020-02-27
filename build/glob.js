/*
支持全路径匹配，参数是相对于根目录的路径 (root: src/, path: src/test/f1.txt, arg test/f1.txt)

通配规则：
*   匹配任意数量的任何字符，包括无 不匹配 '/'
**  匹配任意路径
?   匹配任何单个非空字符 不匹配 '/'

*/

const REG = {
    SOME: /(\*)/g,
    ANY: /(\*\*)/g,
    ONE: /(\?)/g,
    DOT: /(\.)/g,
    PATH: /(\/)/g
}

/**
 * 将 glob 字符转换成正则字符
 * @param {string} str 
 * @returns {string}
 */
const parseRule = function (str) {
    const end = REG.SOME.test(str) || REG.ANY.test(str);
    return '(' +
        str.replace(REG.DOT, '\\$1')
            .replace(REG.PATH, '\\$1')
            .replace(REG.ANY, 'any')
            .replace(REG.SOME, '[^\\/]*')
            .replace(REG.ONE, '[^\\/\\s]')
            .replace('any', '.*')
        + (end ? '$' : '') + ')';
}

/**
 * 获取过滤规则
 * @param {string[]} rules 
 * @returns {(str:string)=>boolean}
 */
const getRules = function (rules) {
    let r = '';
    for (let i = 0; i < rules.length; i++) {
        r += (i == 0 ? '' : '|') + parseRule(rules[i])
    }
    const reg = new RegExp(r, 'g');
    const f = (str) => {
        reg.lastIndex = 0;
        return reg.test(str);
    }

    return f;
}

/**
 * 获取一个过滤器
 * @param {string[]} include 
 * @param {string[]} exclude 
 * @returns {(str:string)=>boolean} 
 */
const getCheck = (include, exclude) => {
    let ic, ec;

    if (include && include.length) {
        ic = getRules(include);
    }

    if (exclude && exclude.length) {
        ec = getRules(exclude);
    }

    const check = function (str) {
        if (ec && ec(str)) {
            if (ic && ic(str)) {
                return true;
            }
            return false;
        }

        return true;
    }

    return check;
}

module.exports = getCheck;