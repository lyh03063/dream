/**
 * 受保护的路由
 */
import React from 'react';
import {Route, Redirect} from '../react-router-dom';
// import {Route} from 'react-router-dom';
// 用类的声明方式比较冗余，遂使用函数式组件
// export default class Protected extends Component{
//     render () {
//         return 'hello'
//     }
// }
// {component: Component, ...rest} 表示将component结构赋值给Component，其他的参数赋值给rest
export default function ({component: Component, ...rest}) {
    return (
        <Route {...rest} render={(props) => {
            return (localStorage.getItem('logined') ?  <Component ></Component> 
            : <Redirect to={{"pathname": '/login', "state":{from: props.location.pathname}}} ></Redirect>)
        }}/>
        // localStorage.getItem('logined') ?  <Component ></Component>
    )
}
