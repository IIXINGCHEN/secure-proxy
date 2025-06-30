
const a0_0x24777d=a0_0x7726;(function(_0xe00576,_0x3206b7){const _0x5e8e47=a0_0x7726,_0x298e17=_0xe00576();while(!![]){try{const _0x20ef26=parseInt(_0x5e8e47(0x96e))/0x1+parseInt(_0x5e8e47(0x8d4))/0x2*(-parseInt(_0x5e8e47(0x7b0))/0x3)+-parseInt(_0x5e8e47(0x29f))/0x4*(-parseInt(_0x5e8e47(0x43f))/0x5)+parseInt(_0x5e8e47(0x2d8))/0x6*(-parseInt(_0x5e8e47(0x812))/0x7)+-parseInt(_0x5e8e47(0x7b3))/0x8*(parseInt(_0x5e8e47(0x4ff))/0x9)+parseInt(_0x5e8e47(0x7bc))/0xa*(parseInt(_0x5e8e47(0x965))/0xb)+parseInt(_0x5e8e47(0x2de))/0xc*(parseInt(_0x5e8e47(0x294))/0xd);if(_0x20ef26===_0x3206b7)break;else _0x298e17['push'](_0x298e17['shift']());}catch(_0x34ffa7){_0x298e17['push'](_0x298e17['shift']());}}}(a0_0x2434,0x9c209));

// Service Worker 事件监听器部分
self['addEventLi'+'stener']('message',_0x1e0e50=>{
    const _0x259463=_0x1e408f,_0x29fedb={};
    _0x29fedb['zjCeK']=_0x259463(0x1c3)+_0x259463(0x1dd);
    // 处理消息事件
});

self['addEventLi'+'stener']('install',_0x5ef076=>{
    const _0x53fe6e=_0x1e408f;
    self['skipWaitin'+'g']();
});

self['addEventLi'+'stener']('activate',_0x322aa3=>{
    const _0x205f4d=_0x1e408f;
    _0x322aa3['waitUntil'](self['clients']['claim']());
});

self['addEventLi'+'stener']('fetch',_0x465f7a=>{
    const _0x290239=_0x1e408f;
    // 核心代理逻辑在这里
    _0x465f7a['respondWith'](((async()=>{
        const _0x42f272=_0x290239;
        const _0x1a3947=new URL(_0x465f7a['request']['url']);
        let _0xe22685=self['proxy_targ'+'et_protoco'+'l']||proxy_real_protocol;
        let _0x2d6852=self['proxy_targ'+'et_host']||proxy_real_host;
        
        // 构建代理URL
        let _0x5eba43=_0xe22685+'://'+_0x2d6852;
        let _0x4bcf52=_0x465f7a['request']['url'];
        let _0x7402e0=new Headers(_0x465f7a['request']['headers']);
        
        // 设置Host头
        _0x7402e0['set']('Host',_0x5eba43);
        
        // 处理路径前缀
        if(!_0x1a3947['pathname']['startsWith'](config_token_prefix)){
            // 重定向到正确的路径
            if(_0x2d6852!==_0x1a3947['host']&&!config_proxy_url['endsWith'](_0x1a3947['host'])){
                _0x2d6852=_0x1a3947['host'];
            }
            _0x4bcf52=proxy_url_prefix+_0xe22685+'/'+_0x2d6852+_0x1a3947['pathname'];
        }
        
        // 处理加密认证
        const _0x27d095=_0x7402e0['get']('Authorization');
        if(_0x27d095&&_0x27d095['includes']('Bearer')){
            // RSA + AES 加密处理
            const {key:_0x218506,base64Key:_0x4322ee}=await generateKey();
            let _0x2efc6b=await encryptKey(_0x4322ee);
            _0x7402e0['set']('siteproxy-rsa-base64key',_0x2efc6b);
            let _0x2c87dc=await encryptData(_0x27d095,_0x218506);
            _0x7402e0['set']('siteproxy-rsa-authorization',_0x2c87dc);
            _0x7402e0['delete']('Authorization');
        }
        
        // 构建请求选项
        const _0x186772={};
        _0x186772['method']=_0x465f7a['request']['method'];
        _0x186772['headers']=_0x7402e0;
        _0x186772['mode']='cors';
        _0x186772['credentials']='omit';
        _0x186772['redirect']=_0x465f7a['request']['redirect'];
        
        // 处理POST数据
        if(['POST','PUT','PATCH']['includes'](_0x465f7a['request']['method']['toLowerCase']())){
            const _0x4710e8=_0x465f7a['request']['clone']();
            const _0x3b3efe=_0x4710e8['headers']['get']('Content-Type');
            
            if(_0x3b3efe&&(_0x3b3efe['includes']('application/json')||_0x3b3efe['includes']('text')||_0x3b3efe['includes']('form'))){
                let _0x1bcc9f=await _0x4710e8['text']();
                _0x1bcc9f=processFormData(_0x1bcc9f);
                _0x186772['body']=_0x1bcc9f;
                
                // 密码字段加密
                if(/password/i['test'](_0x1bcc9f)){
                    let _0x40ed22,_0x2a542b;
                    if(!_0x186772['headers']['siteproxy-rsa-base64key']){
                        ({key:_0x40ed22,base64Key:_0x2a542b}=await generateKey());
                        let _0x3aa000=await encryptKey(_0x2a542b);
                        _0x186772['headers']['set']('siteproxy-rsa-base64key',_0x3aa000);
                    }
                    _0x186772['body']=await encryptData(_0x1bcc9f,_0x40ed22);
                    _0x186772['headers']['set']('siteproxy-rsa-authorization','encrypted');
                }
            } else {
                let _0xdec3b2=await _0x4710e8['arrayBuffer']();
                _0x186772['body']=_0xdec3b2;
            }
        }
        
        // 发送代理请求
        const _0x1d7c99=new Request(_0x4bcf52,_0x186772);
        return fetch(_0x1d7c99);
    })()));
});
