### Stream 模块学习(四)

> 手写一个writeStream模块，深入理解代码运行原理

### 创建类,定义相关参数

```javascript
let EventEmitter = require('events')
let fs = require('fs')
let path = require('path')

class WriteStream extends EventEmitter {
    constructor (path, options) {
        super()
        this.path = path
        this.flags = options.flags || 'w'
        this.mode = options.mode || '0o666'
        this.autoClose = options.autoClose || true
        this.highWaterMark =options.highWaterMark || 16 * 1024// 默认写16k
        this.encoding = options.encoding || 'utf8'
        this.start =options.start || 0 //从那个为止开始往内部写
        
        this.fd = null //保存文件描述符
        // 可写流 要有一个缓存区，当正在写入文件时，内容要写入缓存区中
        //  源码中是一个数据链表
        this.buffers = []

        // 标识 是否正在写入
        this.writing = false

        // 是否满足触发drain事件
        this.needDrain = false

        // 记录写入的为止
        this.pos = 0

        //记录 缓存区的大小
        this.length = 0
    }
}
```

### 实现open方法和文件关闭方法

> 这里里的open方法和之前的几篇文章里的一样

```javascript
class WriteStream extends EventEmitter {
    constructor (path, options) {
        super()
        this.path = path
        this.flags = options.flags || 'w'
        this.mode = options.mode || '0o666'
        this.autoClose = options.autoClose || true
        this.highWaterMark =options.highWaterMark || 16 * 1024// 默认写16k
        this.encoding = options.encoding || 'utf8'
        this.start =options.start || 0 //从那个为止开始往内部写
        
        this.fd = null //保存文件描述符
        // 可写流 要有一个缓存区，当正在写入文件时，内容要写入缓存区中
        //  源码中是一个数据链表
        this.buffers = []

        // 标识 是否正在写入
        this.writing = false

        // 是否满足触发drain事件
        this.needDrain = false

        // 记录写入的为止
        this.pos = 0

        //记录 缓存区的大小
        this.length = 0
        this.open()
    }
    /**
     * @description 关闭文件
     */
    destory () {
        // 判断 如果文件没有打开的话就直接触发close事件，如果打开的话就先使用fs.close关闭文件，然后触发close事件
        if (typeof this.fd !== 'number') return this.emit('close');
        fs.close(this.fd, () => this.emit('close'))
    }
    /**
     * @description 打开文件方法
     */
    open () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                // 触发error事件
                this.emit('error', err)
                // 如果需要自动关闭文件，就关闭文件
                if (this.autoClose) this.destory()
                return 
            }
            // 文件打开成功的话，保存fd 并触发open事件
            this.fd = fd
            this.emit('open')
        })
    }
    
}
module.exports = WriteStream
```

### 实现文件写入方法

```javascript
//手写一个 writeStream模块。深入理解实现原理
let EventEmitter = require('events')
let fs = require('fs')
let path = require('path')

class WriteStream extends EventEmitter {
    constructor (path, options) {
        super()
        this.path = path
        this.flags = options.flags || 'w'
        this.mode = options.mode || '0o666'
        this.autoClose = options.autoClose || true
        this.highWaterMark =options.highWaterMark || 16 * 1024// 默认写16k
        this.encoding = options.encoding || 'utf8'
        this.start =options.start || 0 //从那个为止开始往内部写
        
        this.fd = null //保存文件描述符
        // 可写流 要有一个缓存区，当正在写入文件时，内容要写入缓存区中
        //  源码中是一个数据链表
        this.buffers = []

        // 标识 是否正在写入
        this.writing = false

        // 是否满足触发drain事件
        this.needDrain = false

        // 记录写入的为止
        this.pos = 0

        //记录 缓存区的大小
        this.length = 0
        this.open()
    }
    /**
     * @description 关闭文件
     */
    destory () {
        // 判断 如果文件没有打开的话就直接触发close事件，如果打开的话就先使用fs.close关闭文件，然后触发close事件
        if (typeof this.fd !== 'number') return this.emit('close');
        fs.close(this.fd, () => this.emit('close'))
    }
    /**
     * @description 打开文件方法
     */
    open () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                // 触发error事件
                this.emit('error', err)
                // 如果需要自动关闭文件，就关闭文件
                if (this.autoClose) this.destory()
                return 
            }
            // 文件打开成功的话，保存fd 并触发open事件
            this.fd = fd
            this.emit('open')
        })
    }
    /**
     * @description 文件写入方法
     * @param {String || Buffer} chunk 要写入的内容
     * @param {String}          encoding 写入文件的编码，默认utf8
     * @param {boolean}         return   返回一个布尔对象
     */
    write (chunk, encoding = this.encoding, callback) {
        chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        // write 返回一个boolean类型
        this.length += chunk.length //1 2 3
        let res = this.length < this.highWaterMark // 比较是否达到了缓存区的大小
        this.needDrain = !res
        // 如果文件正在写入，就把后来的放入缓存区
        if (this.writing) {
            this.buffers.push({
                encoding,
                chunk,
                callback
            })
        } else {
            // 专门用来将内容放入文件内存 写入到文件内
            this.writing = true
            // 私有的写入方法
            this._write(chunk, encoding, ()=>{
                // 这是一个清空缓存区的方法，稍后实现
                this.clearBuffer()
            })
        }
        return res
    }
    _write (chunk, encoding, callback) {
        // 首先进行判断， 如果说文件没有打开，帮顶一个事件，监听open，等待open事件触发以后，回掉自己
        if (typeof this.fd !== 'number') {
            return this.once('open', () => this._write(chunk, encoding, callback))
        }
        
        fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, byteWriten) => {
            // 更新缓存区的大小，更新定位， 回调清空缓存区方法
            this.length -= byteWriten
            this.pos += byteWriten
            this.writing = false 
            // 这里的回调是清空缓存去
            callback()
        })
    }
    
}
module.exports = WriteStream
```

