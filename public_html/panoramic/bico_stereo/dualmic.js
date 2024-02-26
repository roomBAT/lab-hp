// JavaScript source code
let dualmic = (function(){
    let AudioContext;
    let audioctx;
    let ua = navigator.userAgent.toLowerCase();
    let width,height;
    let scrY,rect,clHeight;
    let ratioX,ratioY,marginX;
    let mPosition = {x:0,y:0};
    let touchPosit = { x: 0, y: 0 };
    let currPosit = { x: 0, y: 0 };
    let moved = { x: 0, y: 0 };
    let motionRate = 0.00005;
    let audioData;
    let audioBlob;
    let info_element = document.getElementById("info");
    let audioElem = document.getElementById('recorded');
    let pElem = document.getElementById("control");
    let fileName = document.getElementById('fname');
    let obj = document.getElementsByName("btn");
    let downloader = document.getElementById("save");

    let scene;
    let renderer;
    let material;
    let geometry;
    let video;
    let videoImage;
    let texture;
    let sphere;
    let camera;

    let offsetGamma = 0;
    let offsetBeta = 0;
    let gcontrols;
    let yaw = 0;
    let horizontalAngle = 0;
    let verticalAngle = 0;

    let media;
    let src;
    let worklet;
    let dev = -1;
    let samplerate = 44100;
    let play = 0;
    let currSamples;
    let imgStr = "";
    let fname = "";
    let text1;
    let text2;

    let isIphone,isIpad,isMobile;
    let isFox,isOpr;
    let isFile = false;
    let isDevice = false;
    let isDevInit = true;
    let isWait = true;
    let isRight = false;
    let isUp = false;
    let isDown = false;
    let isStill = false;
    let isRunning = false;
    let isLoaded = false;
    let isAnim = false;
    let isPermission = true;
    let isMoving = false;;

    const dblPI = Math.PI * 2;
    const rightAngle = Math.PI / 2;

    function dualmic(){
        if (!Detector.webgl) {
            Detector.addGetWebGLMessage();
            alert("Sorry, your graphic card does not seem to support WebGL.");
            return;
        }
        if (!XMLHttpRequest) {
            alert("Sorry, your browser does not seem to support XMLHttpRequest.\nPanoramic sound cannot be loaded.");
            return;
        }
        renderer = webglAvailable() ? new THREE.WebGLRenderer({ alpha: true }) : null;
        if (renderer) {
            scene = new THREE.Scene();
        }
        else {
            alert("Sorry, your browser does not seem to support WebGL.\nPanoramic video is not available.\nOnly the panoramic sound may be played.");
            return;
        }

        if (ua.indexOf('android') > -1) {
            isMobile = true;
            if (ua.indexOf('firefox') > -1) {
                isFox = true;
                //	            alert("FireFox");
            }
            else if (ua.indexOf('opera') > -1 || ua.indexOf('opr') > -1) {
                isOpr = true;
                //	            alert("Opera");
            }
            else {
                isFox = true;
                //	            alert("Something");
            }
        }
        else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipod') > -1) {
            isMobile = true;
            isIphone = true;
            //	        alert("Mobile");
        }
        else if (ua.indexOf('ipad') > -1) {
            isMobile = true;
            isIpad = true;
//            alert("iPad");
        }
        else if (ua.indexOf('macintosh') > -1) {
            if (navigator.maxTouchPoints > 1) {
                isMobile = true;
                isIpad = true;
//                alert("iPad");
            }
        }

        if(window.location.search){
            let n = window.location.search.substring(1, window.location.search.length);
            let vars = n.split('&');
            for (let i = 0; i < vars.length; i++){
                let pair = vars[i].split('=');
                if(decodeURIComponent(pair[0]) == "image"){
                    document.form0.elements["image"].value = decodeURIComponent(pair[1]);
                    isFile = true;
                }
                else if(decodeURIComponent(pair[0]) == "device"){
                    dev = decodeURIComponent(pair[1]);
                    isDevice = true;
                }
            }
            if(dev < 0)
                dev = 9;
            if(isFile && isDevice)
                this.init();
            else{
                let element = document.getElementById("file");
                if(element){
                    element.addEventListener('change', function (){
                        let fileList = this.files;
                        fname = fileList[0].name;

                        for (let i = 0; i < fileList.length; i++) {
                            let blobUrl = window.URL.createObjectURL(fileList[i]);
                            imgStr = blobUrl;
                            dualmic.prototype.init();
                        }
                        this.disabled = true;
                    })
                }
            }
        }
    }

    function webglAvailable() {
        try {
            let canvas = document.createElement("canvas");
            return !!
                (window.WebGLRenderingContext &&
                (canvas.getContext("webgl") ||
                    canvas.getContext("experimental-webgl")));
        } catch (e) {
            return false;
        }
    }

    dualmic.prototype.init = function(){
        let that = this;
        let element;
        let tmpStr;

        fileName.addEventListener('change',function(event){
            if(fileName.value){
                let str = fileName.value;
                let ext;
                if(str.lastIndexOf(".") == -1){
                    str += '.wav';
                    fileName.value = str;
                }
                else{
                    ext = str.substring(str.lastIndexOf("."));
                    if(ext != '.wav' && ext != '.WAV'){
                        str = str.substring(0,str.lastIndexOf(".")) + 'wav';
                        fileName.value = str;
                    }
                }
                console.log(str);

                downloader.download = fileName.value;
            }
            else
                downloader.download = "file.wav";
            downloader.style.display = "";
        });

        if (isIphone || isIpad) {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // iOS 13+
                isPermission = false;
            }
        }

        if(imgStr.length < 1){
            element = document.form0.elements.image;
            if (element && element.value.length > 0) {
                imgStr = element.value;
            }
        }
        console.log("Image " + imgStr);
        let sub = imgStr.substring(imgStr.lastIndexOf('.'), imgStr.length);
        var subs = fname.substring(fname.lastIndexOf('.'), fname.length);
        if(sub == ".jpg" || subs == ".jpg"){
            isWait = false;
            isStill = true;
        }

        // init variables
        horizontalAngle = 0;
        verticalAngle = 0;
        play = 0;
        currSamples = 0;

        width = window.innerWidth;
        height = window.innerHeight;

        document.body.style.overflow = "hidden"
        document.body.style.position = 'fixed';

        ratioX = 0.8;
        ratioY = 0.72;
        marginX = width * (1 - ratioX) / 2;

        document.getElementById('wrapper').style.position = 'relative';
        document.getElementById('wrapper').style.left = marginX + 'px';

        // camera
        camera = new THREE.PerspectiveCamera(75, (width * ratioX) / (height * ratioY), 1, 1000);
        camera.position.set(0, 0, 0.1);
        camera.lookAt(new THREE.Vector3(0, 0, -1));
        camera.rotation.order = "YXZ";

        // mesh
        that.getImage(imgStr);
        sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(0, 0, 0);
        sphere.rotation.order = "YXZ";
        scene.add(sphere);    

        // renderer
        renderer.setSize(width * ratioX, height * ratioY);
        renderer.setClearColor({ color: 0x000000 });
        renderer.domElement.style.position = 'relative';
        renderer.domElement.style.bottom = 0 + 'px';
        document.getElementById('stage').appendChild(renderer.domElement);
        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.domElement.addEventListener('click',function(){
            if(obj[0].value == "Stop")
                return;
            if (!isPermission) {
                window.DeviceMotionEvent.requestPermission().then(response => {
                    if (response == 'granted') {
                        // permission granted
                    } else {
                        // permission not granted
                    }
                })
                window.DeviceOrientationEvent.requestPermission().then(response => {
                    if (response == 'granted') {
                        // permission granted
                    } else {
                        // permission not granted
                    }
                })
                isPermission = true;
                text2.innerHTML = "Loading video. Wait a second.<BR>Stereo headphones are necessary";
                return;
            }
            if (isMoving) {
                isMoving = false;
            }
            if(play == 2){
                if (!isStill)
                    video.currentTime = 0;
                if (isMobile)
                    text2.innerHTML = "Tap to start recording<BR>Please use stereo headphones";
                else
                    text2.innerHTML = "Click to start recording<BR>Please use stereo headphones";
                play ++;
            }
            else if(play == 3){
                fileName.value = "";
                obj[0].disabled = true;
                downloader.style.display = "none";
                if (isMobile)
                    text2.innerHTML =
                        "Tap to stop recording<BR>Rotate device to change panning";
                else
                    text2.innerHTML =
                        "Click to stop recording<BR>Move the mouse pointer to change panning";
                that.play();
                if (!isIphone && !isIpad && !isStill)
                    video.play();
                play ++;
            }
            else if(play == 4 || play == 5){
                if (!isStill && !isIphone && !isIpad) {
                    video.pause();
                }
                if(play == 4)
                    that.play();
                downloader.style.display = "";
                play = 2;
            }
            else if (play > 4) {
                text2.innerHTML = "Please reload this page";
            }
        });

        element = document.getElementById('stage');
        rect = element.getBoundingClientRect();
        clHeight = rect.bottom - rect.top;
        scrY = window.pageYOffset;
	    
        // text messages
        text1 = document.createElement('div');
        text1.style.position = 'relative';
        text1.style.width = width * ratioX;
        text1.style.height = height / 16;
        text1.style.color = "orange";
        text1.style.fontSize = "large";
        text1.style.bottom = height / 16 + 'px';
        text1.style.textAlign = 'right';
        text1.style.filter = 'dropshadow(color=#ffff0000, offx=10, offy=10, positive=true)';
        if (dev == 0)
            text1.innerHTML = "Sound device: ZOOM XYH6";
        else if (dev == 1)
            text1.innerHTML = "Sound recorded by ZOOM iQ6";
        else if (dev == 2)
            text1.innerHTML = "Sound recorded by TASCAM DR-22WL";
        else {
            text1.innerHTML = "Sound device unknown";
        }
        document.getElementById('stage').appendChild(text1);

        text2 = document.createElement('div');
        text2.style.position = 'relative';
        //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
        text2.style.width = width;
        text2.style.height = height / 8;
        text2.style.color = "orange";
        text2.style.fontSize = "x-large";
        if (isMobile) {
            if(isIphone && window.orientation != 0 && window.orientation != 180)
                text2.style.bottom = height / 3 + 20 + 'px';
            else
                text2.style.bottom = height / 3 - 20 + 'px';
        }
        else {
            text2.style.bottom = height / 4 + 'px';
        }
        if (!isPermission)
            text2.innerHTML = "Tap here to activate gyro sensor";
        else {
            text2.innerHTML = "Loading data. Wait for a moment.<BR>Stereo headphones are necessary";
        }
        text2.style.textAlign = 'center';
        text2.style.filter = 'dropshadow(color=#ffff0000, offx=10, offy=10, positive=true)';
        document.getElementById('stage').appendChild(text2);

        // control
        if (isMobile) {
            if (window.DeviceOrientationEvent) {
                window.addEventListener("deviceorientation", that.orient, true);
            }
            else {
                alert("deviceorientation is not supported");
            }
            gcontrols = new THREE.DeviceOrientationControls(camera, renderer.domElement);
            gcontrols.connect();
        }
        else{
            window.addEventListener('mousemove', function (e) {
                if(play > 2){
                    let myOffset = rect.top - scrY;
                    if (e.clientX < marginX || e.clientX > width - marginX) {
                        mPosition.x = mPosition.y = 0;
                        return;
                    }
                    if (e.clientY < myOffset || e.clientY > rect.bottom - scrY) {
                        mPosition.x = mPosition.y = 0;
                        return;
                    }
                    if (e.clientX >= width / 3 && e.clientX < width * 2 / 3)
                        mPosition.x = 0;
                    else if (e.clientX < width / 3)
                        mPosition.x = e.clientX - width / 3;
                    else
                        mPosition.x = e.clientX - width * 2 / 3;

                    if (e.clientY >= myOffset + clHeight / 3 && e.clientY < myOffset + clHeight * 2 / 3)
                        mPosition.y = 0;
                    else if (e.clientY < myOffset + clHeight / 3)
                        mPosition.y = e.clientY - (myOffset + clHeight / 3);
                    else
                        mPosition.y = e.clientY - (myOffset + clHeight * 2 / 3);
                }
            }, false);
        }
        if (isMobile) {
            window.addEventListener('touchmove', function (e) {
                e.preventDefault();
            }, false);
            renderer.domElement.addEventListener('touchstart', function (e) {
                let touchobj = e.changedTouches[0];
                currPosit.y = touchPosit.y = parseInt(touchobj.clientY);
                currPosit.x = touchPosit.x = parseInt(touchobj.clientX);
                //	                e.preventDefault();
            },false);
            renderer.domElement.addEventListener('touchmove', function (e) {
                let touchobj = e.changedTouches[0];

                currPosit.x = parseInt(touchobj.clientX);
                currPosit.y = parseInt(touchobj.clientY);
/*	            moved.y = parseInt(touchobj.clientY) - touchPosit.y;
                moved.y = 0;
                moved.x = parseInt(touchobj.clientX) - touchPosit.x;
                touchPosit.y = parseInt(touchobj.clientY);
                touchPosit.x = parseInt(touchobj.clientX);
                if (window.orientation == -90)
                     moved.x *= -1;  */
            },false);
        }

        that.setupAudio(dev);
        play ++;
        if(play == 2)
            that.set();

    };

    this.unlockAudioContext = function (audioCtx) {
        if (audioCtx.state !== 'suspended') return;
        const b = document.body;
        const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
        events.forEach(e => b.addEventListener(e, unlock, false));
        function unlock() { audioCtx.resume().then(clean); }
        function clean() { events.forEach(e => b.removeEventListener(e, unlock)); }
    };

    dualmic.prototype.orient = function (event) {
        isPermission = true;
        if (!event.alpha && !event.gamma && !event.beta)
            alert("deviceorientation not available");
        else if (isDevInit) {
            offsetGamma = event.gamma * Math.PI / 180;
            offsetBeta = event.beta * Math.PI / 180;
            isDevInit = false;
        }
        window.removeEventListener("deviceorientation",this.orient, true);
    };

    dualmic.prototype.setupAudio = (async(device)=>{
        try {
            AudioContext = window.AudioContext || window.webkitAudioContext;
            audioctx = new AudioContext({sampleRate: samplerate});
            this.unlockAudioContext(audioctx);
        }
        catch (e) {
            alert("Web Audio API is not supported in this browser");
            return (false);
        }

        if(!audioctx.audioWorklet){
            alert("Your browser does not support AudioWorklet!");
            return (false);
        }

        await audioctx.audioWorklet.addModule('PanoSterec.min.js').then(()=>{
            worklet = new (window.AudioWorkletNode || window.webkitAudioWorkletNode)(audioctx, 'PanoSterec');
            worklet.port.postMessage({"rate":samplerate, "device":device});
            worklet.port.onmessage = (event) =>{
                if(event.data.samples){
                    currSamples = event.data.samples;
                }
                if(event.data.audio){
                    audioData.push(event.data.audio);
                }
            };  
        })
        .catch(console.error);

    });

    dualmic.prototype.play = function(){
        if(isRunning){
            worklet.port.postMessage({"state":"played"});
            // Disconnect
            worklet.disconnect();
            media.disconnect();

            clearTimeout(timer);
            isRunning = false;

            if(currSamples > 0){
                text2.innerHTML = currSamples + " samples recorded.";
                // Export audio data to WAV
                exportWAV(audioData, audioElem);
            }
            else
                text2.innerHTML = "No data";
            if(!src)
                src = audioctx.createMediaElementSource(audioElem); 
            play = 2;
            obj[0].disabled = false;
            if(pElem.style.display == "none")
                pElem.style.display = "";
        }
        else{
            isRunning = true;
            audioData = [];
            worklet.port.postMessage({"state":"run"});
            let constraints = {
                audio: {
                    mandatory: { echoCancellation: false, googEchoCancellation: false }, optional: []
                }, video: false
            };

            sampleSize = 0;
            // Get permission to use microphones
            navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess);

        }

    };

    // When navigator.mediaDevices.getUserMedia returns SUCCESS
    let handleSuccess = function(stream){

        media = audioctx.createMediaStreamSource(stream);

        // Connect source and processor
        media.connect(worklet);
        worklet.connect(audioctx.destination);

        // Stop recording after 300,000 ms
        timer = setTimeout(function () {
            worklet.port.postMessage({"state":"played"});
            // Disconnect
            worklet.disconnect();
            media.disconnect();
            text2.innerHTML = "Tap to start recording";

            play = 3;
            console.log("Time out");
        }, 300000);

    };

    dualmic.prototype.set = function(){
        if(isMobile){
            gcontrols.update();
            sphere.rotateY(-camera.rotation.y);
            if (isIphone || isIpad) {
                if (window.orientation == -90) {
                    isRight = true;
                    //	                    alert("Wrong orientation!");
                    //	                    sphere.rotateY(Math.PI);
                }
                else if (window.orientation == 180) {
                    isDown = true;
                    alert("Device orientation not supported!\nChange the device orientation and try again.");
                    sphere.rotateY(Math.PI);
                }
                else if (window.orientation == 0) {
                    isUp = true;
                    sphere.rotateY(Math.PI);
                }
            }
            else {
                let orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
                if (orientation.type == 'landscape-secondary') {
                    //	                    screen.lockOrientation('landscape-secondary');
                    isRight = true;
                    //	                    sphere.rotateY(Math.PI);
                }
                else if (orientation.type == 'portrait-secondary') {
                    //	                    screen.lockOrientation('portrait-secondary');
                    isDown = true;
                    sphere.rotateY(rightAngle);
                    //	                    alert("Upside down");
                }
                else if (orientation.type == 'portrait-primary') {
                    //	                    screen.lockOrientation('portrait-primary');
                    sphere.rotateY(-rightAngle);
                    isUp = true;
                }
            }
        }
        else
            camera.rotation.y += Math.PI;
        if (isMobile && isOpr && !isRunning && !isStill) {
            play = -1;
            text2.innerHTML = "Tap screen<BR>Please use stereo headphones";
            video.currentTime = 0;
        }
        else if (isMobile) {
            text2.innerHTML = "Tap to start recording<BR>Please use stereo headphones";
            play = 3;
        }
        else {
            text2.innerHTML = "Click to start recording<BR>Please use stereo headphones";
            play = 3;
        }
        if (!isStill) {
            video.pause();
            video.currentTime = 0;
        }
    };

    dualmic.prototype.getImage = function(str){
        let that = this;

        if(isStill){
            material = new THREE.MeshBasicMaterial({ color: 0xffffff });      // for sphere
            isLoaded = false;
            let loader = new THREE.TextureLoader();
            loader.crossOrigin = '*';
            loader.load(str, function (texture) {
                // The actual texture is returned in the event.content
                material.map = texture;
                material.needsUpdate = true;
                if (!isAnim) {
                    last = Date.now();
                    that.render();
                    isAnim = true;
                }
            },
	        function (xhr) {
	            if (xhr.loaded == xhr.total)
	                isLoaded = true;
	        },
            function (xhr) {
                alert("TextureLoader not supported!")
            });

            geometry = new THREE.SphereGeometry(10, 12, 12);
            geometry.scale(-1, 1, 1);
        }
        else{
            geometry = new THREE.SphereBufferGeometry(10, 12, 6);
            geometry.scale(-1, 1, 1);

            video = document.createElement('video');
            video.style.visibility = 'true';
            video.crossOrigin = 'anonymous';
            video.width = 960;
            video.height = 480;
            video.loop = false;
            video.preload = 'auto';
            video.autoload = true;
            video.src = str;
            video.setAttribute('webkit-playsinline', 'webkit-playsinline');
            video.setAttribute('muted', 'muted');
            video.addEventListener('loadstart', function () {
                if (!isAnim) {
                    last = Date.now();
                    that.render();
                    isAnim = true;
                }
            });

            videoImage = document.createElement('canvas');
            videoImage.width = 960;
            videoImage.height = 480;
            videoImageContext = videoImage.getContext('2d');
            videoImageContext.textAlign = 'center';
            videoImageContext.fillStyle = '#00ff00';
            videoImageContext.fillRect(0, 0, videoImage.width, videoImage.height);
            if (isIphone || isIpad) {
                video.autoplay = false;
                video.currentTime = 0;
                video.load();
                videoImageContext.drawImage(video, 0, 0, videoImage.width, videoImage.height);
                texture = new THREE.VideoTexture(videoImage);
            }
            else {
                texture = new THREE.VideoTexture(video, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);
            }
            texture.format = THREE.RGBFormat;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;

            //	        console.log("set material");
            material = new THREE.MeshBasicMaterial({ map: texture });
        }
        play ++;
        console.log( 'Status ' + play );
        if(play == 2)
            that.set();
    };

    dualmic.prototype.render = function(){
        let that = this;
        let animID;
        let alpha;

        window.addEventListener('resize', function () { that.onWindowResize(); }, false);
        window.addEventListener('scroll', function () { that.onWindowScroll(); }, false);

        animID = requestAnimationFrame(function () { that.render(); });

        if(!isStill){
            if (isWait) {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    isWait = false;
                }
            }
            else{
                if (isOpr && play == -1 && video.currentTime > 0) {
                    video.pause();
                    play = 3;
                    //                    text2.innerHTML = "Tap to start<BR>Please use stereo headphones";
                }

                if (isIphone || isIpad) {
                    video.currentTime = currSamples / samplerate;
                    videoImageContext.drawImage(video, 0, 0, videoImage.width, videoImage.height);
                }
                if (texture)
                    texture.needsUpdate = true;
            }
        }
        if(isMobile){
            gcontrols.update();
            if (isRight) {
                if (isIphone || isIpad)
                    alpha = camera.rotation.y + rightAngle;
                else
                    alpha = camera.rotation.y + rightAngle; 
                //					camera.rotation.x += offsetGamma;
            }
            else if (isDown) {
                if (isIphone || isIpad)
                    alpha = camera.rotation.y;
                else
                    alpha = camera.rotation.y + rightAngle;
                //					camera.rotation.x -= offsetBeta;
            }
            else if (isUp) {
                if(isIphone || isIpad)
                    alpha = camera.rotation.y - Math.PI;
                else
                    alpha = camera.rotation.y + rightAngle;
                //					camera.rotation.x += offsetBeta;
            }
            else {
                if (isIphone || isIpad)
                    alpha = camera.rotation.y - rightAngle;
                else
                    alpha = camera.rotation.y - rightAngle; 
                //					camera.rotation.x -= offsetGamma;
            }
            /*				if (camera.rotation.x > rightAngle)
                                camera.rotation.x = rightAngle;
                            else if (camera.rotation.x < -rightAngle)
                                camera.rotation.x = -rightAngle;    */

            moved.x = currPosit.x - touchPosit.x;
            moved.y = currPosit.y - touchPosit.y;
            touchPosit.y = currPosit.y;
            touchPosit.x = currPosit.x;
            if (window.orientation == -90)
                moved.x *= -1;

            if (isRight) {
                /*				    offsetGamma += moved.y * Math.PI / (width * 2);
                                    if (offsetGamma >= Math.PI)
                                        offsetGamma -= dblPI;
                                    else if (offsetGamma < -Math.PI)
                                        offsetGamma += dblPI;   */

                sphere.rotateY(moved.x * Math.PI / (width * 2));
                yaw -= moved.x * Math.PI / (width * 2);
                if (yaw < -Math.PI)
                    yaw += dblPI;
                else if (yaw >= Math.PI)
                    yaw -= dblPI;
            }
            else if (isUp) {
                /*				    offsetBeta += moved.y * Math.PI / (width * 2);
                                    if (offsetBeta >= Math.PI)
                                        offsetBeta -= dblPI;
                                    else if (offsetBeta < -Math.PI)
                                        offsetBeta += dblPI;    */

                sphere.rotateY(-moved.x * Math.PI / (width * 2));
                yaw += moved.x * Math.PI / (width * 2);
                if (yaw >= Math.PI)
                    yaw -= dblPI;
                else if (yaw < -Math.PI)
                    yaw += dblPI;
            }
            else if (isDown) {
                /*				    offsetBeta -= moved.y * Math.PI / (width * 2);
                                    if (offsetBeta < -Math.PI)
                                        offsetBeta += dblPI;
                                    else if (offsetBeta >= Math.PI)
                                        offsetBeta -= dblPI;    */

                sphere.rotateY(-moved.x * Math.PI / (width * 2));
                yaw += moved.x * Math.PI / (width * 2);
                if (yaw < -Math.PI)
                    yaw += dblPI;
                else if (yaw >= Math.PI)
                    yaw -= dblPI;
            }
            else {
                /*				    offsetGamma -= moved.y * Math.PI / (width * 2);
                                    if (offsetGamma < -Math.PI)
                                        offsetGamma += dblPI;
                                    else if (offsetGamma >= Math.PI)
                                        offsetGamma -= dblPI;   */

                sphere.rotateY(-moved.x * Math.PI / (width * 2));
                yaw += moved.x * Math.PI / (width * 2);
                if (yaw >= Math.PI)
                    yaw -= dblPI;
                else if (yaw < -Math.PI)
                    yaw += dblPI;
            }
            //	        offsetGamma += Math.PI / 300;
            moved.y = 0;
            moved.x = 0;
            camera.rotation.z = 0;
            camera.rotation.x = 0;
        }
        else{
            camera.rotation.y -= mPosition.x * motionRate;
            /*                    if (camera.rotation.x <= Math.PI / 3 && camera.rotation.x >= -Math.PI / 3)
                                    camera.rotation.x -= mPosition.y * motionRate;
                                else if (camera.rotation.x > Math.PI / 3)
                                    camera.rotation.x = Math.PI / 3;
                                else
                                    camera.rotation.x = -Math.PI / 3;   */

            if (camera.rotation.y > dblPI)
                camera.rotation.y -= dblPI;
            else if (camera.rotation.y < 0)
                camera.rotation.y += dblPI;
            alpha = camera.rotation.y;
        }
        alpha += yaw;
        let gamma = camera.rotation.x;
        if (alpha < 0)
            alpha += dblPI;
        else if (alpha >= dblPI)
            alpha -= dblPI;
        let hor = alpha * 180 / Math.PI;
        hor -= 180;
        //                let ver = gamma * 180 / Math.PI;
        if (Math.abs(horizontalAngle - parseInt(hor)) > 3) {
            horizontalAngle = parseInt(hor);
            if(worklet){
                worklet.port.postMessage({'pan':horizontalAngle});
            }
            if (!isMobile) {
                isMoving = true;
                //	            console.log("horizontalAngle " + horizontalAngle);
            }
        }
