var tcp=require("net");
var parser=require("http-parser-js").HTTPParser;
var U=require("url");
var dns=require("dns");
var dnspacket=require("./zdns.js");
var dgram = require('./udpslow.js'); 
var base32 = require("./base32.js");

var zhybaseencode=base32.encode;
var zhybasedecode=base32.decode;


var ZDNSALIVE=0;

var DNS=
[

[["8.8.8.8",0.7],["9.9.9.9",0.3]],
[["1.2.4.8",1]],
[["210.2.4.8",1]],
[["178.128.57.53",1]],
[["37.235.1.174",1]],
[["37.235.1.177",1]],
[["156.154.70.1",1]],
[["156.154.71.5",1]],
[["203.112.2.4",1]],
[["63.223.94.66",1]],
[["101.6.6.6",1]],
[["202.141.162.123",1]],
[["208.67.222.222",1]],
[["208.67.220.220",1]],
[["208.67.220.222",1]],
[["208.67.222.220",1]],



];


var hbman=new heartbeatManager(DNS);

/*
setInterval(()=>{
	console.log("当前空闲DNS组"+hbman.getasetofdns());
},2000)*/


function httpencode(p,body){
	
	let packet=parser.methods[p.info.method]+" "+p.info.url+" HTTP/"+p.info.versionMajor+"."+p.info.versionMinor+"\r\n";
	for(var i in p.info.headers)
		packet+=(i%2==0?p.info.headers[i]+": ":p.info.headers[i]+"\r\n");
	packet+="\r\n\r\n";
	
	return Buffer.concat([Buffer.from(packet),body])
	
	
}
function hostparse(str,callback){
	let arr=str.split(":");
	if(arr.length<=0)callback(undefined);
	else if(arr.length==1){
		
		/*dns.resolve4(arr[0],(err,r)=>{
			callback({host:arr[0],port:80,ip:r?r[0]:arr[0]});
		
	});		*/	
			callback({host:arr[0],port:80,ip:arr[0]});
		
		}
	else if(arr.length>=2)
	{
	/*		dns.resolve4(arr[0],(err,r)=>{		
			callback({host:arr[0],port:parseInt(arr[1]),ip:r?r[0]:arr[0]});
		});
		*/
				callback({host:arr[0],port:parseInt(arr[1]),ip:arr[0]});
	
	}	
	
}

tcp.createServer((req)=>{
	req.on("close",()=>{if(req.client){req.client.close();req.client=undefined;req.tunnel=false;req.end()}})
	req.on("error",()=>{/*if(req.client)req.client.close();req.client=undefined;*/})
	req.on("end",()=>{if(req.client){req.client.close();req.client=undefined;req.tunnel=false;req.end()}})
	req.on("data",(data)=>{
	
	let p=new parser("REQUEST");
	let body=Buffer.allocUnsafe(0);
	p[2]=(b)=>{
		body=b;
	};
	p[3]=()=>{
		var https=false;
		let getOption=(op)=>{
		let loc=p.info.headers.indexOf(op);
		if(loc%2==0)return loc;else return -1;
		}
		if(p.info.method==1)//GET
		{
			
			p.info.url=U.parse(p.info.url).path;
		}
		else
			if(p.info.method==5)//CONNECT
		{
				https=true;
		}
		p.info.headers[getOption("Proxy-Connection")]="Connection";
		if(getOption("Connection")>=0)
		p.info.headers[getOption("Connection")+1]="Close";
	
		
	let rawsend=httpencode(p,body);
	
	
		hostparse(p.info.headers[getOption("Host")+1],(host)=>{
		if(req.client){req.client.close();req.client=undefined;}
		//totest:64.6.64.6
		//ok:["8.8.8.8",0.2],["119.29.29.29",0.2],["182.254.116.116",0.2],["9.9.9.9",0.2],["119.28.28.28",0.1],["1.2.4.8",0.1]
		
		//question:["208.67.222.220",0.3]
		
		
//	new tcpclientoverzdns("proxyoverdns.math.cat",[["8.8.8.8",0.2],["119.29.29.29",0.2],["182.254.116.116",0.2],["9.9.9.9",0.2],["119.28.28.28",0.1],["1.2.4.8",0.1]],(client)=>{
	new tcpclientoverzdns("proxyoverdns.math.cat",hbman,(client)=>{
				
	//if(host.ip=="www.ygu.edu.cn")
		
			client.connect(host.port,host.ip,(err)=>{
				if(err)
				{console.log("连接失败");req.end();return;}
			
				
					if(https)
			{
				try{
				req.write("HTTP/1.1 200 Connection Established\r\n\r\n");
			req.tunnel=true;
				}catch(e){req.tunnel=false;}
		//	req.end();
			}else{
				//console.log(rawsend+"");
				let tosend=Buffer.concat([rawsend,Buffer.alloc(0)]);
				try{
				if(rawsend.copy) client.write(tosend);
				}catch(e){}
				//console.log(Buffer.from(rawsend)+"");
			
			}
			//console.log("connect");
			
			//console.log(rawsend);
			req.client=client;
			
			client.ondata((data)=>{
			//	console.log(data+"");
				
				req.write(data);
				
			
				//setTimeout(()=>req.end(),1000);
				//client.end();
			});
			client.onend(()=>{
				//if(req.tunnel)
		req.client=undefined;
		req.tunnel=false;
		
			try{	
		req.end();
			}catch(e){};

			})
			});
			
			
			});
			
		
		});
		
		
	//	let client=new net.Socket();
//		client.connect(
	//	(httpencode(p,body)+"");
		
	};
	//console.log(req.tunnel?"true":"false")
	if(req.tunnel){
	let tosend=Buffer.concat([data,Buffer.alloc(0)]);
		
	req.client.write(tosend);
			
	}
	else
	p.execute(data,0,data.length);

	
	
	});
	
	
}).listen(8080);