### 实现私有写入方法

```javascript
//手写一个 writeStream模块。深入理解实现原理
let EventEmitter = require('events')
let fs = require('fs')
let path = require('path')

class WriteStream extends EventEmitter {
    constructor (path, options) {
        super()
        this.path = path
        this.flags = options.flags || 'w'
        this.mode = options.mode || '0o666'
        this.autoClose = options.autoClose || true
        this.highWaterMark =options.highWaterMark || 16 * 1024// 默认写16k
        this.encoding = options.encoding || 'utf8'
        this.start =options.start || 0 //从那个为止开始往内部写
        
        this.fd = null //保存文件描述符
        // 可写流 要有一个缓存区，当正在写入文件时，内容要写入缓存区中
        //  源码中是一个数据链表
        this.buffers = []

        // 标识 是否正在写入
        this.writing = false

        // 是否满足触发drain事件
        this.needDrain = false

        // 记录写入的为止
        this.pos = 0

        //记录 缓存区的大小
        this.length = 0
        this.open()
    }
    /**
     * @description 关闭文件
     */
    destory () {
        // 判断 如果文件没有打开的话就直接触发close事件，如果打开的话就先使用fs.close关闭文件，然后触发close事件
        if (typeof this.fd !== 'number') return this.emit('close');
        fs.close(this.fd, () => this.emit('close'))
    }
    /**
     * @description 打开文件方法
     */
    open () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                // 触发error事件
                this.emit('error', err)
                // 如果需要自动关闭文件，就关闭文件
                if (this.autoClose) this.destory()
                return 
            }
            // 文件打开成功的话，保存fd 并触发open事件
            this.fd = fd
            this.emit('open')
        })
    }
    /**
     * @description 文件写入方法
     * @param {String || Buffer} chunk 要写入的内容
     * @param {String}          encoding 写入文件的编码，默认utf8
     * @param {boolean}         return   返回一个布尔对象
     */
    write (chunk, encoding = this.encoding, callback) {
        chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        // write 返回一个boolean类型
        this.length += chunk.length //1 2 3
        let res = this.length < this.highWaterMark // 比较是否达到了缓存区的大小
        this.needDrain = !res
        // 如果文件正在写入，就把后来的放入缓存区
        if (this.writing) {
            this.buffers.push({
                encoding,
                chunk,
                callback
            })
        } else {
            // 专门用来将内容放入文件内存 写入到文件内
            this.writing = true
           // 文件写入
            this._write(chunk, encoding, ()=>{
                // 清空缓存区方法
                this.clearBuffer()
            })
        }
        return res
    }
    /**
     * @description 私有写入方法
     * @param {buffer || String} chunk 需要写入的内容
     * @param {String} encoding  写入文件的编码，默认为utf8
     * @param {Function} callback 写入完成以后的回调函数
     */
    _write (chunk, encoding, callback) {
        // 首先进行判断， 如果说文件没有打开，帮顶一个事件，监听open，等待open事件触发以后，回掉自己
        if (typeof this.fd !== 'number') {
            return this.once('open', () => this._write(chunk, encoding, callback))
        }
        
        fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, byteWriten) => {
            // 更新缓存区的大小，更新定位， 回调清空缓存区方法
            this.length -= byteWriten
            this.pos += byteWriten
            this.writing = false 
            // 这里的回调是清空缓存去
            callback()
        })
    }
}
module.exports = WriteStream
```

