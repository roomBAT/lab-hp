// JavaScript source code
class TricoStereo extends AudioWorkletProcessor {

    // Constructor
    constructor () {
        super();
        let nTilt, nPan;
        this.port.onmessage = (event) => {
        // Handling data from the node.
            if (event.data.state) {
                this.state = event.data.state;
            }
            if(event.data.frame){
                this.buf_size = event.data.frame;
                console.log("FFT size " + this.buf_size);
            }
            if (event.data.rate) {
                this.srate = event.data.rate;
                console.log("WAV sample rate " + this.srate);
                this.dLambda[0] = 340000;
                for(let i = 1;i < this.nyq;i ++)
                    this.dLambda[i] = 340000 * this.buf_size / (i * this.srate);
            }
            if (event.data.device) {
                this.device = event.data.device;
//                console.log("Device No. " + this.device);
                                    // if device == 0, Device is ZOOM H6
                                    // if device == 1, Deice is ZOOM iQ6                
                                    // if device == 2, Device is TASCAM DR22WL
                                    // if device == 8, Tri-coordinate stereo (Tetra mic.)
                                    // if device == 9, Simulation
            }
            if(event.data.dist){
                this.micDist = event.data.dist;
                console.log("Microphone distance " + this.micDist + " mm");
            }
            if(event.data.mode){
                this.mode = event.data.mode;        // if mode == 0, Pitch control mode
                                                    // if mode == 1, Roll control mode
            }                                       

            if (event.data.param) {
                this.zP = event.data.param;
            }
            if (event.data.hrtf) {
                this.hrtf = event.data.hrtf;
            }
            if (event.data.phase) {
                this.phase = event.data.phase;
            }
            if (event.data.pan) {
                let deg = event.data.pan;
                if (deg > 179)
                    deg = 179;
                else if (deg < -180)
                    deg = -180;
                this.horizontalAngle = Math.PI * deg / 180;
            }
            if(event.data.tilt){
                let deg = event.data.tilt;
                this.verticalAngle = Math.PI * deg / 180;
            }
            if(event.data.roll){
                let deg = event.data.roll;
                this.rollAngle = Math.PI * deg / 180;
//                console.log("Roll angle " + this.rollAngle);
            }
            if (event.data.beam) {
                this.beam = event.data.beam;
            }
        };
        this.srate = 22050;
        this.buf_size = 1024;
        this.device = 0;
        this.mode = 2;
        this.nyq = this.buf_size / 2;
        this.horizontalAngle = 0;
        this.verticalAngle = 0;
        this.rollAngle = 0;
        this.address = 0;
        this.current = 0;
        this.source_buffer = new Array(2);
        this.target_buffer = new Array(2);
        this.isUpper = new Array(this.nyq);
        this.isWide = new Array(this.nyq);
        this.dHam = new Float32Array(this.buf_size);
        this.dHan = new Float32Array(this.buf_size);
        this.dLambda = new Float32Array(this.nyq);
        this.xP = new Float32Array(256);
        this.pitch = new Float32Array(72);
        this.mat = new Array(30);
        this.flg = true;
        this.samplesPlayed = 0;

        this.source_buffer[0] = new Array(2);
        this.source_buffer[1] = new Array(2);

        let dRamp = this.buf_size / 8;
        for (let i = 0; i < this.buf_size; i++) {
            if (i < dRamp)
                this.dHam[i] = 0.54 - Math.cos(Math.PI * i / dRamp) * 0.46;
            else if (i >= this.buf_size - dRamp)
                this.dHam[i] = 0.54 - Math.cos(Math.PI * (this.buf_size - i) / dRamp) * 0.46;
            else
                this.dHam[i] = 1;
            this.dHan[i] = (1 - Math.cos(i * 2 * Math.PI / this.buf_size)) / 2;
        }

        for(let i = 0;i < 256;i ++){
            if(i > 64)
                this.xP[i] = 2.0;
            else{
                this.xP[i] = 2.0 * i / 64.0;
            }
        }

        let dX;
        let dZ;
        let Z;
        let X;
        let dH;
        let dT;
        let den;
        let dW = new Float32Array(2);
        let ra = Math.PI / 2;

        dZ = 0;
        for(Z = 0;Z < 30;Z ++){
            this.mat[Z] = new Array(30);
            dX = -ra;
            for(X = 0;X < 30;X ++){
                dW[0] = Math.abs(ra - dZ);
                dW[1] = Math.abs(dX);
                den = dW[0] + dW[1];
                if(dZ < ra){
                    if(dX > 0){
                        dH = dX + (dZ - dX) * dW[1] / den;
                        if(Math.abs(Math.sin(dX) / Math.sin(dH)) >= 1)
                            dT = 0;
                        else
                            dT = Math.acos(Math.sin(dX) / Math.sin(dH));
                    }
                    else{
                        dH = dX - (dZ + dX) * dW[1] / den;
                        if(Math.abs(Math.sin(dX) / Math.sin(dH)) >= 1){
                            dT = 0;
                        }
                        else{
                            dT = Math.acos(Math.sin(dX) / Math.sin(dH));
                        }
                    }
                }
                else{
                    if(dX > 0){
                        dH = Math.PI - dX - (Math.PI - dX - dZ) * dW[1] / den;
                        if(Math.abs(Math.sin(dX) / Math.sin(Math.PI - dH)) >= 1){
                            dT = 0;
                        }
                        else{
                            dT = Math.acos(Math.sin(dX) / Math.sin(Math.PI - dH));
                        }
                    }
                    else{
                        dH = -Math.PI - dX + (Math.PI + dX - dZ) * dW[1] / den;
                        if(Math.abs(Math.sin(dX) / Math.sin(-Math.PI - dH)) >= 1){
                            dT = 0;
                        }          
                        else{
                            dT = Math.acos(Math.sin(dX) / Math.sin(-Math.PI - dH));
                        }                 
                    }
                }

                if(dH >= Math.PI){
                    dH -= Math.PI * 2;
                }
                else if(dH < -Math.PI){
                    dH += Math.PI * 2;
                }
                this.mat[Z][X] = new Float32Array(2);
                this.mat[Z][X][0] = dH;
                this.mat[Z][X][1] = dT;
                dX += Math.PI / 30;
            }
            dZ += Math.PI / 30;
        }

        this.fft = function (ret, isInv) {
            var sc;
            var f;
            var c;
            var s;
            var t;
            var c1;
            var s1;
            var x1;
            var kyo1;
            var n;
            var j;
            var i;
            var k;
            var ns;
            var l1;
            var i0;
            var i1;
            var iInt;
            var iTap = this.buf_size;
            var dWpi = Math.PI * 2;
            var dData = ret["real"];
            var dImg = ret["image"];
            if (!isInv) {
                for (iInt = 0; iInt < iTap; iInt++) {
                    dImg[iInt] = 0; // Imaginary part 
                    dData[iInt] *= this.dHan[iInt]; // Real part 
                }
            }
            /*	printf("******************** Arranging BIT ******************\n"); */
            n = iTap; /* NUMBER of DATA */
            sc = Math.PI;
            j = 0;
            for (i = 0; i < n - 1; i++) {
                if (i <= j) {
                    t = dData[i];
                    dData[i] = dData[j];
                    dData[j] = t;
                    t = dImg[i];
                    dImg[i] = dImg[j];
                    dImg[j] = t;
                }
                k = n / 2;
                while (k <= j) {
                    j = j - k;
                    k /= 2;
                }
                j += k;
            }
            /*	printf("******************** MAIN LOOP **********************\n"); */
            ns = 1;
            if (isInv)
                f = 1.0;
            else
                f = -1.0;
            while (ns <= n / 2) {
                c1 = Math.cos(sc);
                s1 = Math.sin(f * sc);
                c = 1.0;
                s = 0.0;
                for (l1 = 0; l1 < ns; l1++) {
                    for (i0 = l1; i0 < n; i0 += (2 * ns)) {
                        i1 = i0 + ns;
                        x1 = (dData[i1] * c) - (dImg[i1] * s);
                        kyo1 = (dImg[i1] * c) + (dData[i1] * s);
                        dData[i1] = dData[i0] - x1;
                        dImg[i1] = dImg[i0] - kyo1;
                        dData[i0] = dData[i0] + x1;
                        dImg[i0] = dImg[i0] + kyo1;
                    }
                    t = (c1 * c) - (s1 * s);
                    s = (s1 * c) + (c1 * s);
                    c = t;
                }
                ns *= 2;
                sc /= 2.0;
            }
            if (!isInv) {
                for (iInt = 0; iInt < iTap; iInt++) {
                    dData[iInt] /= iTap;
                    dImg[iInt] /= iTap;
                }
            }
        };

        this.panoRender = function (left, right) {
            let lr = left["real"];
            let li = left["image"];
            let rr = right["real"];
            let ri = right["image"];
            const vecFocus = [0, 0, 1];
            const vecRight = [1, 0, 0];
            const dWpi = Math.PI * 2;
            const rightAngle = Math.PI / 2;
            const dAtt = 8192;
            const cos60deg = Math.cos(Math.PI / 3.0);
            const dSmall = 1.0 / Math.cos(Math.PI / 12);
            const dLarge = 1.0 / Math.cos(Math.PI / 4);
            let iRatio = (44100 * this.buf_size) / (this.srate * 512);
            let iZ,iX;
            let reM, imM, pwrM, phaseM;
            let pwrL, pwrR, phaseL, phaseR;
            let dRatio, paramZ, paramX, dRL, dOp, dPath;
            let dSpL, dSpR, dPhL, dPhR;
            let dAmp, dPh, dGap, dF, dNear, dFar;
            let dHori, dCos, dElev;
            let dWeight = new Float32Array(2);
            let vecNear = new Float32Array(3);
            let vecFar = new Float32Array(3);
            let vecTmp = new Float32Array(3);
            let iImage, iNum, lNum, lSec, iFreq;
            let iNear, iFar;

            for (iNum = 0; iNum <= this.nyq; iNum++) {
                iImage = this.buf_size - iNum;
                iFreq = Math.round(iNum / iRatio);
                dF = iNum * this.srate / this.buf_size;

                reM = lr[iNum] + rr[iNum];
                imM = li[iNum] + ri[iNum];
                pwrM = Math.sqrt(reM * reM + imM * imM);
                phaseM = Math.atan2(imM, reM);

                pwrL = Math.sqrt(lr[iNum] * lr[iNum] + li[iNum] * li[iNum]);
                pwrR = Math.sqrt(rr[iNum] * rr[iNum] + ri[iNum] * ri[iNum]);
                phaseL = Math.atan2(li[iNum], lr[iNum]);
                phaseR = Math.atan2(ri[iNum], rr[iNum]);

                if(iFreq == 0 || iFreq >= 256)
                    iNear = iFar = 254;
                else if (iNum < this.nyq) {
                    if (this.device == 2) {
                        if (dF > 6000) {
                            dGap = Math.PI / 9;
                        }
                        else if (dF > 4000) {
                            dGap = (dF - 4000) * Math.PI / (4000 * 9);
                        }
                        else
                            dGap = 0;
                    }
                    if (this.device == 9) {
                        if (pwrR > 0) {
                            dRatio = pwrL / pwrR;
                            if (dRatio > 3)
                                paramZ = 0;
                            else if (dRatio <= 1 / 3)
                                paramZ = Math.PI - 0.1;
                            else {
                                paramZ = Math.acos((dRatio - 1.0) / ((1.0 + dRatio) * cos60deg));
                                if (isNaN(paramZ)) {
                                    paramZ = 0;
                                    console.log("Wrong value!");
                                }
                            }
                        }
                        else
                            paramZ = 0;
                    }
                    else {
                        if (pwrR > 0) {
                            dRatio = Math.log10(pwrL / pwrR) * 20;
                            if (dRatio > this.zP[iFreq])
                                paramZ = 0;
                            else if (dRatio <= -this.zP[iFreq])
                                paramZ = Math.PI;
                            else
                                paramZ = Math.acos(dRatio / this.zP[iFreq]);
                        }
                        else
                            paramZ = 0;
                        if (this.device == 2) {
                            paramZ += dGap;
                            if (paramZ > Math.PI)
                                paramZ = Math.PI * 2 - paramZ;
                        }
                        if (paramZ > Math.PI - 0.1)
                            paramZ = Math.PI - 0.1;
                    }
                    // Left - right dimension
                    dRL = phaseR - phaseL;
                    if (this.device == 1) {
                        if (dF < 4500) {
                            dRL -= 1.5 * Math.cos(paramZ) * (4500 - dF) / 4500;
                        }
                    }
                    if (dRL > Math.PI)
                        dRL -= dWpi;
                    else if (dRL < -Math.PI)
                        dRL += dWpi;

                    if (this.device == 2) {
                        if (dRL >= this.xP[iFreq])
                            paramX = rightAngle;
                        else if (dRL < -this.xP[iFreq])
                            paramX = -rightAngle;
                        else
                            paramX = Math.asin(dRL / this.xP[iFreq]);

                        paramX += dGap;
                        if (paramX > rightAngle)
                            paramX = Math.PI - paramX;
                        if (paramX > rightAngle - 0.1)
                            paramX = rightAngle - 0.1;
                    }
                    else{
                        if (dRL > 0)
                            dOp = this.dLambda[iNum] * (dWpi - dRL) / dWpi;
                        else
                            dOp = this.dLambda[iNum] * (dWpi + dRL) / dWpi;
                        if (dOp < this.micDist) {
                            iNear = iFar = 254;
                        }   
                        else {  
                            if (this.device > 2)
                                dPath = dRL * this.dLambda[iNum] / dWpi;
                            else
                                dPath = this.micDist * 6 * dRL / dWpi;

                            if (dPath >= this.micDist)
                                paramX = rightAngle - 0.1;
                            else if (dPath < -this.micDist)
                                paramX = -rightAngle;
                            else
                                paramX = Math.asin(dPath / this.micDist);
                        }
                    }
                    iZ = Math.floor(paramZ * 30 / Math.PI);
                    iX = Math.floor((rightAngle + paramX) * 30 / Math.PI);

                    if(this.device == 8){
                        dElev = this.mat[iZ][iX][1];
                        if(this.isUpper[iNum] == 0){
                            dElev *= -1;
                        }

                        if(Math.abs(dElev) < Math.PI / 6){
                            dNear = dElev;
                            dFar = 0;
                        }
                        else if(Math.abs(dElev) < Math.PI / 4){
                            if(this.isWide[iNum] == 1 || this.isWide[iNum] == -1){
                                dNear = dElev;
                                dFar = -dElev;
                            }
                            else{
                                dCos = Math.cos(dElev);
                                dNear = Math.acos(dCos * dSmall) + Math.PI / 12;
                                dFar = Math.acos(dCos * dSmall) - Math.PI / 12
                                if(Math.abs(this.isUpper[iNum]) < 1){
                                    dNear *= -1;
                                    dFar *= -1;
                                }
                            }
                        }
                        else{
                            dCos = Math.cos(dElev);
                            if(this.isWide[iNum] == 1 || this.isWide[iNum] == -1){
                                dNear = Math.acos(dCos * dLarge) + Math.PI / 4;
                                dFar = Math.acos(dCos * dLarge) - Math.PI / 4
                            }
                            else{
                                dNear = Math.acos(dCos * dSmall) + Math.PI / 12;
                                dFar = Math.acos(dCos * dSmall) - Math.PI / 12
                            }
                            if(Math.abs(this.isUpper[iNum]) < 1){
                                dNear *= -1;
                                dFar *= -1;
                            }
                        }

                        dHori = this.mat[iZ][iX][0] + this.horizontalAngle;

                        vecTmp[0] = Math.sin(dHori) * Math.cos(dFar);
                        vecTmp[1] = Math.sin(dFar);
                        vecTmp[2] = Math.cos(dHori) * Math.cos(dFar);
                        if(this.mode == 0){
                            vecFar = this.pitch(vecTmp,this.verticalAngle);
                        }
                        else if(this.mode == 1){
                            vecFar = this.rotateVector(vecTmp,vecFocus,-this.rollAngle);
                        }
                        vecTmp[0] = Math.sin(dHori) * Math.cos(dNear);
                        vecTmp[1] = Math.sin(dNear);
                        vecTmp[2] = Math.cos(dHori) * Math.cos(dNear);
                        if(this.mode == 0){
                            vecNear = this.pitch(vecTmp,this.verticalAngle);
                        }
                        else if(this.mode == 1){
                            vecNear = this.rotateVector(vecTmp,vecFocus,-this.rollAngle);
                        }

                    }
                    else{
                        dNear = this.mat[iZ][iX][0] + this.mat[iZ][iX][1] + this.horizontalAngle;
                        dFar = this.mat[iZ][iX][0] - this.mat[iZ][iX][1] + this.horizontalAngle;

                        vecNear[0] = Math.sin(dNear);
                        vecNear[1] = Math.sin(this.verticalAngle);
                        vecNear[2] = Math.cos(dNear);
                        vecFar[0] = Math.sin(dFar);
                        vecFar[1] = Math.sin(this.verticalAngle);
                        vecFar[2] = Math.cos(dFar);
                    }

                    if (this.beam > 0) {
                        dWeight[0] = this.card(vecFocus, vecNear);
                        dWeight[1] = this.card(vecFocus, vecFar);
                    }
                    else {
                        dWeight[0] = dWeight[1] = 1;
                    }

                    if (this.device < 2 && Math.abs(dPath) > this.micDist * 2) {
                        if (paramZ < Math.PI / 6)
                            iNear = iFar = 111;
                        else if (paramZ > Math.PI * 5 / 6)
                            iNear = iFar = 142;
                        else
                            iNear = iFar = 254;
                    }
                    else {
                        iNear = this.getIndex(Math.atan2(vecNear[0], vecNear[2]), Math.asin(vecNear[1]));
                        iFar = this.getIndex(Math.atan2(vecFar[0], vecFar[2]), Math.asin(vecFar[1]));
                    }
                }
                if (iNear > 253) {
                    dSpL = dSpR = pwrM;
                    dPhL = dPhR = phaseM;
                }
                else {
                    // Right channel
                    lNum = 512 * iNear + iFreq;
                    lSec = 512 * iFar + iFreq;

                    dAmp = (this.hrtf[lNum] * dWeight[0] + this.hrtf[lSec] * dWeight[1]) / 2;
                    dAmp /= dAtt;
                    dPh = (this.phase[lNum] + this.phase[lSec]) / 20000;
                    if (Math.abs(this.phase[lNum] - this.phase[lSec]) > 31416) {
                        if (dPh < 0)
                            dPh += Math.PI;
                        else
                            dPh -= Math.PI;
                    }
                    dSpR = pwrM * dAmp;
                    dPhR = phaseM + dPh;

                    // Left channel
                    lNum = 512 * this.opposite(iNear) + iFreq;
                    lSec = 512 * this.opposite(iFar) + iFreq;

                    dAmp = (this.hrtf[lNum] * dWeight[0] + this.hrtf[lSec] * dWeight[1]) / 2;
                    dAmp /= dAtt;
                    dPh = (this.phase[lNum] + this.phase[lSec]) / 20000;
                    if (Math.abs(this.phase[lNum] - this.phase[lSec]) > 31416) {
                        if (dPh < 0)
                            dPh += Math.PI;
                        else
                            dPh -= Math.PI;
                    }
                    dSpL = pwrM * dAmp;
                    dPhL = phaseM + dPh;
                }
                lr[iNum] = dSpL * Math.cos(dPhL);
                rr[iNum] = dSpR * Math.cos(dPhR);
                li[iNum] = dSpL * Math.sin(dPhL);
                ri[iNum] = dSpR * Math.sin(dPhR);
                if (iNum != 0) {
                    lr[iImage] = dSpL * Math.cos(-dPhL);
                    rr[iImage] = dSpR * Math.cos(-dPhR);
                    li[iImage] = dSpL * Math.sin(-dPhL);
                    ri[iImage] = dSpR * Math.sin(-dPhR);
                }
            }
        };

        this.weight = function (focus, first) {
            var weight0;
            var dot0;
            var dCard0;

//            dot0 = focus[0] * first[0] + focus[1] * first[1] + focus[2] * first[2];
            dot0 = focus[2] * first[2];

            weight0 = (1 + dot0) / 2;

            if (this.beam > 1) {
                weight0 *= dot0;
                if (this.beam > 2) {
                    dCard0 = Math.sin(Math.PI * dot0 / 3.0 + Math.PI / 6.0);
                    dCard0 *= -Math.cos(Math.PI * dot0 / 3.0 + Math.PI / 3.0) * 2.0;
                    weight0 *= dCard0;
                }
            }
            return (weight0);
        };

        this.card = function (focus, first) {
            let weigh;
            let power;
//            let dot = focus[0] * first[0] + focus[1] * first[1] + focus[2] * first[2];
            let dot = focus[2] * first[2];

            weigh = (1 + dot) / 2;
            if (this.beam == 2){
                weigh = Math.pow(weigh,4);
            }
            else if(this.beam == 3){
                weigh = Math.pow(weigh,16);
            }
            return (weigh);
        };

        this.pitch = function(vec, theta){
            let rVec = new Float32Array(3);
            let sinT = Math.sin(theta);
            let cosT = Math.cos(theta);

            rVec[0] = vec[0];
            rVec[1] = vec[1] * cosT - vec[2] * sinT;
            rVec[2] = vec[1] * sinT + vec[2] * cosT;

            return(rVec);
        }

        this.rotateVector = function (vec, axis, theta) {
            let rVec = new Array(3);
            let mat = new Array(3);
            let i;
            let val = 1.0 - Math.cos(theta);
            let sinT = Math.sin(theta);
            let cosT = Math.cos(theta);

            for (i = 0; i < 3; i++)
                mat[i] = new Array(3);

            mat[0][0] = cosT + axis[0] * axis[0] * val;
            mat[0][1] = axis[0] * axis[1] * val - axis[2] * sinT;
            mat[0][2] = axis[0] * axis[2] * val + axis[1] * sinT;
            mat[1][0] = axis[1] * axis[0] * val + axis[2] * sinT;
            mat[1][1] = cosT + axis[1] * axis[1] * val;
            mat[1][2] = axis[1] * axis[2] * val - axis[0] * sinT;
            mat[2][0] = axis[2] * axis[0] * val - axis[1] * sinT;
            mat[2][1] = axis[2] * axis[1] * val + axis[0] * sinT;
            mat[2][2] = cosT + axis[2] * axis[2] * val;

            rVec[0] = mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2];
            rVec[1] = mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2];
            rVec[2] = mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2];

            return (rVec);
        };

        this.getIndex = function (hor,ver) {
            let dI;
            let index;
            const dWpi = Math.PI * 2;
            if (hor < 0)
                hor += Math.PI * 2.0;

            if (ver >= Math.PI * 11.0 / 24.0)
                dI = 0;
            else if (ver >= Math.PI * 3.0 / 8.0) {
                hor += Math.PI / 8.0;
                if (hor > dWpi)
                    hor -= dWpi;
                dI = 1.0 + hor * 4.0 / Math.PI;
            }
            else if (ver >= Math.PI * 7.0 / 24.0) {
                hor += Math.PI / 16.0;
                if (hor > dWpi)
                    hor -= dWpi;
                dI = 9.0 + hor * 8.0 / Math.PI;
            }
            else if (ver >= Math.PI * 5.0 / 24.0) {
                hor += Math.PI / 24.0;
                if (hor > dWpi)
                    hor -= dWpi;
                dI = 25.0 + hor * 12.0 / Math.PI;
            }
            else if (ver >= Math.PI / 8.0) {
                hor += Math.PI / 30.0;
                if (hor > dWpi)
                    hor -= dWpi;
                dI = 49.0 + hor * 15.0 / Math.PI;
            }
            else if (ver >= Math.PI / 24.0) {
                hor += Math.PI / 32.0;
                if (hor > dWpi)
                    hor -= dWpi;
                dI = 79.0 + hor * 16.0 / Math.PI;
            }
            else if (ver >= -Math.PI / 24.0) {
                hor += Math.PI / 32.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI) {
                    dI = 111.0 + hor * 16.0 / Math.PI;
                    if (dI > 126.0)
                        dI = 126;
                }
                else
                    dI = 158.0 - hor * 16.0 / Math.PI;
            }
            else if (ver >= -Math.PI / 8.0) {
                hor += Math.PI / 32.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI)
                    dI = 158.0 - hor * 16.0 / Math.PI;
                else
                    dI = 190.0 - hor * 16.0 / Math.PI;
            }
            else if (ver >= -Math.PI * 5.0 / 24.0) {
                hor += Math.PI / 30.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI)
                    dI = 189.0 - hor * 15.0 / Math.PI;
                else
                    dI = 217.0 - hor * 15.0 / Math.PI;
            }
            else if (ver >= -Math.PI * 7.0 / 24.0) {
                hor += Math.PI / 24.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI)
                    dI = 216.0 - hor * 12.0 / Math.PI;
                else
                    dI = 237.0 - hor * 12.0 / Math.PI;
            }
            else if (ver >= -Math.PI * 7.0 / 24.0) {
                hor += Math.PI / 16.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI)
                    dI = 236.0 - hor * 8.0 / Math.PI;
                else
                    dI = 249.0 - hor * 8.0 / Math.PI;
            }
            else if (ver >= -Math.PI * 5.0 / 24.0) {
                hor += Math.PI / 8.0;
                if (hor > dWpi)
                    hor -= dWpi;
                if (hor < Math.PI)
                    dI = 248.0 - hor * 4.0 / Math.PI;
                else
                    dI = 249.0 - hor * 4.0 / Math.PI;
            }
            else
                dI = 253.0;

            if (dI > 126)
                dI = Math.ceil(dI);
            else
                dI = Math.floor(dI);
            index = dI;
            return (index);
        };

        this.opposite = function (right) {
            if (right == 0 || right >= 253)
                return (right);
            else if (right < 9) {
                if (right == 1)
                    return (right);
                else
                    return (10 - right);
            }
            else if (right < 25) {
                if (right == 9)
                    return (right);
                else
                    return (34 - right);
            }
            else if (right < 49) {
                if (right == 25)
                    return (right);
                else
                    return (74 - right);
            }
            else if (right < 79) {
                if (right == 49)
                    return (right);
                else
                    return (128 - right);
            }
            else if (right < 111) {
                if (right == 79)
                    return (right);
                else
                    return (190 - right);
            }
            else if (right < 127) {
                if (right == 111)
                    return (right);
                else
                    return (15 + right);
            }
            else if (right < 143) {
                if (right == 142)
                    return (right);
                else
                    return (right - 15);
            }
            else if (right < 175) {
                if (right == 174)
                    return (right);
                else
                    return (316 - right);
            }
            else if (right < 205) {
                if (right == 204)
                    return (right);
                else
                    return (378 - right);
            }
            else if (right < 229) {
                if (right == 228)
                    return (right);
                else
                    return (432 - right);
            }
            else if (right < 245) {
                if (right == 244)
                    return (right);
                else
                    return (472 - right);
            }
            else {
                if (right == 252)
                    return (right);
                else
                    return (496 - right);
            }
        };
    }

        // Processor
    process (inputs, outputs, parameters) {
      let input = inputs[0];
      let output = outputs[0];
      let sample,s;
      let re = new Array(2);
      let im = new Array(2);
      const buf = new ArrayBuffer(2);
      const view = new DataView(buf);

      if (this.state == "pause") {
          return true;
      }
      else if (this.state == "played") {
          this.samplesPlayed = 0;
          return true;
      }
      if (this.flg) {
          if (input.length == 0) {
//              console.log("No data");
              return true;
          }
          this.flg = false;
          this.source_buffer[0][0] = new Array(this.buf_size);
          this.source_buffer[0][0].fill(0);
          this.source_buffer[0][1] = new Array(this.buf_size);
          this.source_buffer[0][1].fill(0);

          this.source_buffer[1][0] = new Array(this.buf_size);
          this.source_buffer[1][0].fill(0);
          this.source_buffer[1][1] = new Array(this.buf_size);
          this.source_buffer[1][1].fill(0);

          this.target_buffer[0] = new Float32Array(this.buf_size);
          this.target_buffer[0].fill(0);
          this.target_buffer[1] = new Float32Array(this.buf_size);
          this.target_buffer[1].fill(0);
      
          this.address = this.nyq;
          this.current = this.nyq;
      }
      let inputLeft = input[0];
      let inputRight = input[1];
      let outputLeft = output[0];
      let outputRight = output[1];
      for(let i = 0;i < inputLeft.length;i ++){
        this.source_buffer[0][0][this.address] = inputLeft[i];
        this.source_buffer[1][0][this.address] = inputRight[i];
        outputLeft[i] = this.target_buffer[0][this.current];
        outputRight[i] = this.target_buffer[1][this.current];
        this.current++;
        if(this.current == this.nyq){
            for (let n = 0; n < this.nyq; n++) {
                this.target_buffer[0][n] = this.target_buffer[0][n + this.nyq];
                this.target_buffer[0][n + this.nyq] = 0;
                this.target_buffer[1][n] = this.target_buffer[1][n + this.nyq];
                this.target_buffer[1][n + this.nyq] = 0;
            }
            this.current = 0;
        }
        else if (this.current == this.buf_size){
            this.current = 0;
        }
        this.address++;
        if(this.address == this.buf_size){
            re[0] = this.source_buffer[0][0].slice();
            im[0] = this.source_buffer[0][1].slice();
            for(sample = 0;sample < this.nyq;sample ++){
                s = Math.max(-1, Math.min(1, re[0][sample]));
                view.setInt16(0, s < 0 ? s * 32768 : s * 32768,true);
                this.isUpper[sample] = Math.abs(view.getInt16(0,true) % 2);

            }
            let obj = { "real": re[0], "image": im[0] };
            this.fft(obj, false);
            re[1] = this.source_buffer[1][0].slice();
            im[1] = this.source_buffer[1][1].slice();
            for(sample = 0;sample < this.nyq;sample ++){
                s = Math.max(-1, Math.min(1, re[1][sample]));
                view.setInt16(0, s < 0 ? s * 32768 : s * 32768,true);
                this.isWide[sample] = view.getInt16(0,true) % 2;
            }
            obj = { "real": re[1], "image": im[1] };
            this.fft(obj, false);
            let left = { "real": re[0], "image": im[0] };
            let right = { "real": re[1], "image": im[1] };
            this.panoRender(left, right);
            obj = { "real": re[0], "image": im[0] };
            this.fft(obj, true);
            obj = { "real": re[1], "image": im[1] };
            this.fft(obj, true);
            for (sample = 0; sample < this.buf_size; sample++) {
                this.target_buffer[0][sample] += re[0][sample] * this.dHam[sample];
                this.target_buffer[1][sample] += re[1][sample] * this.dHam[sample];
            }
            this.samplesPlayed += this.nyq;
            this.port.postMessage({'samples':this.samplesPlayed - this.nyq});
            for (let n = 0; n < this.nyq; n++) {
                this.source_buffer[0][0][n] = this.source_buffer[0][0][n + this.nyq];
                this.source_buffer[1][0][n] = this.source_buffer[1][0][n + this.nyq];
            }
            this.address = this.nyq;
        }
      }
      return true;
    }
}

// Registration
registerProcessor("TricoStereo", TricoStereo);
