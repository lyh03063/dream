import React, {Component} from 'react';
import {Consumer} from './context'
let PathToReg = require('path-to-regexp')

export default class Route extends Component{
    render () {
        return (
            <Consumer>
                {
                    value => {
                        let {location: {pathname}} = value // 拿到hash 进行比较
                        // 拿到传入的path，组件，并手动大写(组件需要首字母大写)
                        let {path = '/', component: Component, exact = false} = this.props
                        let keys = []
                        let reg = PathToReg(path, keys, {end: exact})
                        let result = path.match(reg)
                        // 解析出来参数，然后传给子组件，子组件就可以继续匹配
                        let props = {
                            location: value.location,
                            history: value.history
                        }
                        // 使用reg处理路由
                        if (reg.test(pathname)) {
                            console.log('result', result)
                            // 将解析的props传递下去
                            return <Component {...props}></Component>
                        } else {
                            return null
                        }
                    }
                }
            </Consumer>
        )
    }
}