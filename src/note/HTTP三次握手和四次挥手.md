### HTTP三次握手和四次挥手

> 每当建立一个TCP/IP连接的时候都要经历3次握手，这是为了保证建立一个可靠的连接。

### 三次握手

> 客户端向服务器发请求，服务器接收请求，服务器接收请求之后发送一个连接标志，客户端接收连接标志之后也向服务器发送一个连接标志，至此连接完成。
>
> 生活中的栗子： 小明和小丽的故事。话说有一天小丽给小明说我喜欢你（syn,一次握手）  小明听到小丽的的表白后说知道了，我也喜欢你，也说了声（ack, syn, 二次握手） ,小丽听到小名说喜欢自己以后，说我知道了 （ack, 三次握手）

- 第一次握手：主机A发送位码为syn＝1,随机产生seq number=1234567的数据包到服务器，主机B由SYN=1知道，A要求建立联机；

- 第二次握手：主机B收到请求后要确认联机信息，向A发送ack number=(主机A的seq+1),syn=1,ack=1,随机产生seq=7654321的包
- 第三次握手：主机A收到后检查ack number是否正确，即第一次发送的seq number+1,以及位码ack是否为1，若正确，主机A会再发送ack number=(主机B的seq+1),ack=1，主机B收到后确认seq值与ack=1则连接建立成功。

### 四次挥手

> 为什么有4次挥手呢，4次挥手的作用就是断开连接，之所以要断开连接是因为TCP/IP协议是要占用端口的，而计算机的端口是有限的，所以一次传输完成之后是要断开连接的，断开连接的方式就是4次挥手。
>
> 还是小明和小丽的故事：话说小名和小丽在一起后小明发现自己零花钱不够花了，也没有时间玩游戏了，然后就给小丽说我们分手把(FIN, 第一次挥手)，这个时候小丽可能很难过说知道了(ack， 第二次挥手)，，很久很久都没有说话，过了很久小丽说我同意分手了（FIN， 第三次挥手），这个时候小明说，管你了，我早就和你分手了(ack，第四次挥手)
>
> 由于 TCP 连接是全双工的，因此每个方向都必须单独进行关闭。这个原则是当一方完成它的数据发送任务后就能发送一个FIN 来终止这个方向的发送通道。收到一个 FIN 只意味着这一方向上没有数据流动，一个 TCP 连接在收到一个 FIN 后仍能发送数据。首先进行关闭的一方将执行主动关闭，而另一方执行被动关闭。

- 客户端 A 发送一个 FIN ，用来关闭客户 A 到服务器 B 的数据传送。  
- 服务器 B 收到这个 FIN ，它发回一个 ACK ，确认序号为收到的序号加 1。和 SYN 一样，一个FIN 将占用一个序号。  
- 服务器 B 关闭与客户端 A 的连接，发送一个 FIN 给客户端 A 。  
- 客户端 A 发回 ACK 报文确认，并将确认序号设置为收到序号加 1 。

### HTTP 请求响应常见状态码

- 100~199：表示成功接收请求，要求客户端继续提交下一次请求才能完成整个处理过程。
- 200~299：表示成功接收请求并已完成整个处理过程。常用200
- 300~399：为完成请求，客户需进一步细化请求。例如：请求的资源已经移动一个新地址、常用302（意味着你请求我，我让你去找别人）,307和304（我不给你这个资源，自己拿缓存）
- 400~499：客户端的请求有错误，常用404（意味着你请求的资源在web服务器中没有）403（服务器拒绝访问，权限不够）
- 500~599：服务器端出现错误，常用500