### 实现情况缓存方法

```javascript
//手写一个 writeStream模块。深入理解实现原理
let EventEmitter = require('events')
let fs = require('fs')
let path = require('path')

class WriteStream extends EventEmitter {
    constructor (path, options) {
        super()
        this.path = path
        this.flags = options.flags || 'w'
        this.mode = options.mode || '0o666'
        this.autoClose = options.autoClose || true
        this.highWaterMark =options.highWaterMark || 16 * 1024// 默认写16k
        this.encoding = options.encoding || 'utf8'
        this.start =options.start || 0 //从那个为止开始往内部写
        
        this.fd = null //保存文件描述符
        // 可写流 要有一个缓存区，当正在写入文件时，内容要写入缓存区中
        //  源码中是一个数据链表
        this.buffers = []

        // 标识 是否正在写入
        this.writing = false

        // 是否满足触发drain事件
        this.needDrain = false

        // 记录写入的为止
        this.pos = 0

        //记录 缓存区的大小
        this.length = 0
        this.open()
    }
    /**
     * @description 关闭文件
     */
    destory () {
        // 判断 如果文件没有打开的话就直接触发close事件，如果打开的话就先使用fs.close关闭文件，然后触发close事件
        if (typeof this.fd !== 'number') return this.emit('close');
        fs.close(this.fd, () => this.emit('close'))
    }
    /**
     * @description 打开文件方法
     */
    open () {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) {
                // 触发error事件
                this.emit('error', err)
                // 如果需要自动关闭文件，就关闭文件
                if (this.autoClose) this.destory()
                return 
            }
            // 文件打开成功的话，保存fd 并触发open事件
            this.fd = fd
            this.emit('open')
        })
    }
    /**
     * @description 文件写入方法
     * @param {String || Buffer} chunk 要写入的内容
     * @param {String}          encoding 写入文件的编码，默认utf8
     * @param {boolean}         return   返回一个布尔对象
     */
    write (chunk, encoding = this.encoding, callback) {
        chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        // write 返回一个boolean类型
        this.length += chunk.length //1 2 3
        let res = this.length < this.highWaterMark // 比较是否达到了缓存区的大小
        this.needDrain = !res
        // 如果文件正在写入，就把后来的放入缓存区
        if (this.writing) {
            this.buffers.push({
                encoding,
                chunk,
                callback
            })
        } else {
            // 专门用来将内容放入文件内存 写入到文件内
            this.writing = true
            this._write(chunk, encoding, ()=>{
                this.clearBuffer()
            })
        }
        return res
    }
    /**
     * @description 情况缓存区方法
     */
    clearBuffer () {
        // 使用shift拿到一个buffer
        let buffer = this.buffers.shift()
        // 判断对象是否存在，存在则继续写入，如果不存在，则调用callback，触发drain事件
        if (buffer) {
            this._write(buffer.chunk, buffer.encoding, ()=>{
                //回调函数继续调用自己，直到缓存区没有文件
                this.clearBuffer()
            })
        } else {
            // 判断是否需要触发drain事件
            if (this.needDrain) {
                this.needDrain = false
                this.emit('drain')
            }
            //这里的callback是我们在write那里传的回调函数
            callback()
        }
    }
    /**
     * @description 私有写入方法
     * @param {buffer || String} chunk 需要写入的内容
     * @param {String} encoding  写入文件的编码，默认为utf8
     * @param {Function} callback 写入完成以后的回调函数
     */
    _write (chunk, encoding, callback) {
        // 首先进行判断， 如果说文件没有打开，帮顶一个事件，监听open，等待open事件触发以后，回掉自己
        if (typeof this.fd !== 'number') {
            return this.once('open', () => this._write(chunk, encoding, callback))
        }
        
        fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, byteWriten) => {
            // 更新缓存区的大小，更新定位， 回调清空缓存区方法
            this.length -= byteWriten
            this.pos += byteWriten
            this.writing = false 
            // 这里的回调是清空缓存去
            callback()
        })
    }
}

module.exports = WriteStream

```

### 结束语

> 以上就是一个简单的写入流的实现了，代码量很少，但是足够我们了解写入流的运行原理，愿我们都能做一个透彻的咸鱼.....