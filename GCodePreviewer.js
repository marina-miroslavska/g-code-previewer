/*
This file contains code from THREE.js library examples
https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GCodeLoader.js
, that is licensed under MIT license
The MIT License

Copyright © 2010-2018 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
 */

GCodePreviewer = function (data, zCoef) {
    this.zCoef = zCoef;
    this.GCodeObject = new THREE.Object3D;
    this.GCodeObject.name = 'GCodeObject';
    this.work = new THREE.Object3D;
    this.work.name = 'work';
    this.travel = new THREE.Object3D;
    this.travel.name = 'travel';

    this.showLayerRange = function(l1, l2, work, travel){
        if(!work && !travel){
            work = true;
            travel = true;
        }
        if(work){this.show(l1, l2, 'work')};
        if(travel){this.show(l1, l2, 'travel')};
    };

    this.showWork = function(l1, l2){
        this.show(l1, l2, 'work');
    };

    this.showTravel = function(l1, l2){
        this.show(l1, l2, 'travel');
    };

    this.hideWork = function(){
        this.hide('work');
    };

    this.hideTravel = function(){
        this.hide('travel');
    };

    this.parse(data)
};

GCodePreviewer.prototype.show = function show(l1, l2, type){
    let length = this[type].children.length;

    if (current['l2' + type] === undefined)  current['l2' + type] = length - 1;
    if(l1 < 0){l1 = 0};
    if(l2 >= length){l2 = length-1};

    let start = current['l1'+ type] < l1 ? current['l1'+ type] : l1;
    let end = current['l2'+ type] > l2 ? current['l2'+ type] : l2;

    for (var i = start; i <= end; i++) {
        if ((l1 <= i && i <= l2) && (!(current['l1'+ type]<= i && i <= current['l2'+ type]) || !(current[type]))){
            this[type].getObjectByName('gcode' + type + i).visible = true;

        };
        if (!(l1 <= i && i <= l2) && (current['l1'+ type]<= i && i <= current['l2'+ type])){
            this[type].getObjectByName('gcode' + type + i).visible = false;
        };

    };

    current['l1'+ type] = l1;
    current['l2'+ type] = l2;
    current[type] = true;
};

GCodePreviewer.prototype.hide = function hide(type){
    let length = this[type].children.length;
    for (var i = 0; i < length; i++) {
        this[type].getObjectByName('gcode' + type + i).visible = false;
    };
    current[type] = false;
};