/*                if (Math.abs(verticalAngle - parseInt(ver)) > 3) {
                    verticalAngle = parseInt(ver);
                    worklet.port.postMessage({'tilt':verticalAngle});
                    if (!isMobile) {
                        isMoving = true;
                    }
                }   */

        renderer.render(scene, camera);
    };

    audioElem.onended = function(){
        obj[0].value = "Playback";
        worklet.port.postMessage({"state":"played"});
        // Disconnect
        worklet.disconnect();
        src.disconnect();
        play = 2;
        text2.innerHTML = "Thank you.<BR>Click the center of the image to continue.";
    };

    obj[0].addEventListener("click", function (){
        if(obj[0].value != "Playback"){
            obj[0].value = "Playback";
            audioElem.pause();
            audioElem.currentTime = 0;
            worklet.port.postMessage({"state":"played"});
            // Disconnect
            worklet.disconnect();
            src.disconnect();
        }
        else{
            obj[0].value = "Stop";
            play = 5;

            text2.innerHTML = "Playing back sound";

            // Connect source and processor
            src.connect(worklet);
            worklet.connect(audioctx.destination);
            audioElem.play();
            worklet.port.postMessage({"state":"run"});
        }
    });

    // Create WAV
    let exportWAV = function (Data, audio) {
        channels = 2;

        let encodeWAV = function (samples, sampleRate) {
            let buffer = new ArrayBuffer(44 + samples.length * 2);
            let view = new DataView(buffer);

            let writeString = function (view, offset, string) {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            let floatTo16BitPCM = function (output, offset, input) {
                for (let i = 0; i < input.length; i++, offset += 2) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            };

            writeString(view, 0, 'RIFF');  // RIFF header
            view.setUint32(4, 32 + samples.length * 2, true); // File size
            writeString(view, 8, 'WAVE'); // WAVE
            writeString(view, 12, 'fmt '); // fmt
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // Linear PCM
            view.setUint16(22, channels, true); // Channels
            view.setUint32(24, sampleRate, true); // Sample rate
            view.setUint32(28, sampleRate * 2 * channels, true); // Byte rate
            view.setUint16(32, 2 * channels, true); // Block size
            view.setUint16(34, 16, true); // Bit depth
            writeString(view, 36, 'data'); // data
            view.setUint32(40, samples.length * 2, true); // Size in byte
            floatTo16BitPCM(view, 44, samples); // Data

            return view;
        };

        let mergeBuffers = function (audio) {
            let sampleLength = 0;
            for (let i = 0; i < audio.length; i++) {
                sampleLength += audio[i].length;
            }
            let samples = new Float32Array(sampleLength);
            let sampleIdx = 0;
            for (let i = 0; i < audio.length; i++) {
                for (let j = 0; j < audio[i].length; j++) {
                    samples[sampleIdx] = audio[i][j];
                    sampleIdx++;
                }
            }
            return samples;
        };

        let dataview = encodeWAV(mergeBuffers(Data), samplerate);
        // WAV to Blob
        audioBlob = new Blob([dataview], { type: 'audio/wav' });
        // Create URL form Blob
        downloader.href = URL.createObjectURL(audioBlob);

        /*
        if (audio.style.display == "none")
            audio.style.display = "";
        audio.controls = true;  */
        // Link blob and audio
        audio.src = URL.createObjectURL(audioBlob);
    };

    dualmic.prototype.onWindowResize = function () {
        camera.aspect = (window.innerWidth * ratioX) / (window.innerHeight * ratioY);
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth * ratioX, window.innerHeight * ratioY);
        width = window.innerWidth;
        height = window.innerHeight;
        marginX = width * (1 - ratioX) / 2;
        element = document.getElementById('stage');
        rect = element.getBoundingClientRect();
        clHeight = rect.bottom - rect.top;
    };

    dualmic.prototype.onWindowScroll = function () {
        scrY = window.pageYOffset;
    };

    return dualmic;
})();

window.onload = function(){
    new dualmic();
};
