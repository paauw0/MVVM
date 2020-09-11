class Observer {
    constructor(data) {
        this.observe(data)
    }

    observe(data) {
        if (!data || typeof data !== 'object') {
            return
        }

        Object.keys(data).forEach(key => {
            // 劫持
            this.defineReactive(data, key, data[key])
            this.observe(data[key]) // 深度递归劫持
        })
    }

    // 定义响应式
    defineReactive(obj, key, value) {
        let that = this
        let dep = new Dep() // 每个变化的数据 都会对应一个数组 这个数组是存放所有更新的操作
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get() {
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set(newValue) {
                if (newValue !== value) {
                    // 这里的this不是实例
                    that.observe(newValue) // 如果式对象继续劫持
                    value = newValue
                    dep.notify() // 通知所有人 数据更新了
                }
            }
        })
    }
}

class Dep {
    constructor() {
        // 订阅的数组
        this.subs = []
    }

    addSub(watcher) {
        this.subs.push(watcher)
    }

    notify() {
        this.subs.forEach(watcher => watcher.update())
    }
}