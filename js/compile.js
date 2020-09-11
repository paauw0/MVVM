class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el) // #app document.querySelector
        this.vm = vm

        if (this.el) {
            // 如果这个元素能获取到 我们才编译
            // 1.先把这些真实的DOM移入到内存中 fragment
            let fragment = this.nodeTofragment(this.el)
            
            // 2.编译 => 提取想要的元素节点 v-model 和文本结点 {{}}
            this.compile(fragment)
            
            // 3.把编译号的fragment再塞回到页面里去
            this.el.appendChild(fragment)
        }
    }

    /* 辅助方法 */
    isElementNode(node) {
        return node.nodeType === 1
    }

    // 是不是指令
    isDirective(name) {
        return name.includes('v-')
    }

    /* 核心方法 */
    nodeTofragment(el) { // 需要将el中的内容全部放到内存中
        // 文档碎片 内存中的DOM节点
        let fragment = document.createDocumentFragment()
        let firstChild
        while (firstChild = el.firstChild) {
            fragment.appendChild(firstChild)
        }
        return fragment // 内存中的节点
    }

    compile(fragment) {
        // 需要递归
        let childNodes = fragment.childNodes
        // console.log(childNodes)

        Array.from(childNodes).forEach(node => {
            if (this.isElementNode(node)) {
                // 是元素节点, 还需要继续深入的检查
                // 这里需要编译元素
                // console.log('element', node)
                
                this.compileElement(node)
                this.compile(node)
            } else {
                // 文本节点
                // 这里需要编译文本
                // console.log('text', node)

                this.compileText(node)
            }
        })
    }

    compileElement(node) {
        // 带v-model v-
        let attrs = node.attributes // 去除当前节点的属性
        // console.log(attrs)

        Array.from(attrs).forEach(attr => {
            // console.log(attr, attr.name, attr.value)
            
            // 判断属性名字是不是包含v-
            let attrName = attr.name

            if (this.isDirective(attrName)) {
                // 取到对应的值放到节点中
                let expr = attr.value
                
                // v-model v-text v-html => model text html
                // let [, type] = attrName.split('-')
                let type = attrName.slice(2)

                // node this.vm.$data expr
                CompileUtil[type](node, this.vm, expr)
            }
        })
    }

    compileText(node) {
        // 带{{}}
        let expr = node.textContent // 取文本中的内容
        // console.log(text)

        let reg = /\{\{([^}]+)\}\}/g // {{a}} {{b}} {{c}}

        if (reg.test(expr)) {
            // node this.vm.$data text
            CompileUtil['text'](node, this.vm, expr)
        }
    }
}

CompileUtil = {
    getVal(vm, expr) { // 获取实例上对应的数据
        expr = expr.split('.') // [a, z, x, c, v]
        return expr.reduce((prev, next) => { // vm.$data.a.z.x.c.v
            return prev[next]
        }, vm.$data)
    },

    setVal(vm, expr, value) { // [message.a.z]
        expr = expr.split('.')
        // 收敛
        return expr.reduce((prev, next, currentIndex) => { // vm.$data.a.z.x.c.v
            if (currentIndex === expr.length - 1) {
                return prev[next] = value
            }
            return prev[next]
        }, vm.$data)
    },

    getTextVal(vm, expr) { // 获取编译文本后的结果
        return expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => { // match: 匹配字符, key: 捕获分组()中内容, index: 索引,source: 原字符串 
            // console.log(arguments)
            return this.getVal(vm, arguments[1])
        })
    },

    // html() {

    // },

    text(node, vm, expr) { // 文本处理
        let updateFn = this.updater['textUpdater']
        // {{msg.a}} => hello world
        let value = this.getTextVal(vm, expr)

        // {{a}} {{b}}
        expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => { // match: 匹配字符, key: 捕获分组()中内容, index: 索引,source: 原字符串 
            new Watcher(vm, arguments[1], (newValue) => {
                // 如果数据变化了, 文本节点需要重新获取依赖的属性更新文本中的内容
                updateFn && updateFn(node, this.getTextVal(vm, expr))
            })
        })

        updateFn && updateFn(node, value)
    },

    model(node, vm, expr) { // 输入框处理
        let updateFn = this.updater['modelUpdater']
        // vm.$data[expr] = vm.$data['msg.a']
        // 'msg.a' => [msg, a] vm.$data.msg.a
        // 这里应该加一个监控 数据变化了 应该调用watch的callback
        new Watcher(vm, expr, (newValue) => {
            // 当值变化后会调用cb 将新值传递过来 (update)
            updateFn && updateFn(node, this.getVal(vm, expr))
        })

        node.addEventListener('input', e => {
            let newValue = e.target.value
            this.setVal(vm, expr, newValue)
        })

        updateFn && updateFn(node, this.getVal(vm, expr))
    },

    updater: {
        // htmlUpdater() {

        // },

        // 文本更新
        textUpdater(node, value) {
            node.textContent = value
        },

        // 输入框更新
        modelUpdater(node, value) {
            node.value = value
        },
    }
}