function heartbeatManager(DNSset){
	this.heartbeats={};
	this.DNSset=DNSset;
	
		
	this.getheartbeat=(dns)=>{
		if(!this.heartbeats[dns])
			this.heartbeats[dns]=new heartbeat(dns);
		
		return this.heartbeats[dns];
	}
	this.getDNShot=(dns)=>{//获取某个dns的繁忙状态
		
		return this.heartbeats[dns].getactive();
	}
	this.getasetofdns=()=>{//优先获取空闲的DNS组
		let sele=[];
		for(let i=0;i<this.DNSset.length;i++)
		{
			let sumactived=0;
			for(let j=0;j<this.DNSset[i].length;j++)
				
			sumactived+=this.getDNShot(this.DNSset[i][j][0])
			
			sele.push({index:i,hot:sumactived});
		}
		sele.sort((a,b)=>{return a.hot-b.hot});
		
		return this.DNSset[sele[0].index];
	}
	
	for(let i=0;i<this.DNSset.length;i++)
		for(let j=0;j<this.DNSset[i].length;j++)
			this.getheartbeat(this.DNSset[i][j][0]);
	
}

function tcpclientoverzdns(domain,hbmanager,created){
	
	this.SETid=10000+parseInt(Math.random()*10000);//"一组"通信桥的1d
	this.zdnsSET=[];//新增多桥支持
	
	var dnsservers=hbmanager.getasetofdns();
	for(var i in dnsservers)
	{
		
		let cli=new zdns_client(domain,dnsservers[i][0],hbmanager.getheartbeat(dnsservers[i][0]));
		cli.support=dnsservers[i][1];
		this.zdnsSET.push(cli);
	//this.zdnsSET[i].send(encode("applyfor|"+this.SETid));//所有桥全部声明自己是属于同一个组的
	
	}
	
	
	this.partdatas={};
	this.endquests={};
	
	
	function encode(action,data){
		if(!data)data=Buffer.alloc(0);
	let buf=Buffer.alloc(2+action.length+2+data.length);
	let offset=0;
	buf.writeUInt16BE(action.length,offset);offset+=2;
	Buffer.from(action).copy(buf,offset);offset+=action.length;
	buf.writeUInt16BE(data.length,offset);offset+=2;
	data.copy(buf,offset);offset+=data.length;
	return buf;
	}
	this.ip="";
	this.port=-1;
	this.connected=false;
	this.retrytime=2;
		
	this.actived=1000;
	
	
	this.gctimer=	setInterval(()=>{
		if(this.actived<=0)return;
	/*	let cb=this.connectokcallback?this.connectokcallback:()=>{};
		if(!this.connected && this.ip && this.port)
		{
			
			this.connect(this.port,this.ip,cb);
		this.retrytime--;
		
	
		}
		if(this.retrytime<=0){this.close();cb("error");}
	*/
	
		this.actived-=30;
		if(this.actived<=0)
			this.connected=false;
		
	},500);
	
	function decode(raw){
		let ret={action:"",data:Buffer.alloc(0)};
		let offset=0;
		let actionlen=raw.readUInt16BE(offset);offset+=2;
		ret.action=raw.slice(offset,offset+actionlen)+"";offset+=actionlen;
		let datalen=raw.readUInt16BE(offset);offset+=2;
		ret.data=raw.slice(offset,offset+datalen);offset+=datalen;
		return ret;
	}
	this.connect=function(port,ip,ok){
		let comids=[];
		for(var c in this.zdnsSET)
			comids.push(this.zdnsSET[c].comid+":"+this.zdnsSET[c].support);
		
		if(!this.connected){
		this.writecount=0;
		this.partdata={};
		this.endquests={};
console.log("开始连接 "+ip+":"+port);
		try{
		this.zdnsSET[0].send(encode("connect|"+ip+"|"+port+"|"+comids.join(",")+"|"+this.SETid));	
		}catch(e){};
		
		this.ip=ip;this.port=port;
		if(!this.connectokcallback)
			this.connectokcallback=ok;
		}
	}
	this.close=function(){
		this.actived=-1;
		this.retrytime=-1;
		this.connectokcallback=undefined;
		this.connected=false;
		clearInterval(this.gctimer);
		console.log("关闭连接",this.ip+":"+this.port)
		delete this;
	//	this.zdns.send(encode("close"));
		
	}
	this.writedataid=0;
	this.writecount=0;
	
	this.write=function(data){//分段发送
	//	console.log(Buffer.from(data)+"");
	//console.log("?");
	if(this.connected)
	{
		let tosent=[];
		this.actived=1000;
		let splitlen=150;
		
		let partscount=(data.length%splitlen==0)?data.length/splitlen:(parseInt(data.length/splitlen)+1);
		if(partscount<this.zdnsSET.length)
		for(let i=0;i<(this.zdnsSET.length-partscount);i++)
				tosent.push(Buffer.alloc(0));
		
		for(let i=0;i<=data.length;i+=splitlen)
			tosent.push(data.slice(i,i+splitlen));
		
		for(var i in tosent)
		{this.zdnsSET[this.writecount%this.zdnsSET.length].send(encode("s|"+this.writedataid+"|"+i+"|"+tosent.length,Buffer.from(tosent[i])));
		this.writecount++;
		}
		
		this.writedataid++;
		//this.zdnsSET[0].send(encode("send",Buffer.from(data)));
	console.log("发送数据",data.length,this.ip+":"+this.port);
	
	}


	}
	this.write2=function(data){//直接发送
	//	console.log(Buffer.from(data)+"");
	//console.log("?");
	if(this.connected)
	{
	this.zdnsSET[0].send(encode("send",Buffer.from(data)));
	
	console.log("发送数据",data.length,this.ip+":"+this.port);
	
	}


	}
	
	
	
	/*this.handleapply=(id,setid,count)=>{
		if(setid==this.SETid)
			this.zdnsSET[count].applied=true;
		let succount=0;
		for(let i=0;i<this.zdnsSET.length;i++)
		if(this.zdnsSET[i].applied)	
		succount++;
		console.log(count+" 通信桥已成功建立");
		
		
		//if(succount==this.zdnsSET.length)
		
		if(succount==1)//一个通信桥足以完成通信
				created(this);
		
	}*/
		//this.coxx=0;
	this.handlezdnsrecv=(data)=>{
	
		
	let ret=decode(data);
	//console.log(ret.data.length);
	
	//console.log(ret);
				
		switch(ret.action){
			//case "connected":
			
			case "connected":
	//if(!this.connected){
			this.connected=true;
			this.actived=1000;
			this.retrytime=2;
		
	console.log(this.ip+":"+this.port+" 连接成功");
	if(this.connectokcallback)
			this.connectokcallback();
		//}
			break;
			case "data":
			if(this.connected){		
			this.actived=1000;
			
			if(this.callback)
				this.callback(ret.data);
			
//this.coxx+=ret.data.length;
//console.log(ret.data+"");
			console.log(this.ip+":"+this.port+" 收到数据"+ret.data.length/*,data+""*/);
			}
			break;

			/*case "end":
		
			break;*/
			default:
				/*if(ret.action.substr(0,12)=="applysuccess")
				{
					let pass=ret.action.split("|");pass.shift();
				this.handleapply(...pass);
				}
			else*/
			
			if(ret.action.substr(0,4)=="end|"){
			if(this.connected){
				let acts=ret.action.split("|");
				if(!this.endquests[acts[3]])
					this.endquests[acts[3]]={};
			this.endquests[acts[3]][acts[1]]=true;
			
			if(Object.keys(this.endquests[acts[3]]).length==parseInt(acts[2]))
			{
			delete this.endquests[acts[3]];
			
			console.log(this.ip+":"+this.port+" 连接结束");
			if(this.endcallback)
				this.endcallback();
			this.connected=false;
			}
			
			}
			}
			
			else if(ret.action.substr(0,2)=="d|")//datapart
			if(this.connected){
				
				let acts=ret.action.split("|");
				let partid=parseInt(acts[1]);
				let partscount=parseInt(acts[2]);
				let dataid=parseInt(acts[3]);
					if(!this.partdatas[dataid])
					this.partdatas[dataid]={};
				this.partdatas[dataid][partid]=ret.data;
				let fulldata=undefined;
				//console.log(Object.keys(this.partdatas).length,partscount,partid,dataid);
				
					console.log("拼接",dataid,Object.keys(this.partdatas[dataid]).length,partscount,acts[4]);
			
			
				if(Object.keys(this.partdatas[dataid]).length>=partscount)//所有分块数据已就绪
				{
					//开始拼接
					let arr=[];
					for(let i=0;i<partscount;i++)
						arr[i]=this.partdatas[dataid][i];
					
					fulldata=Buffer.concat(arr);
					delete this.partdatas[dataid];
					
					console.log(dataid,"拼接成功");
				}
				
				
					
			this.actived=1000;
			
			if(this.callback)
				if(fulldata)
				this.callback(fulldata);
			
			
			}
			break;
			
		}
		
		
		
	};
	for(var i in this.zdnsSET)
		this.zdnsSET[i].recv(this.handlezdnsrecv);
		
	this.ondata=function(f){
		this.callback=f;
	}
	this.onend=function(f){
		this.endcallback=f;
	}
	created(this);
	
}



