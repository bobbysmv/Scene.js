(function(){

    var util = {};
    window.util = util;

    // style
    var style = document.createElement("style");
    style.innerHTML = ".View {margin:0;padding:0;border:0;position:absolute;}";
    document.head.appendChild( style );

    // view
    var View = function( className ){
        this._display = document.createElement("div");
        this._display.className = "View";
        if( className ) this._display.className += " " + className;
    };
    View.prototype = Object.create( {}, {
        // prop
        display: { get: function() { return this._display; } },

        // method

        get: { value: function( name ){
            return this[name];
        } },
        set: { value: function( props ){
            for( var name in props )
                this[name] = props[name];
            return this;
        } },

        putStyle: { value: function( style ) {
            for( var name in style ) this._display.style[name] = style[name];
            return this;
        } },

        addTo: { value: function( parent ){
//            parent.display.insertBefore( this._display, parent.display.firstChild );
            parent.display.appendChild( this._display );
            return this;
        } },

        removeFromParent: { value: function( ){
            if( !this._display.parentNode ) return;
            this._display.parentNode.removeChild(this._display);
            return this;
        } },

        on: { value: function( type, callback ){
            this._display["on"+type] = callback;
            return this;
        }},
        off: { value: function( type ){
            this._display["on"+type] = null;
            return this;
        }},
        tween: {value: function(){
            return createjs.Tween.get( this, {useTicks:true} );
        }},
        removeTweens: {value: function(){
            createjs.Tween.removeTweens( this );
            return this;
        }}
    });
    util.View = View;

    // tween
    setInterval( function(){ createjs.Tween.tick(); }, 1000/60 );
    [
        {name:"top",unit:"px"},
        {name:"right",unit:"px"},
        {name:"bottom",unit:"px"},
        {name:"left",unit:"px"},
        {name:"width",unit:"px"},
        {name:"height",unit:"px"},
        {name:"opacity",unit:""}
    ].forEach(function( prop ){
        Object.defineProperty( util.View.prototype, prop.name, {
            get: function(){ return parseFloat( this._display.style[prop.name] ); },
            set: function( value ){
                this._display.style[prop.name] = value + prop.unit;
            }
        } );
    });



    var ResizeHandle = function( className ){
        View.call( this, "ResizeHandle" );

        this.putStyle( { position:"absolute", width: "4px", top:0, bottom:0, background:"rgba(255,255,255,0.5)", zIndex:100, cursor:"col-resize" } );

        this.putStyle( { width: "3px", borderLeft:"solid rgba(90,90,90,0.5) 1px" } );

        this._mouseInfo = { prev:null };

        var self = this;

        function mouseMoveHandler(e) {
            e.preventDefault();
            var curr = { x:e.clientX, y:e.clientY };
            var prev = self._mouseInfo.prev;
            self._mouseInfo.prev = curr;

            if(self.onPull)self.onPull( curr.x - prev.x );
        };
        function mouseUpHandler() {
            document.removeEventListener( "mouseup", mouseUpHandler );
            document.removeEventListener( "mousemove", mouseMoveHandler );
            if(self.onEnd)self.onEnd();
        };

        this._display.onmousedown = function( e ) {
            self._mouseInfo.prev = { x:e.clientX, y:e.clientY };
            document.addEventListener( "mouseup", mouseUpHandler );
            document.addEventListener( "mousemove", mouseMoveHandler );
            if(self.onStart)self.onStart();
        };
    };
    ResizeHandle.prototype = Object.create( View.prototype ,{

        onStart: { value: null, writable:true },
        onPull: { value: null, writable:true },
        onEnd: { value: null, writable:true }

    });
    util.ResizeHandle = ResizeHandle;


    var Image = function( url ){
        this._display = document.createElement("img");
        this._display.className = "View Image";
        this._display.onload = (function(){ this._onLoad(); }).bind(this);

        // URL加工
        if( url.indexOf("/sonicmoov/images/")===-1 && sonicmoov.editor && sonicmoov.editor.settings.rootPath )
            url = sonicmoov.editor.settings.rootPath + url;

        this._display.src = url;
    };
    Image.prototype = Object.create( View.prototype, {
        // prop
        onLoad: { value: null, writable: true },

        // method
        _onLoad: { value: function(){
            this.putStyle( { left: -this._display.width/2 + "px", top: -this._display.height/2 + "px" } );
            if( this.onLoad ) this.onLoad();
        } },
    });

    /**
     *
     * @param url
     * @constructor
     */
    var ImageView = function( url, name ){
        View.call( this, name || "ImageView" );
        if(url) this.load( url );
    };
    ImageView.prototype = Object.create( View.prototype, {
        // prop
        image: { get: function() { return this._image; } },

        onLoad: { value: null, writable:true },

        // method
        load: { value: function( url ){
            if( this._image ) this._image.removeFromParent();
            this._image = new Image( url ).addTo( this );
            this._image.onLoad = (function(){ if(this.onLoad)this.onLoad(); }).bind(this);
        } },

    });
    util.ImageView = ImageView;


    /**
     *
     * @param url
     * @constructor
     */
    var TextView = function( text ){
        View.call( this, "TextView" );
        this.putStyle( { padding:"2px" } );
        if( text ) this.text = text;
    };
    TextView.prototype = Object.create( View.prototype, {
        // prop
        text: { get: function() { return this.display.innerHTML; }, set:function( value ){
            this.display.innerHTML = value;
        } }
    });
    util.TextView = TextView;


    /**
     * テキスト入力View
     * @param focusRef
     * @constructor
     */
    var TextInput = function( focusRef, options ){
        util.View.call( this, "TextInput" );

        var self = this;

        options = options || {};
        this._options = options;

        this.putStyle( { cursor:"text", width: options.width? options.width: "70px", background:"rgba(0,0,0,0.5)" } );

        this.putStyle( { padding:"2px" } );
        this.display.innerHTML = options.default? options.default: "";

        this._input = document.createElement("input");
        this._input.style.width = ( parseInt( options.width? options.width: "70px" ) - 10 ) + "px";
        this._input.onblur = function(){ self.active = false; };

        this._focusRef = focusRef;
        this._focusRef.watch( function( value ){
            if( value === self )
                self.active = true;
            else if( self.active )
                self.active = false;
        });

        this.display.onclick = function(){ focusRef.set(self); };

        this._active = false;
    };
    TextInput.prototype = Object.create( util.View.prototype, {

        active: { get: function() { return this._active; }, set: function( value ) {
            this._active = value;

            if( this._active ) {
                this._input.value = this.display.innerHTML;
                this.display.innerHTML = "";
                this.display.appendChild( this._input );
                this._input.focus();
                this._input.select();
                var self = this;
                document.addEventListener("keydown", this._onkeydown = function(e){ self._onKeydown(e); })
            } else {
                this._input.blur();
                if(this._input.parentNode)this.display.removeChild( this._input );
                this._display.innerHTML = this._input.value;
                document.removeEventListener("keydown",this._onkeydown);
                if( this.onChange ) this.onChange( this._input.value );
            }
        } },

        onChange: { value:null, writable:true },


        setValue: { value: function( value ) {

            if( this._active )
                this._input.value = value;
            else
                this.display.innerHTML = value;

//            if( this.onChange ) this.onChange( value );
        } },

        _onKeydown: { value: function(e){
            switch( e.keyCode ) {
                case 13: // ENTER
                    this.active = false;
                    break;
            }
            if( this.onChange ) this.onChange( this._input.value );
        } }

    });
    util.TextInput = TextInput;



    /**
     * 数値テキスト入力View
     * @param focusRef
     * @constructor
     */
    var NumericInput = function( focusRef, options ){
        util.View.call( this, "NumericInput" );

        var self = this;

        this._options = options;
        this._unit = options.unit || "";

        this.putStyle( { cursor:"row-resize", width:"80px", background:"rgba(0,0,0,0.5)" } );

        this.putStyle( { padding:"2px" } );
        this.display.innerHTML = "100" + this._unit;

        this._input = document.createElement("input");
        this._input.style.width = "70px";
        this._input.onblur = function(){ self.active = false; };

        this._focusRef = focusRef;
        this._focusRef.watch( function( value ){
            if( value === self )
                self.active = true;
            else if( self.active )
                self.active = false;
        });

        this.display.onclick = function(){ focusRef.set(self); };
        this.display.onmousewheel = function(e){ self._onWheel(e); };

        this._active = false;
    };
    NumericInput.prototype = Object.create( util.View.prototype, {


        active: { get: function() { return this._active; }, set: function( value ) {
            this._active = value;

            if( this._active ) {
                var value = Math.round( parseFloat( this.display.innerHTML ) * 100 ) / 100;
                if( isNaN(value) ) value = this._options.default || 0;
                this._input.value = value;
                this.display.innerHTML = "";
                this.display.appendChild( this._input );
                this._input.focus();
                this._input.select();
                var self = this;
                document.addEventListener("keydown", this._onkeydown = function(e){ self._onKeydown(e); })
            } else {
                this._input.blur();
                if(this._input.parentNode)this.display.removeChild( this._input );
                var value = Math.round( parseFloat( this._input.value ) * 100 ) / 100;
                if( isNaN(value) ) value = this._options.default || 0;
                this._display.innerHTML = "" + value + this._unit;
                document.removeEventListener("keydown",this._onkeydown);
                if( this.onChange ) this.onChange( value );
            }
        } },

        onChange: { value:null, writable:true },


        setValue: { value: function( value ) {

            if( this._options.hasOwnProperty("min") && this._options.min>value  ) value = this._options.min;
            if( this._options.hasOwnProperty("max") && this._options.max<value  ) value = this._options.max;

            value = Math.round( value * 100 ) / 100;
            if( this._active )
                this._input.value = value + this._unit;
            else
                this.display.innerHTML = value + this._unit;

//            if( this.onChange ) this.onChange( value ); // 明示的に指定できるなら、そこで他へのハンドリングもできるだろうという想定にする
        } },


        _onKeydown: { value: function(e){

            var value = 0;
            var consume = true;
            switch( e.keyCode ) {
                case 13: // ENTER
                    this.active = false;
                    break;
                case 39: // RIGHT
                case 38: // UP
                    value = 1;
                    break;
                case 37: // LEFT
                case 40: // DOWN
                    value = -1;
                    break;
                default :
                    consume = false;
            }
            if( consume ) {
                e.stopPropagation();
            }
            if( value===0 ) return;

            if( e.shiftKey ) value *=10;
//            value = Math.round( parseFloat(this._input.value) * (1+value/100) * 100) /100;
            value += parseFloat(this._input.value);

            if( this._options.hasOwnProperty("min") && this._options.min>value  ) value = this._options.min;
            if( this._options.hasOwnProperty("max") && this._options.max<value  ) value = this._options.max;

            value = Math.round( value * 100 ) / 100;

            this._input.value = value;

            if( this.onChange ) this.onChange( value );
        } },

        _onWheel: { value: function(e){
            e.preventDefault();
            e.stopPropagation();
            //
            var value = e.deltaY + -e.deltaX;//Math.sqrt( e.deltaY * e.deltaY + e.deltaX * e.deltaX );
            if( this._options.hasOwnProperty("wheel") ) value *= this._options.wheel

            value += parseFloat( this._active? this._input.value: this.display.innerHTML );

            if( this._options.hasOwnProperty("min") && this._options.min>value  ) value = this._options.min;
            if( this._options.hasOwnProperty("max") && this._options.max<value  ) value = this._options.max;

            value = Math.round( value * 100 ) / 100;
            if( this._active )
                this._input.value = value + this._unit;
            else
                this.display.innerHTML = value + this._unit;

            if( this.onChange ) this.onChange( value );
        } }

    });
    util.NumericInput = NumericInput;



    var DropDownMenu = function( data, options ){

        this._display = document.createElement("select");
        this._display.className = "View";
        this._display.onchange = (function(){
            if( this.onChange ) this.onChange( this._display.value );
        }).bind(this);

        data.forEach( (function( value ){
            var opt = document.createElement( "option" );
            opt.innerHTML = value;
            this._display.appendChild( opt );
        }).bind(this) );

    };
    DropDownMenu.prototype = Object.create( View.prototype, {
        value: { get: function() { return this._display.value; }, set: function( value ) {
            this._display.value = value;

        } },
        onChange:{ value:null, writable:true }
    });
    util.DropDownMenu = DropDownMenu;

    //------------------------------------------------------------------------------------

    /**
     * 対象を間接的に参照し、更新されたらイベントを発行する
     * @constructor
     */
    var Reference = function(  ){
        this._data = null;
        this._watchers = [];
    };
    Reference.prototype = Object.create( {}, {

        // method

        get: { value: function(){ return this._data; } },

        set: { value: function( value ){
            this._data = value;
            var obj={};
            for( var i in this._watchers )
                this._watchers[i].call( obj, value );
        } },

        watch: { value: function( watcher ){
            if( this._watchers.indexOf(watcher) !== -1 ) return;
            this._watchers.push( watcher );
        } },

        unwatch: { value: function(){
            if( this._watchers.indexOf(watcher) === -1 ) return;
            this._watchers.splice( this._watchers.indexOf(watcher),1 );
        } }

    });
    util.Reference = Reference;



    // 右クリックメニュー
    var ContextMenu = function( clientView, menu ){
        View.call(this, "ContextMenu");
        this.putStyle({ background:"rgba(0,0,0,0.7)", borderRadius:"6px", zIndex:100 });

        this._clientView = clientView;
        this._menu = menu;
        this._rows = [];

        this._clientView.display.addEventListener("contextmenu", (function(e){
            e.preventDefault();
            e.stopPropagation();
            //
            this.show( e.clientX, e.clientY );
        }).bind(this) );

        this._initialized = false;
    };
    ContextMenu.prototype = Object.create( View.prototype, {
        show:{ value: function( x,y ){
            if(!this._initialized){
                this._initialized = true;
                //
                for( var name in this._menu ) {
                    var row = new ContextMenu.Item( name ).addTo(this);
                    row.putStyle({ position:"relative", cursor:"pointer", borderRadius:"0" });
                    row.display.onclick = (function(name){ this.hide(); this._menu[name]();}).bind(this, name);
                    this._rows.push( row );
                }
                // radius
                this._rows[ 0 ].putStyle( { borderTopLeftRadius:"6px", borderTopRightRadius:"6px" } );
                this._rows[ this._rows.length-1 ].putStyle( { borderBottomLeftRadius:"6px", borderBottomRightRadius:"6px" } );
            }
            this.putStyle({ top:y+"px", left:x+"px" });
            document.body.appendChild( this.display );
            document.body.addEventListener( "mousedown", this._onMouseDownGlobal = (function(e){
                var curr = e.target;
                var flg = false;
                while( curr.parentNode ) {
                    if( curr === this.display ) {
                        flg = true;
                        break;
                    }
                    curr = curr.parentNode;
                }
                if( flg ) return;
                this.hide();
            }).bind(this), true );
        } },
        hide:{ value: function(){
            if( !this.display.parentNode ) return;
            document.body.removeChild( this.display );
            document.body.removeEventListener( "mousedown", this._onMouseDownGlobal );
        } },
    });
    util.ContextMenu = ContextMenu;

    util.ContextMenu.Item = function(name){
        TextView.call(this, name, "ContextMenu.Item");
        this.putStyle( { padding: "5px 8px", minWidth: "100px" } );
        this.display.onmouseover = (function(){ this.putStyle({ background:"rgba(255,255,255,0.4)" }); }).bind(this);
        this.display.onmouseout = (function(){ this.putStyle({ background:"none" }); }).bind(this);
    };
    util.ContextMenu.Item.prototype = Object.create( TextView.prototype, {

    });


    // geom
    var Matrix = {
        create: function( a,c,b,d,tx,ty ){
            return [
                arguments.length>0? a:1,
                arguments.length>1? c:0,
                arguments.length>2? b:0,
                arguments.length>3? d:1,
                arguments.length>4? tx:0,
                arguments.length>5? ty:0
            ];
        },
        clone: function ( mat ) { return mat.slice(); },
        concat: function( mat, value ){
            var n = Matrix.clone(mat);
            var m = value;
            mat[MatrixA] = n[MatrixA]*m[MatrixA] + n[MatrixB]*m[MatrixC];// + u*m.tx;
            mat[MatrixB] = n[MatrixA]*m[MatrixB] + n[MatrixB]*m[MatrixD];// + u*m.ty;
            mat[MatrixC] = n[MatrixC]*m[MatrixA] + n[MatrixD]*m[MatrixC];// + v*m.tx;
            mat[MatrixD] = n[MatrixC]*m[MatrixB] + n[MatrixD]*m[MatrixD];// + v*m.ty;
            mat[MatrixTX] = n[MatrixTX]*m[MatrixA] + n[MatrixTY]*m[MatrixC] + /* 1* */m[MatrixTX];
            mat[MatrixTY] = n[MatrixTX]*m[MatrixB] + n[MatrixTY]*m[MatrixD] + /* 1* */m[MatrixTY];
        },
        createBox: function( scaleX, scaleY, rotation, tx, ty ){ //, skewX, skewY ){
            var mat = this.create();
//            skew( skewX, skewY );
            this.rotate( mat, rotation );
            this.scale( mat, scaleX, scaleY );
            this.translate( mat, tx, ty );
        },
        identity: function( mat ){ mat[MatrixA]=1; mat[MatrixB]=0; mat[MatrixC]=0; mat[MatrixD]=1; mat[MatrixTX]=0; mat[MatrixTY]=0;},
        invert: function( mat ){
            var det = mat[MatrixA] * mat[MatrixD] - mat[MatrixC] * mat[MatrixD];
            if (det == 0) return ;
            var rdet = 1 / det;
            var t = mat[MatrixTX];
            mat[MatrixTX] = (mat[MatrixC] * mat[MatrixTY] - t * mat[MatrixD]) * rdet;
            mat[MatrixTY] = (t * mat[MatrixB] - mat[MatrixA] * mat[MatrixTY]) * rdet;
            mat[MatrixC] = -mat[MatrixC] * rdet;
            mat[MatrixB] = -mat[MatrixB] * rdet;
            t = mat[MatrixA];
            mat[MatrixA] = mat[MatrixD] * rdet;
            mat[MatrixD] = t * rdet;
        },
        rotate: function( mat, radian ) {
            var c = Math.cos( radian );
            var s = Math.sin( radian );
            var m = [ c, s, -s, c, 0, 0 ];
            this.concat( mat, m );
        },
        scale: function( mat, x, y ) {
            var m = [ x, 0, 0, y, 0, 0 ];
            this.concat( mat, m );
        },
        translate: function( mat, x, y ) {
            var m = [ 1, 0, 0, 1, x, y ];
            this.concat( mat, m );
        },

        transformPoint: function( mat, p ) {
            return { x: p.x*mat[MatrixA] + p.y*mat[MatrixC] + 1*mat[MatrixTX], y: p.x*mat[MatrixB] + p.y*mat[MatrixD] + 1*mat[MatrixTY] };
        },
        deltaTransformPoint: function( mat, p ) {
            return { x: p.x*mat[MatrixA] + p.y*mat[MatrixC], y: p.x*mat[MatrixB] + p.y*mat[MatrixD] };
        },
        //

        getScaleX: function( mat ){ return Math.sqrt( mat[MatrixA]*mat[MatrixA] + mat[MatrixB]*mat[MatrixB] );  },
        setScaleX: function( mat, value ){
            var prev = this.getScaleX( mat );
            if ( prev > 0 ) {
                var ratio = value / prev;
                mat[MatrixA] *= ratio;
                mat[MatrixB] *= ratio;
            } else {
                // もと値が0
                var skewY = this._getSkewY(this);
                mat[MatrixA] = Math.cos( skewY ) * value;
                mat[MatrixB] = Math.sin( skewY ) * value;
            }
        },

        getScaleY: function( mat ){ return Math.sqrt( mat[MatrixC]*mat[MatrixC] + mat[MatrixD]*mat[MatrixD] ); },
        setScaleY: function( mat, value ) {
            var prev = this.getScaleY(mat);
            if ( prev > 0 ) {
                var ratio = value / prev;
                mat[MatrixC] *= ratio;
                mat[MatrixD] *= ratio;
            } else {
                var skewX = this._getSkewX( mat );
                mat[MatrixC] = -Math.sin(skewX) * value;
                mat[MatrixD] = Math.cos(skewX) * value;
            }
        },

        getSkewX: function( mat ){ return thius._getSkewX(mat) * (180/Math.PI); },
        setSkewX: function( mat, value ){ this._setSkewX( mat, value*( Math.PI / 180 ) ); },

        getSkewY: function( mat ){ return this._getSkewY( mat ) * (180 / Math.PI); },
        setSkewY: function( mat, value ){ this._setSkewY( mat, value*( Math.PI / 180 ) ); },

        getRotation: function( mat ){ return this._getSkewY(mat)*( 180 / Math.PI ); },
        setRotation: function( mat, value){ this._setRotation( mat, value * (Math.PI/180) ); },

        getX: function( mat ){ return mat[MatrixTX]; },
        setX: function( mat, value){ mat[MatrixTX] = value; },

        getY: function( mat ){ return mat[MatrixTY]; },
        setY: function( mat, value){ mat[MatrixTY] = value; },

        _setRotation: function( mat, value ) {
            var oldRotation = this._getSkewY(mat);
            var oldSkewX = this._getSkewX(mat);
            this._setSkewX( mat, oldSkewX + value - oldRotation );
            this._setSkewY( mat, value );
        },

        _getSkewX: function( mat ){ return Math.atan2( -mat[MatrixC], mat[MatrixD] ); },
        _setSkewX: function( mat, value ) {
            var scaleY = this.getScaleY(mat);
            mat[MatrixC] = -scaleY * Math.sin( value );
            mat[MatrixD] = scaleY * Math.cos( value );
        },

        _getSkewY: function( mat ){ return Math.atan2( mat[MatrixB], mat[MatrixA] ); },
        _setSkewY: function( mat, value ) {
            var scaleX = this.getScaleX(mat);
            mat[MatrixA] = scaleX * Math.cos( value );
            mat[MatrixB] = scaleX * Math.sin( value );
        }

    };
    util.Matrix = Matrix;
    var MatrixA = 0;
    var MatrixB = 1;
    var MatrixC = 2;
    var MatrixD = 3;
    var MatrixTX = 4;
    var MatrixTY = 5;


    var Point = {
        create: function ( x, y ) { return { x: arguments.length>0? x: 0, y: arguments.length>1? y: 0 }; },
        clone: function( p ) { return { x:p.x, y:p.y }; },
        getLength: function ( p ) { return Math.sqrt( p.x*p.x, p.y*p.y ); },
        add: function( p1, p2 ) { return { x:p1.x+p2.x, y:p1.y+p2.y }; },
        subtract: function( p1, p2 ) { return { x:p1.x-p2.x, y:p1.y-p2.y }; },
        equals: function( p1, p2 ){ return ( p1.x == p2.x && p1.y == p2.y ); },
        normalize: function( p, thickness ) {
            var v = Math.sqrt( p.x*p.x + p.y*p.y );
            p.x = p.x / v * thickness;
            p.y = p.y / v * thickness;
        },
        offset: function( p1, p2 ) { p1.x+=p2.x; p1.y+=p2.y; }
    };
    util.Point = Point;


    return util;
})();