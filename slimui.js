/**
 *      SlimUI 1.0.3
 *  https://github.com/hobbyquaker/SlimUI
 *
 *  a very lightweight framework for CCU.IO WebUIs - made for old Browsers and slow Clients
 *
 *  Vanilla JavaScript, no use of jQuery or other Libraries
 *
 *  requires CCU.IO version >= 1.0.21
 *
 *  Copyright (c) 2014 Hobbyquaker
 *  License: CC BY-NC 3.0 - http://creativecommons.org/licenses/by-nc/3.0/
 */

(function () {

    var SlimUI = function() {
        this.init();
        this.pollValues();
    };

    SlimUI.prototype = {
        /**
         *  Array aller verwendeter Datenpunkte
         */
        dps: [],
        /**
         *  Array aller Elemente die mit einem Datenpunkt verknuepft sind
         */
        dpElems: [],
        /**
         *  Startet SlimUI
         */
        init: function () {
            this.getElements(document);
        },
        /**
         *  durchsucht das DOM nach Elementen mit dem Attribut data-dp, fuellt die Arrays dps und dpElems
         *
         * @param start
         *  DOM Objekt unter welchem Elemente gesucht werden - ueblicherweise: document
         */
        getElements: function (start) {
            var elems = start.getElementsByTagName('*');
            var count = 0;
            for (var i = 0, l = elems.length; i < l; i++) {
                var elem = elems[i];
                if (elem.getAttribute("data-dp")) {

                    /**
                     * id Attribut hinzufuegen falls noetig
                     */
                    if (!elem.getAttribute("id")) {
                        elem.setAttribute("id", "slim"+count++);
                    }

                    /**
                     *  Objekt das alle relevanten Informationen zu einem Element enthaelt.
                     *  Wird dem Array dpElems hizugefuegt
                     */
                    var elemObj = {
                        id: elem.getAttribute("id"),
                        dp: elem.getAttribute("data-dp"),
                        val: elem.getAttribute("data-val"),
                        substr: (elem.getAttribute("data-substr") || "").split(","),
                        digits: parseInt(elem.getAttribute("data-digits"), 10),
                        factor: parseFloat(elem.getAttribute("data-factor")),
                        timestamp: elem.getAttribute("data-timestamp"),
                        titletimestamp: elem.getAttribute("title-timestamp"),
                        css: elem.getAttribute("data-class"),
                        style: elem.getAttribute("data-style"),
                        relmax: elem.getAttribute("data-relative-max"),
                        name: elem.nodeName,
                        type: elem.type
                    };
                    this.dpElems.push(elemObj);

                    /**
                     *  Liste der verwendeten Datenpunkte erzeugen
                     */
                    if (this.dps.indexOf(elemObj.dp) == -1) {
                        this.dps.push(elemObj.dp);
                    }

                    /**
                     *  Event-Handler hinzufuegen
                     */
                    this.addHandler(elem, elemObj);

                }
            }
        },
        /**
         * Fuegt einen onClick oder onChange Event-Handler zu INPUT und SELECT Elementen hinzu
         *
         * @param elem
         * @param elemObj
         */
        addHandler: function (elem, elemObj) {

            var ieOn = "";

            // IE <= 8
            if (!elem.addEventListener) {
                elem.addEventListener = elem.attachEvent;
                ieOn = "on";
            }

            var that = this;
            switch (elemObj.name) {
                case "SELECT":
                    elem.addEventListener(ieOn+"change", function () {
                        that.setValue(elem.getAttribute("data-dp"), elem.options[elem.selectedIndex].value);
                    }, false);
                    break;
                case "BUTTON":
                    var val = elem.getAttribute("data-val"),
                        toggle = elem.getAttribute("data-toggle");
                    if (toggle) {
                        elem.addEventListener(ieOn+"click", function () {
                            that.toggleValue(elem.getAttribute("data-dp"));
                        }, false);
                    } else {
                        elem.addEventListener(ieOn+"click", function () {
                            that.setValue(elem.getAttribute("data-dp"), val);
                        }, false);
                    }
                    break;
                case "INPUT":
                    switch (elemObj.type) {
                        case "button":
                            var val = elem.getAttribute("data-val"),
                                toggle = elem.getAttribute("data-toggle");
                            if (toggle) {
                                elem.addEventListener(ieOn+"click", function () {
                                    that.toggleValue(elem.getAttribute("data-dp"));
                                }, false);
                            } else {
                                elem.addEventListener(ieOn+"click", function () {
                                    that.setValue(elem.getAttribute("data-dp"), val);
                                }, false);
                            }
                            break;
                        case "text":
                        case "number":
                            elem.addEventListener(ieOn+"change", function () {
                                that.setValue(elem.getAttribute("data-dp"), elem.value);
                            }, false);
                            break;
                        case "checkbox":
                            elem.addEventListener(ieOn+"click", function (event) {
                                that.setValue(elem.getAttribute("data-dp"), elem.checked ? 1 : 0);
                            }, false);
                            break;
                    }
                    break;
            }
        },
        /**
         * Setzt einen Datenpunkt auf einen bestimmten Wert
         *
         * @param dp
         *   die ID des Datenpunkts
         * @param val
         *   der Wert
         */
        setValue: function (dp, val) {
            this.ajaxGet("/api/set/"+dp+"?value="+val);
        },
        /**
         * Datenpunkt Toggle
         *
         * @param dp
         *   die ID des Datenpunkts
         */
        toggleValue: function (dp) {
            this.ajaxGet("/api/toggle/"+dp+"?");
        },
        /**
         * Fragt den Wert aller Datenpunkte von CCU.IO ab und aktualisiert die Elemente
         *
         */
        pollValues: function () {
            var _this = this;
            var dps = _this.dps.join(",");
            this.ajaxGet("/api/getBulk/"+dps+"?", function (res) {
                for (var i = 0, l = _this.dpElems.length; i<l; i++) {
                    var elemObj = _this.dpElems[i];
                    if (res[elemObj.dp] !== undefined) {
                        _this.updateElement(elemObj, res[elemObj.dp]);
                    }
                }
            });
            /*
             * SG, 03.06.2016 - changed setInterval to setTimeout for less resources
             */
            setTimeout(function () {
                _this.pollValues();
            }, 3000);
        },
        /**
         *  Wert eines Elements updaten
         *
         * @param elemObj
         * @param val
         */
        updateElement: function (elemObj, val) {
            var elem = document.getElementById(elemObj.id);
            /*
             * SG, 08.02.2017 - set title-timestamp first, before setting val to val.val|ts
             */
            if (elemObj.titletimestamp) {
                var title = elem.title || "";
                // use in HTML:  title="static text&#13;"
                if (title.lastIndexOf("\r\n") >= 0) {
                    elem.title = title.substr(0, 1 + title.lastIndexOf("\r\n")) + val.ts;
                } else if (title.lastIndexOf("\r") >= 0) {
                    elem.title = title.substr(0, 1 + title.lastIndexOf("\r")) + val.ts;
                } else if (title.lastIndexOf("\n") >= 0) {
                    elem.title = title.substr(0, 1 + title.lastIndexOf("\n")) + val.ts;
                } else if (title.lastIndexOf("@") >= 0) {
                    elem.title = title.substr(0, 1 + title.lastIndexOf("@")) + val.ts;
                } else {
                    elem.title = val.ts;
                }
            }
            if (elemObj.timestamp) {
                val = val.ts;
            } else {
                val = val.val;
            }
            switch (elemObj.name) {
                case "SELECT":
                    var options = elem.getElementsByTagName("OPTION");
                    var otherOption = -1;
                    for (var i = 0, l = options.length; i < l; i++) {
                        if (options[i].value == val) {
                            if (elem.selectedIndex != i) elem.selectedIndex = i;
                            otherOption = -1;
                            break;
                        }
                        if (options[i].id == "other") {
                            otherOption = i;
                        }
                    }
                    if (otherOption >= 0) {
                        if (options[otherOption].value != val) {
                            options[otherOption].innerHTML = "( " + val + " )";
                            options[otherOption].value = val;
                        }
                        if (elem.selectedIndex != otherOption) elem.selectedIndex = otherOption;
                    }
                    break;
                case "INPUT":
                    if (elem === document.activeElement) break;
                    switch (elemObj.type) {
                        case "text":
                        case "number":
                            if (!isNaN(elemObj.digits)) {
                                val = parseFloat(val).toFixed(elemObj.digits);
                            }
                            elem.value = val;
                            break;
                        case "checkbox":
                            elem.checked = val;
                            break;
                    }
                    break;
                case "SPAN":
                case "DIV":
                    if (elemObj.css) {
                        val = val.toString().replace(/\./, "_");
                        var classes = elem.className.replace(new RegExp("(?:^|[ ]*)"+elemObj.css+"-[0-9a-zA-Z_-]+(?!\S)", "g"), "");
                        elem.className = classes += " "+elemObj.css+"-"+val;
                    } else if (elemObj.style) {
                        if (elemObj.relmax) {
                            val = (parseFloat(val) > parseFloat(elemObj.relmax)) ? "100%" :
                                (100 * parseFloat(val) / parseFloat(elemObj.relmax)).toFixed(2) + "%";
                        }
                        elem.style[elemObj.style] = val;
                        //console.log("changed style '" + elemObj.style + "' from '" + elem.style[elemObj.style] + "' to '" + val + "'");
                    } else {
                        if (!isNaN(elemObj.digits) || !isNaN(elemObj.factor)) {
                            val = parseFloat(val * (isNaN(elemObj.factor) ? 1.0 : elemObj.factor)).toFixed(isNaN(elemObj.digits) ? 0 : elemObj.digits);
                        } else {
                            // extract requested substring
                            if (!isNaN(parseInt(elemObj.substr[0]))) {
                                val = val.substr(parseInt(elemObj.substr[0]));
                            }
                            if ((elemObj.substr.length > 1) && !isNaN(parseInt(elemObj.substr[1]))) {
                                val = val.substr(0, parseInt(elemObj.substr[1]));
                            }
                        }
                        elem.innerHTML = val;
                    }
                    break;
            }
        },
        /**
         * ajaxGet() - einen HTTP GET request durchfuehren
         *
         * @param url - muss ein Fragezeichen beinhalten!
         * @param cb
         */
        ajaxGet: function (url, cb) {
            var ts = (new Date()).getTime();
            url = url + "&ts" + ts;
            xmlHttp = new XMLHttpRequest();
            xmlHttp.open('GET', url, true);
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    if (cb) {
                        cb(JSON.parse(xmlHttp.responseText));
                    }
                }
            };
            xmlHttp.send(null);
        }
    };

    /**
     * Falls der Browser Array.indexOf nicht unterstuetzt wird diese Methode ergaenzt
     */
    if (!Array.indexOf){
        Array.prototype.indexOf = function(obj){
            for(var i=0; i<this.length; i++){
                if(this[i]==obj){
                    return i;
                }
            }
            return -1;
        }
    }

    /**
     *  XMLHttpRequest ergaenzen fuer Internet Explorer
     */
    if (typeof XMLHttpRequest === "undefined") {
        XMLHttpRequest = function () {
            try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); }
            catch (e) {}
            try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); }
            catch (e) {}
            try { return new ActiveXObject("Msxml2.XMLHTTP"); }
            catch (e) {}
            try { return new ActiveXObject("Microsoft.XMLHTTP"); }
            catch (e) {}
            alert("Dieser Browser unterst&uuml;tzt kein AJAX.");
            throw new Error("This browser does not support AJAX.");
        };
    }

    /**
     *  JSON.parse ergaenzen falls nicht vom Browser unterstuetzt
     *  gekuerzte Version von Douglas Crockfords json2.js - https://github.com/douglascrockford/JSON-js
     */
    if (typeof JSON !== 'object') {
        JSON = {};
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

            var j;
            function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                j = eval('(' + text + ')');

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

            throw new SyntaxError('JSON.parse');
        };
    }

    /**
     *  SlimUI initialisieren
     */
    var slim = new SlimUI();

})();
