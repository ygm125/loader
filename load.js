(function(window) {

    var document = window.document;
    var head = document.head || document.getElementsByTagName('head')[0];
    var moduleClass = 'mod' + new Date()*1;
    var W3C = document.dispatchEvent;
    var modules = {};
    var baseurl = (function() {
        var tags = document.getElementsByTagName("script"),
            script = tags[tags.length - 1],
            url = script.hasAttribute ? script.src : script.getAttribute( 'src', 4 );
        return script.getAttribute("data-baseurl") || url.replace(/\/[^\/]+$/, "");
    })();

    var STATE = { LOADING : 0, LOADED : 1, EXECUTED : 2};

    if(!Array.prototype.indexOf){
        Array.prototype.indexOf = function(item, index) {
            var n = this.length,
                    i = ~~index;
            if (i < 0)
                i += n;
            for (; i < n; i++)
                if (this[i] === item)
                    return i;
            return -1;
        }
    }

    function log(str){
        console && console.log(str);
    }

    function loadJS(url,callback){
        var node = document.createElement("script");
        node.className = moduleClass; //让getCurrentScript只处理类名为moduleClass的script节点
        node[W3C ? "onload" : "onreadystatechange"] = function() {
            if (W3C || /loaded|complete/i.test(node.readyState)) {
                callback && callback();
                node[W3C ? "onload" : "onreadystatechange"] = null;
                head.removeChild(node);
            }
        };
        node.onerror = function() {
            log('failed load:', url);
        };
        node.src = url; 
        head.insertBefore(node, head.firstChild);
    }

    function parseId(id){
        var url,tmp,ret,spath;
        if (/^(\w+)(\d)?:.*/.test(id)) { //如果本来就是完整路径
            ret = id;
        } else {
            tmp = id.charAt(0);
            spath = id.slice(0,2);
            if(tmp != "." && tmp != "/"){ //当前路径
                ret = baseurl + "/" + id;
            }else if(spath == "./"){ //当前路径
                ret = baseurl + id.slice(1);
            }else if(spath == ".."){ //相对路径
                url = baseurl;
                id = id.replace(/\.\.\//g,function(){
                    url = url.substr(0,url.lastIndexOf("/"));
                    return "";
                });
                ret = url + "/" + id;
            }
        }
        if (!/\.js$/.test(ret)) {
            ret += ".js";
        }
        return ret;
    }

    function parseIds(ids){
        for (var i = 0; i < ids.length; i++) {
            ids[i] = parseId(ids[i]);
        };
        return ids;
    }

    function load(id,parent){
        if (!modules[id]) { //如果之前没有加载过
            modules[id] = {
                state:STATE.LOADING,
                parents:[],
                exports: {}
            };
            loadJS(id);
        }
        if(modules[id].parents.indexOf(parent) === -1){
            modules[id].parents.push(parent);
        }
        return id;
    }

    function getCurrentScript() {
        // 参考 https://github.com/samyk/jiagra/blob/master/jiagra.js
        var stack,sourceURL;
        try {
            a.b.c(); //强制报错,以便捕获e.stack
        } catch (e) { //safari的错误对象只有line,sourceId,sourceURL
            stack = e.stack;
            sourceURL = e.sourceURL;
        }
        if (stack) {//标准浏览器(IE10、Chrome、Opera、Firefox)
            stack = stack.split(/[@ ]/g).pop(); //取得最后一行,最后一个空格或@之后的部分
            stack = stack[0] === "(" ? stack.slice(1, -1) : stack.replace(/\s/, ""); //去掉换行符
            return stack.replace(/(:\d+)?:\d+$/i, ""); //去掉行号与或许存在的出错字符起始位置
        }
        if(sourceURL){//针对Safari
            return sourceURL;
        }
        // IE6-9
        var nodes = head.getElementsByTagName("script"); //只在head标签中寻找
        for (var i = nodes.length, node; node = nodes[--i]; ) {
            if (node.className === moduleClass && node.readyState === "interactive") {
                return node.src;
            }
        }
    }

    var fireFactory = function(id,deps,factory){
        var mod = modules[id];
        if(deps){
            var args = [];
            for (var i = 0; i < deps.length; i++) {

                args.push(modules[deps[i]].exports);
            };
        }
        var ret = factory.apply(null,args);
        if(ret){
            mod.exports = ret;
        }
        mod.state = STATE.EXECUTED;
        if(mod.parents){
            for (var i = 0 , len = mod.parents.length ; i < len; i++) {
                var pid = mod.parents[i];
                require(modules[pid].deps,modules[pid].factory,pid);
            };
        }
    }

    var require = function(deps, factory, parent){
        var id = parent || baseurl;
            id = parseId(id);
            deps = parseIds(deps);
        var ni = 0, ci = 0;
        for (var i = 0, len = deps.length ; i < len; i++) {
            var url = load(deps[i],id);
            if(url){
                ni++;
                if (modules[url] && modules[url].state === STATE.EXECUTED) {
                    ci++;
                }
            }
        };
        modules[id] = modules[id] || { deps : deps , factory : factory };
        if (ni === ci) {
            fireFactory(id ,deps ,factory); 
        }
    }

    var define = function(id, deps, factory){
        if(arguments.length === 1){
            factory = id;
            id = getCurrentScript();
            deps = [];
        }
        if(arguments.length === 2){
            if(typeof id === "string"){
                factory = deps;
                deps = [];
            }
            if(typeof id === "array"){
                factory = deps;
                deps = id;
                id = getCurrentScript();
            }
        }
        id = parseId(id);
        deps = parseIds(deps);
        modules[id].factory = factory;
        modules[id].deps = deps;
        modules[id].state = STATE.LOADED;
        require(deps,factory,id);
    }
    
    define.amd = {
        modules : modules
    }

    window.require = require;
    window.define = define;

})(window);