function heartbeat(dnsip){//心跳类,实质上是zdns的统一接收器
	this.nowloc=0;
	this.clis=[];
	
	
	this.sendheartbeat=async ()=>{
		if(!this.clis[0])return;
		if(!this.clis[this.nowloc])return;
	
		let pk=new dnspacket();
	pk.id=10000+parseInt(Math.random()*10000);
			pk.flag_RD=1;
		let encode2=(buf)=>{
				let res=zhybaseencode(buf).replace(/\//g,"-").replace(/=/g,"_");
		let ret="";
		for(let i=0;i<res.length;i+=45)
			ret+=res.substring(i,i+45)+".";		
		return ret.substr(0,ret.length-1);
	
			}
		let sleep=(time)=>{
			return new Promise((y)=>setTimeout(y,time));
		}
		for(let i=0;i<10;i++){//预加载
		
		
		pk.queries=[];
		pk.queries.push({name:"HBl."+(this.clis[this.nowloc].dnspacketid+i)+"l."+this.clis[this.nowloc].comid+"lel"+this.clis[this.nowloc].packetcount+"l"+parseInt(Math.random()*100)+"-"+encode2(Buffer.from("zhy's heartbeat~"))+"."+this.clis[this.nowloc].domain+".",type:"TXT",class:1});
		let raw=pk.encode();
		this.clis[this.nowloc].sock.send(raw,0,raw.length,53,dnsip);
		await sleep(10);
		delete pk;
		}
		this.nowloc++;
		if(this.nowloc>=this.clis.length)
			this.nowloc=0;
	//	console.log("heartbeat");
	}
	this.getactive=()=>{//获取旗下所有cli的平均热度
		let sum=0;
		for(var i in this.clis)
			sum+=this.clis[i].actived;
		
	//	console.log(this.clis);
	
		
		return this.clis.length>0?(sum/this.clis.length):0;
	}	
	 this.manage=(zdns_cli)=>{//管理一个zdns客户端
		 this.clis.push(zdns_cli);
		
			
	 }
	 this.unmanage=(zdns_cli)=>{//脱离管理
		 this.clis.splice(this.clis.indexOf(zdns_cli));
		 
	 }




	this.timer=async ()=>{
	function sleep(){
		return new Promise((y)=>setTimeout(y,1000));
	}
	while(true){
		await this.sendheartbeat();	
		
		await sleep(1200);
		
	}
	};
	this.timer();
			
}
function zdns_client(domain,dnsserver,heartbeat){//需要一个心跳才能运作
	
	heartbeat.manage(this);
	
	this.comid=parseInt(1000000+Math.random()*10000000)+"";
	this.domain=domain;
	this.sock=dgram.createSocket('udp4',50);
	//sock.setEncoding("binary");
	this.dnspacketid=0;//for reliable 接收有一套ID机制
	this.dnspacketcache={};
	
	
	
	this.sendpacketid=0;//发送也有一套ID机制
	this.server_sendpacketid=0;
	this.sending={};//正在发送
	
		this.timer=setInterval(()=>{
			
			for(let i=0;i<this.server_sendpacketid-1;i++)
			if(this.sending[i])
				delete this.sending[i];
			
				
		let next=(this.server_sendpacketid+1)>60000?0:(this.server_sendpacketid+1);
			for(let i=next;i<next+5;i++)
			if(this.sending[i])
			this.dosend(this.sending[i][0],this.sending[i][1],i);
	
				this.actived-=30;
	if(this.actived<=0){
		clearInterval(this.timer);ZDNSALIVE--;console.log("当前通信桥总数量:"+ZDNSALIVE);
		heartbeat.unmanage(this);
		
delete this;
			}
		
		},400);
	
	function encode(buf,without){
		let res=zhybaseencode(buf).replace(/\//g,"-").replace(/=/g,"_");
		let ret="";
		for(let i=0;i<res.length;i+=250)
			ret+=res.substring(i,i+250)+".";		
		if(without)
		return ret.substr(0,ret.length-1);
		else
		return ret;
	}
	function decode(str){
		return zhybasedecode(str.replace(/\./g,"").replace(/-/g,"/").replace(/_/g,"="));
	}
	function decode2(str){
		return Buffer.from(str.replace(/\./g,"").replace(/-/g,"/").replace(/_/g,"="),"base64");
	
	}
	
	
	this.recv=(callback)=>{
		this.recvcallback=callback;
	}
	this.sock.on("error",()=>{console.log("error")})
	this.msgcallback=(msg,r)=>{
		let isHeartbeat=false;
		
		
	//	if(msg.length>160)
		
		//console.log(msg.length);
		
//try{		
		var pk=new dnspacket(msg);
//}catch(e){return;}
	if(pk.answers.length<=0 )return;
		
		if(pk.answers[0].data.length<20 &&  (pk.answers[0].data+"").substr(0,15)=="I ALWAYS EXIST.")
		isHeartbeat=true;
	
		
		if(isHeartbeat){

		this.server_sendpacketid=parseInt((pk.answers[0].data+"").substring(15,pk.answers[0].data.length-1));
	/*if(this.server_sendpacketid>0)
	console.log(this.server_sendpacketid);
	*/	
		return;}
	
		this.actived+=500;
		
		
		//let askid=parseInt(pk.answers[0].data.substr(0,pk.answers[0].data.length-1));
		let ids=pk.answers[0].data.substring(0,pk.answers[0].data.indexOf(".")).split("l");
		
		this.server_sendpacketid=parseInt(ids[0]);let askid=parseInt(ids[1]);
		
		//console.log("JIESHOU",askid);
	//	console.log(pk.answers[0].data+"");
			
		if(askid!=this.dnspacketid){
			this.dnspacketcache[askid]={msg:msg,r:r};
			let ks=Object.keys(this.dnspacketcache);
			
			if(ks.length>50)
			delete this.dnspacketcache[ks[0]];
			
			
			return;}
		
		this.dnspacketid++;if(this.dnspacketid>60000)this.com[this.comid].dnspacketid=0;

	
	//		console.log(pk.answers);
	
//		console.log(decode(pk.answers[0].data.slice(0,pk.answers[0].data.length-1).toString()));
//	console.log(pk.answers);
		let packets=[];

		if(this.recvcallback)
		{
			//console.log(pk.answers);
			
			let lastid=pk.answers[0].ttl;
			for(let i=0;i<pk.answers.length;i++)
			{
			if(pk.answers[i].ttl!=lastid )
			{
		//	console.log(Buffer.concat(packets)+"");
			this.recvcallback(Buffer.concat(packets));
		//console.log(packets.length);
				packets=[];
			lastid=pk.answers[i].ttl;
			}
			let start=0;
			if(i==0)
				start=pk.answers[i].data.indexOf(".")+1;

			packets.push(decode2(pk.answers[i].data.slice(start,pk.answers[i].data.length).toString()));
			
			
			}
		//	console.log(Buffer.concat(packets)+"")
			this.recvcallback(Buffer.concat(packets));

		}
	
		if(this.dnspacketcache[this.dnspacketid])
			this.msgcallback(this.dnspacketcache[this.dnspacketid].msg,this.dnspacketcache[this.dnspacketid].r);
		
		};
	this.sock.on("message",this.msgcallback);
	this.actived=2000;
	this.packetcount=0;
	this.send=(da)=>{
		
		//if(da.length>50)
			
			this.actived=1000;
	
		this.packetcount++;

		for(let k=0;k<da.length;k+=100){
		let data=da.slice(k,k+100);

		this.sendpacketid++;
		
		if(k+100>=da.length)
		this.sending[this.sendpacketid]=[data,"e",this.sendpacketid];
		else
		this.sending[this.sendpacketid]=[data,"p",this.sendpacketid];
		
		
		if(this.sendpacketid>60000)this.sendpacketid=0;
		
		}
	}
	
	this.dosend=(partdata,prefix,spkid)=>{
			//	console.log(da.length);



	let pk=new dnspacket();
	pk.id=10000+parseInt(Math.random()*10000);
	
	//pk.queries[0].class=this.dnspacketid;
	
	pk.flag_RD=1;
		let encode2=(buf)=>{
				let res=zhybaseencode(buf).replace(/\//g,"-").replace(/=/g,"_");
		let ret="";
		for(let i=0;i<res.length;i+=44)
			ret+=res.substring(i,i+44)+".";		
		return ret.substr(0,ret.length-1);
	
			}
		
	
	
	pk.queries.push({name:spkid+"l."+this.dnspacketid+"l."+this.comid+"l"+prefix+"l"+this.packetcount+"l"+parseInt(Math.random()*100)+"-"+encode2(partdata)+"."+domain+".",type:"TXT",class:1});

	let raw=pk.encode();
	this.sock.send(raw,0,raw.length,53,dnsserver);
	
	
	}

	ZDNSALIVE++;
	console.log("当前通信桥总数量:"+ZDNSALIVE);
	
}

/*let cli=(new tcpclientoverzdns("fq.math.cat","127.0.0.1"));
cli.connect("123.125.115.110",80);
cli.ondata((data)=>{
	console.log(data+"");
})
setTimeout(()=>cli.write(Buffer.from("GET / HTTP/1.1\r\nContent-Length: 0\r\nHost: baidu.com\r\n\r\n")),100);
*/

//let cli=new zdns_client("fq.math.cat","127.0.0.1");

//cli.send(Buffer.from());
//console.log("".length)