GCodePreviewer.prototype.parse = function (data) {
    let self = this;
    let indicesOffset;
    let state = {x: 0, y: 0, z: 0, e: 0, f: 0, extruding: false, relative: false};
    let currentWorkLayer = undefined;
    let currentTravelLayer = undefined;
    let currentZ = undefined;
    let travelMaterial = new THREE.LineBasicMaterial( { color: new THREE.Color(0x0000FF)} );
    let ls = {work,travel};
    let layerCount = -1;
    let workMaterial = {
        '10000': new THREE.MeshLambertMaterial({color:0xFF1900}),
        '9000': new THREE.MeshLambertMaterial({color:0xFF3200}),
        '8000': new THREE.MeshLambertMaterial({color:0xFF4B00}),
        '7000': new THREE.MeshLambertMaterial({color:0xFF6400}),
        '6000': new THREE.MeshLambertMaterial({color:0xFF7D00}),
        '5000': new THREE.MeshLambertMaterial({color:0xFF9600}),
        '4000': new THREE.MeshLambertMaterial({color:0xFFAF00}),
        '3000': new THREE.MeshLambertMaterial({color:0xFFC800}),
        '2000': new THREE.MeshLambertMaterial({color:0xFFE100}),
        '1000': new THREE.MeshLambertMaterial({color:0xFFFA00})
    };

    let lines = data.replace(/;.+/g, '').split('\n');

    for (var i = 0; i < lines.length; i ++) {

        var tokens = lines[i].split(' ');
        var cmd = tokens[0].toUpperCase();

        var args = {};
        tokens.splice(1).forEach(function (token){
            if (token[0] !== undefined){
                var key = token[0].toLowerCase();
                var value = parseFloat(token.substring(1));
                args[key] = value;
            };
        });

        switch (cmd){
            case 'G0':
                var line = lineParser(args);
                break;
            case 'G1':
                var line = lineParser(args);
                break;
            case 'G90':
                state.relative = false;
                break;
            case 'G91':
                state.relative = true;
                break;
            case 'G92':
                var line = state;
                line.x = args.x !== undefined ? args.x : line.x;
                line.y = args.y !== undefined ? args.y : line.y;
                line.z = args.z !== undefined ? args.z : line.z;
                line.e = args.e !== undefined ? args.e : line.e;
                state = line;
                break;
        }
    };
    self.GCodeObject.add(self.work);
    self.GCodeObject.add(self.travel);

    function lineParser(args){
        var line = {
            x: args.x !== undefined ? absolute( state.x, args.x ) : state.x,
            y: args.y !== undefined ? absolute( state.y, args.y ) : state.y,
            z: args.z !== undefined ? absolute( state.z, args.z ) : state.z,
            e: args.e !== undefined ? absolute( state.e, args.e ) : state.e,
            f: args.f !== undefined ? absolute( state.f, args.f ) : state.f,
        };

        if ( delta( state.e, line.e ) > 0 ) {
            line.extruding = delta( state.e, line.e )>0;
            if ( currentWorkLayer == undefined || line.z != currentZ ) {
                newLayer( line );
            }

        }
        addSegment(state, line );
        state = line;
        return line;
    };

    function newLayer( line ) {
        if(layerCount >= 0) {
            for (let range in currentWorkLayer) {
                if(currentWorkLayer[range][0]){addWorkPath.call(self, currentWorkLayer[range], layerCount, (+range + 1) * 1000);}
            }

            addTravelPath(currentTravelLayer, layerCount);

            ls.travel.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
            ls.work.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

            self.work.add(ls.work);
            self.travel.add(ls.travel);
        }
        currentZ = line.z;
        currentWorkLayer = [[],[],[],[],[],[],[],[],[],[]];
        currentTravelLayer = [];
        layerCount++;
        ls.work = new THREE.Group();
        ls.work.name = 'gcodework' + layerCount;
        ls.travel = new THREE.Group();
        ls.travel.name = 'gcodetravel' + layerCount;
        console.log(currentZ)
    };

    function addSegment( p1, p2 ) {

        if (currentWorkLayer === undefined){
            newLayer( p1 );
        }

        if (p2.extruding){
            let range = Math.ceil(p2.f/1000)*1000;
            if(range>10000) range = 10000;
            currentWorkLayer[range/1000-1].push( p1.x, p1.y);
            currentWorkLayer[range/1000-1].push( p2.x, p2.y);
        }else{
            currentTravelLayer.push( p1.x, p1.y, p1.z );
            currentTravelLayer.push( p2.x, p2.y, p2.z );
        }

    };

    function delta( v1, v2 ) {
        return state.relative ? v2 : v2 - v1;
    };

    function absolute( v1, v2 ) {
        return state.relative ? v1 + v2 : v2;
    };

    function addTravelPath( vertex,i) {
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertex, 3 ) );

        var segments = new THREE.LineSegments( geometry,travelMaterial);

        segments.name = 'layer' + i;
        ls.travel.add( segments );
    };

    function addIndices(indices){
        indices.push(indicesOffset+1);
        indices.push(indicesOffset+0);
        indices.push(indicesOffset+2);

        indices.push(indicesOffset+1);
        indices.push(indicesOffset+2);
        indices.push(indicesOffset+3);

        indices.push(indicesOffset+4);
        indices.push(indicesOffset+5);
        indices.push(indicesOffset+6);

        indices.push(indicesOffset+5);
        indices.push(indicesOffset+7);
        indices.push(indicesOffset+6);

        indices.push(indicesOffset+2);
        indices.push(indicesOffset+0);
        indices.push(indicesOffset+4);

        indices.push(indicesOffset+2);
        indices.push(indicesOffset+4);
        indices.push(indicesOffset+6);

        indices.push(indicesOffset+1);
        indices.push(indicesOffset+3);
        indices.push(indicesOffset+5);

        indices.push(indicesOffset+3);
        indices.push(indicesOffset+7);
        indices.push(indicesOffset+5);

        indices.push(indicesOffset+4);
        indices.push(indicesOffset+0);
        indices.push(indicesOffset+1);

        indices.push(indicesOffset+1);
        indices.push(indicesOffset+5);
        indices.push(indicesOffset+4);

        indices.push(indicesOffset+3);
        indices.push(indicesOffset+2);
        indices.push(indicesOffset+6);

        indices.push(indicesOffset+3);
        indices.push(indicesOffset+6);
        indices.push(indicesOffset+7);
        indicesOffset+=8;
        return indices
    };

    function addRectangle(vertices,points,z,zCoef){
        let xy1,xy2,xy3,xy4;
        let coeffx = zCoef/2* (points[3]-points[1]) / Math.sqrt(Math.pow(points[2]-points[0], 2) + Math.pow(points[3]-points[1], 2));
        let coeffy = zCoef/2* (points[2]-points[0]) / Math.sqrt(Math.pow(points[2]-points[0], 2) + Math.pow(points[3]-points[1], 2));
        if(!coeffx){coeffx = zCoef/2}
        if(!coeffy){coeffy = zCoef/2}

        xy1 = [points[0] - coeffx, points[1] + coeffy];
        xy2 = [points[0] + coeffx, points[1] - coeffy];
        xy3 = [points[2] - coeffx, points[3] + coeffy];
        xy4 = [points[2] + coeffx, points[3] - coeffy];

        vertices.push(xy1[0]);
        vertices.push(xy1[1]);
        vertices.push(z);
        vertices.push(points[0]);
        vertices.push(points[1]);
        vertices.push(z+zCoef/2);
        vertices.push(xy3[0]);
        vertices.push(xy3[1]);
        vertices.push(z);
        vertices.push(points[2]);
        vertices.push(points[3]);
        vertices.push(z+zCoef/2);
        vertices.push(points[0]);
        vertices.push(points[1]);
        vertices.push(z-zCoef/2);
        vertices.push(xy2[0]);
        vertices.push(xy2[1]);
        vertices.push(z);
        vertices.push(points[2]);
        vertices.push(points[3]);
        vertices.push(z-zCoef/2);
        vertices.push(xy4[0]);
        vertices.push(xy4[1]);
        vertices.push(z);
        return vertices
    };

    function addWorkPath( data, j,range ) {
        indicesOffset = 0;
        let vertices = [];
        let indices = [];
        let len = data.length;

        for(var i=0;i<len;i+=4){
            vertices = addRectangle(vertices,[data[i],data[i+1],data[i+2],data[i+3]],currentZ,self.zCoef);
            indices = addIndices(indices);
        }

        vertices=new Float32Array(vertices);

        let bufferGeometry=new THREE.BufferGeometry;
        bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));
        bufferGeometry.addAttribute("position",new THREE.BufferAttribute(vertices,3));

        let segments = new THREE.Mesh( bufferGeometry, workMaterial[range]);
        segments.name = 'layer' + j;
        ls.work.add( segments );
    };
};
