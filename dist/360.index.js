export const id = 360;
export const ids = [360];
export const modules = {

/***/ 48360:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  createLogger: () => (/* binding */ createLogger),
  validateLogLevel: () => (/* binding */ validateLogLevel)
});

// UNUSED EXPORTS: createDefaultStreams

// EXTERNAL MODULE: ./node_modules/renovate/dist/expose.js
var expose = __webpack_require__(56486);
// EXTERNAL MODULE: ./node_modules/renovate/dist/logger/utils.js
var utils = __webpack_require__(23824);
// EXTERNAL MODULE: ./node_modules/renovate/dist/logger/with-sanitizer.js
var with_sanitizer = __webpack_require__(72191);
// EXTERNAL MODULE: ./node_modules/renovate/dist/util/regex.js
var regex = __webpack_require__(8766);
// EXTERNAL MODULE: ./node_modules/@sindresorhus/is/distribution/index.js + 1 modules
var distribution = __webpack_require__(73365);
;// CONCATENATED MODULE: ./node_modules/renovate/dist/logger/err-serializer.js



//#region lib/logger/err-serializer.ts
Error.stackTraceLimit = 20;
function errSerializer(err) {
	const response = (0,utils/* default */.Ay)(err);
	for (const field of [
		"message",
		"stack",
		"stdout",
		"stderr"
	]) {
		const val = response[field];
		if ((0,distribution/* isString */.KgX)(val)) response[field] = val.replace((0,regex/* regEx */.U$)(/https:\/\/[^@]*?@/g), "https://**redacted**@");
	}
	return response;
}
//#endregion


//# sourceMappingURL=err-serializer.js.map
;// CONCATENATED MODULE: ./node_modules/renovate/dist/logger/cmd-serializer.js

//#region lib/logger/cmd-serializer.ts
function cmdSerializer(cmd) {
	if (typeof cmd === "string") return cmd.replace((0,regex/* regEx */.U$)(/https:\/\/[^@]*@/g), "https://**redacted**@");
	return cmd;
}
//#endregion


//# sourceMappingURL=cmd-serializer.js.map
;// CONCATENATED MODULE: ./node_modules/neotraverse/dist/legacy/legacy.mjs
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
var __typeError = function(msg) {
    throw TypeError(msg);
};
var __accessCheck = function(obj, member, msg) {
    return member.has(obj) || __typeError("Cannot " + msg);
};
var __privateGet = function(obj, member, getter) {
    return __accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = function(obj, member, value) {
    return member.has(obj) ? __typeError("Cannot add the same private member more than once") : _instanceof(member, WeakSet) ? member.add(obj) : member.set(obj, value);
};
var __privateSet = function(obj, member, value, setter) {
    return __accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value;
};
// src/index.ts
var to_string = function(obj) {
    return Object.prototype.toString.call(obj);
};
var is_typed_array = function(value) {
    return ArrayBuffer.isView(value) && !_instanceof(value, DataView);
};
var is_date = function(obj) {
    return to_string(obj) === "[object Date]";
};
var is_regexp = function(obj) {
    return to_string(obj) === "[object RegExp]";
};
var is_error = function(obj) {
    return to_string(obj) === "[object Error]";
};
var is_boolean = function(obj) {
    return to_string(obj) === "[object Boolean]";
};
var is_number = function(obj) {
    return to_string(obj) === "[object Number]";
};
var is_string = function(obj) {
    return to_string(obj) === "[object String]";
};
var is_array = Array.isArray;
var gopd = Object.getOwnPropertyDescriptor;
var is_property_enumerable = Object.prototype.propertyIsEnumerable;
var get_own_property_symbols = Object.getOwnPropertySymbols;
var has_own_property = Object.prototype.hasOwnProperty;
function own_enumerable_keys(obj) {
    var res = Object.keys(obj);
    var symbols = get_own_property_symbols(obj);
    for(var i = 0; i < symbols.length; i++){
        if (is_property_enumerable.call(obj, symbols[i])) {
            res.push(symbols[i]);
        }
    }
    return res;
}
function is_writable(object, key) {
    var _gopd;
    return !((_gopd = gopd(object, key)) === null || _gopd === void 0 ? void 0 : _gopd.writable);
}
function copy(src, options) {
    if ((typeof src === "undefined" ? "undefined" : _type_of(src)) === "object" && src !== null) {
        var dst;
        if (is_array(src)) {
            dst = [];
        } else if (is_date(src)) {
            dst = new Date(src.getTime ? src.getTime() : src);
        } else if (is_regexp(src)) {
            dst = new RegExp(src);
        } else if (is_error(src)) {
            dst = {
                message: src.message
            };
        } else if (is_boolean(src) || is_number(src) || is_string(src)) {
            dst = Object(src);
        } else if (is_typed_array(src)) {
            return src.slice();
        } else {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        var iterator_function = options.includeSymbols ? own_enumerable_keys : Object.keys;
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = iterator_function(src)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var key = _step.value;
                dst[key] = src[key];
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally{
            try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                }
            } finally{
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
        return dst;
    }
    return src;
}
var empty_null = {
    includeSymbols: false,
    immutable: false
};
function walk(root, cb) {
    var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : empty_null;
    var path = [];
    var parents = [];
    var alive = true;
    var iterator_function = options.includeSymbols ? own_enumerable_keys : Object.keys;
    var immutable = !!options.immutable;
    return function walker(node_) {
        var node = immutable ? copy(node_, options) : node_;
        var modifiers = {};
        var keep_going = true;
        var state = {
            node: node,
            node_: node_,
            path: [].concat(path),
            parent: parents[parents.length - 1],
            parents: parents,
            key: path[path.length - 1],
            isRoot: path.length === 0,
            level: path.length,
            circular: void 0,
            isLeaf: false,
            notLeaf: true,
            notRoot: true,
            isFirst: false,
            isLast: false,
            update: function update(x) {
                var stopHere = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
                if (stopHere) {
                    keep_going = false;
                }
            },
            delete: function _delete(stopHere) {
                delete state.parent.node[state.key];
                if (stopHere) {
                    keep_going = false;
                }
            },
            remove: function remove(stopHere) {
                if (is_array(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                } else {
                    delete state.parent.node[state.key];
                }
                if (stopHere) {
                    keep_going = false;
                }
            },
            keys: null,
            before: function before(f) {
                modifiers.before = f;
            },
            after: function after(f) {
                modifiers.after = f;
            },
            pre: function pre(f) {
                modifiers.pre = f;
            },
            post: function post(f) {
                modifiers.post = f;
            },
            stop: function stop() {
                alive = false;
            },
            block: function block() {
                keep_going = false;
            }
        };
        if (!alive) {
            return state;
        }
        function update_state() {
            if (_type_of(state.node) === "object" && state.node !== null) {
                if (!state.keys || state.node_ !== state.node) {
                    state.keys = iterator_function(state.node);
                }
                state.isLeaf = state.keys.length === 0;
                for(var i = 0; i < parents.length; i++){
                    if (parents[i].node_ === node_) {
                        state.circular = parents[i];
                        break;
                    }
                }
            } else {
                state.isLeaf = true;
                state.keys = null;
            }
            state.notLeaf = !state.isLeaf;
            state.notRoot = !state.isRoot;
        }
        update_state();
        var ret = cb.call(state, state.node);
        if (ret !== void 0 && state.update) {
            state.update(ret);
        }
        if (modifiers.before) {
            modifiers.before.call(state, state.node);
        }
        if (!keep_going) {
            return state;
        }
        if (_type_of(state.node) === "object" && state.node !== null && !state.circular) {
            parents.push(state);
            update_state();
            var _state_keys;
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                for(var _iterator = Object.entries((_state_keys = state.keys) !== null && _state_keys !== void 0 ? _state_keys : [])[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var _step_value = _sliced_to_array(_step.value, 2), index = _step_value[0], key = _step_value[1];
                    var _state_keys1;
                    path.push(key);
                    if (modifiers.pre) {
                        modifiers.pre.call(state, state.node[key], key);
                    }
                    var child = walker(state.node[key]);
                    if (immutable && has_own_property.call(state.node, key) && !is_writable(state.node, key)) {
                        state.node[key] = child.node;
                    }
                    child.isLast = ((_state_keys1 = state.keys) === null || _state_keys1 === void 0 ? void 0 : _state_keys1.length) ? +index === state.keys.length - 1 : false;
                    child.isFirst = +index === 0;
                    if (modifiers.post) {
                        modifiers.post.call(state, child);
                    }
                    path.pop();
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally{
                try {
                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                        _iterator.return();
                    }
                } finally{
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
            parents.pop();
        }
        if (modifiers.after) {
            modifiers.after.call(state, state.node);
        }
        return state;
    }(root).node;
}
var _value, _options;
var Traverse = /*#__PURE__*/ function() {
    "use strict";
    function Traverse(obj) {
        var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : empty_null;
        _class_call_check(this, Traverse);
        // ! Have to keep these public as legacy mode requires them
        __privateAdd(this, _value);
        __privateAdd(this, _options);
        __privateSet(this, _value, obj);
        __privateSet(this, _options, options);
    }
    _create_class(Traverse, [
        {
            /**
   * Get the element at the array `path`.
   */ key: "get",
            value: function get(paths) {
                var node = __privateGet(this, _value);
                for(var i = 0; node && i < paths.length; i++){
                    var key = paths[i];
                    if (!has_own_property.call(node, key) || !__privateGet(this, _options).includeSymbols && (typeof key === "undefined" ? "undefined" : _type_of(key)) === "symbol") {
                        return void 0;
                    }
                    node = node[key];
                }
                return node;
            }
        },
        {
            /**
   * Return whether the element at the array `path` exists.
   */ key: "has",
            value: function has(paths) {
                var node = __privateGet(this, _value);
                for(var i = 0; node && i < paths.length; i++){
                    var key = paths[i];
                    if (!has_own_property.call(node, key) || !__privateGet(this, _options).includeSymbols && (typeof key === "undefined" ? "undefined" : _type_of(key)) === "symbol") {
                        return false;
                    }
                    node = node[key];
                }
                return true;
            }
        },
        {
            /**
   * Set the element at the array `path` to `value`.
   */ key: "set",
            value: function set(path, value) {
                var node = __privateGet(this, _value);
                var i = 0;
                for(i = 0; i < path.length - 1; i++){
                    var key = path[i];
                    if (!has_own_property.call(node, key)) {
                        node[key] = {};
                    }
                    node = node[key];
                }
                node[path[i]] = value;
                return value;
            }
        },
        {
            /**
   * Execute `fn` for each node in the object and return a new object with the results of the walk. To update nodes in the result use `this.update(value)`.
   */ key: "map",
            value: function map(cb) {
                return walk(__privateGet(this, _value), cb, {
                    immutable: true,
                    includeSymbols: !!__privateGet(this, _options).includeSymbols
                });
            }
        },
        {
            /**
   * Execute `fn` for each node in the object but unlike `.map()`, when `this.update()` is called it updates the object in-place.
   */ key: "forEach",
            value: function forEach(cb) {
                __privateSet(this, _value, walk(__privateGet(this, _value), cb, __privateGet(this, _options)));
                return __privateGet(this, _value);
            }
        },
        {
            /**
   * For each node in the object, perform a [left-fold](http://en.wikipedia.org/wiki/Fold_(higher-order_function)) with the return value of `fn(acc, node)`.
   *
   * If `init` isn't specified, `init` is set to the root object for the first step and the root element is skipped.
   */ key: "reduce",
            value: function reduce(cb, init) {
                var skip = arguments.length === 1;
                var acc = skip ? __privateGet(this, _value) : init;
                this.forEach(function(x) {
                    if (!this.isRoot || !skip) {
                        acc = cb.call(this, acc, x);
                    }
                });
                return acc;
            }
        },
        {
            /**
   * Return an `Array` of every possible non-cyclic path in the object.
   * Paths are `Array`s of string keys.
   */ key: "paths",
            value: function paths() {
                var acc = [];
                this.forEach(function() {
                    acc.push(this.path);
                });
                return acc;
            }
        },
        {
            /**
   * Return an `Array` of every node in the object.
   */ key: "nodes",
            value: function nodes() {
                var acc = [];
                this.forEach(function() {
                    acc.push(this.node);
                });
                return acc;
            }
        },
        {
            /**
   * Create a deep clone of the object.
   */ key: "clone",
            value: function clone() {
                var parents = [];
                var nodes = [];
                var options = __privateGet(this, _options);
                if (is_typed_array(__privateGet(this, _value))) {
                    return __privateGet(this, _value).slice();
                }
                return function clone(src) {
                    for(var i = 0; i < parents.length; i++){
                        if (parents[i] === src) {
                            return nodes[i];
                        }
                    }
                    if ((typeof src === "undefined" ? "undefined" : _type_of(src)) === "object" && src !== null) {
                        var dst = copy(src, options);
                        parents.push(src);
                        nodes.push(dst);
                        var iteratorFunction = options.includeSymbols ? own_enumerable_keys : Object.keys;
                        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(var _iterator = iteratorFunction(src)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                var key = _step.value;
                                dst[key] = clone(src[key]);
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally{
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }
                        parents.pop();
                        nodes.pop();
                        return dst;
                    }
                    return src;
                }(__privateGet(this, _value));
            }
        }
    ]);
    return Traverse;
}();
_value = new WeakMap();
_options = new WeakMap();
var traverse = function(obj, options) {
    return new Traverse(obj, options);
};
traverse.get = function(obj, paths, options) {
    return new Traverse(obj, options).get(paths);
};
traverse.set = function(obj, path, value, options) {
    return new Traverse(obj, options).set(path, value);
};
traverse.has = function(obj, paths, options) {
    return new Traverse(obj, options).has(paths);
};
traverse.map = function(obj, cb, options) {
    return new Traverse(obj, options).map(cb);
};
traverse.forEach = function(obj, cb, options) {
    return new Traverse(obj, options).forEach(cb);
};
traverse.reduce = function(obj, cb, init, options) {
    return new Traverse(obj, options).reduce(cb, init);
};
traverse.paths = function(obj, options) {
    return new Traverse(obj, options).paths();
};
traverse.nodes = function(obj, options) {
    return new Traverse(obj, options).nodes();
};
traverse.clone = function(obj, options) {
    return new Traverse(obj, options).clone();
};
var src_default = traverse;
// src/legacy.cts



;// CONCATENATED MODULE: ./node_modules/renovate/dist/logger/config-serializer.js

//#region lib/logger/config-serializer.ts
function configSerializer(config) {
	const templateFields = ["prBody"];
	const contentFields = [
		"content",
		"contents",
		"packageLockParsed",
		"yarnLockParsed"
	];
	const arrayFields = ["packageFiles", "upgrades"];
	return src_default(config).map(function scrub(val) {
		if (this.key && val) {
			const key = this.key.toString();
			if (templateFields.includes(key)) this.update("[Template]");
			if (contentFields.includes(key)) this.update("[content]");
			if (arrayFields.includes(key)) this.update("[Array]");
		}
	});
}
//#endregion


//# sourceMappingURL=config-serializer.js.map
// EXTERNAL MODULE: external "node:util"
var external_node_util_ = __webpack_require__(57975);
// EXTERNAL MODULE: external "node:stream"
var external_node_stream_ = __webpack_require__(57075);
;// CONCATENATED MODULE: ./node_modules/json-stringify-pretty-compact/index.js
// Note: This regex matches even invalid JSON strings, but since we’re
// working on the output of `JSON.stringify` we know that only valid strings
// are present (unless the user supplied a weird `options.indent` but in
// that case we don’t care since the output would be invalid anyway).
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;

function stringify(passedObj, options = {}) {
  const indent = JSON.stringify(
    [1],
    undefined,
    options.indent === undefined ? 2 : options.indent
  ).slice(2, -3);

  const maxLength =
    indent === ""
      ? Infinity
      : options.maxLength === undefined
      ? 80
      : options.maxLength;

  let { replacer } = options;

  return (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === "function") {
      obj = obj.toJSON();
    }

    const string = JSON.stringify(obj, replacer);

    if (string === undefined) {
      return string;
    }

    const length = maxLength - currentIndent.length - reserved;

    if (string.length <= length) {
      const prettified = string.replace(
        stringOrChar,
        (match, stringLiteral) => {
          return stringLiteral || `${match} `;
        }
      );
      if (prettified.length <= length) {
        return prettified;
      }
    }

    if (replacer != null) {
      obj = JSON.parse(string);
      replacer = undefined;
    }

    if (typeof obj === "object" && obj !== null) {
      const nextIndent = currentIndent + indent;
      const items = [];
      let index = 0;
      let start;
      let end;

      if (Array.isArray(obj)) {
        start = "[";
        end = "]";
        const { length } = obj;
        for (; index < length; index++) {
          items.push(
            _stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) ||
              "null"
          );
        }
      } else {
        start = "{";
        end = "}";
        const keys = Object.keys(obj);
        const { length } = keys;
        for (; index < length; index++) {
          const key = keys[index];
          const keyPart = `${JSON.stringify(key)}: `;
          const value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + (index === length - 1 ? 0 : 1)
          );
          if (value !== undefined) {
            items.push(keyPart + value);
          }
        }
      }

      if (items.length > 0) {
        return [start, indent + items.join(`,\n${nextIndent}`), end].join(
          `\n${currentIndent}`
        );
      }
    }

    return string;
  })(passedObj, "", 0);
}

;// CONCATENATED MODULE: ./node_modules/renovate/dist/logger/pretty-stdout.js





//#region lib/logger/pretty-stdout.ts
const bunyanFields = [
	"name",
	"hostname",
	"pid",
	"level",
	"v",
	"time",
	"msg",
	"start_time"
];
const metaFields = [
	"repository",
	"baseBranch",
	"packageFile",
	"depType",
	"dependency",
	"dependencies",
	"branch"
];
const levels = {
	10: "TRACE",
	20: "DEBUG",
	30: " INFO",
	40: " WARN",
	50: "ERROR",
	60: "FATAL"
};
const colorizedLevels = {
	10: external_node_util_.styleText("gray", "TRACE"),
	20: external_node_util_.styleText("blue", "DEBUG"),
	30: external_node_util_.styleText("green", " INFO"),
	40: external_node_util_.styleText("magenta", " WARN"),
	50: external_node_util_.styleText("red", "ERROR"),
	60: external_node_util_.styleText("bgRed", "FATAL")
};
function indent(str, leading = false) {
	return (leading ? "       " : "") + str.split((0,regex/* regEx */.U$)(/\r?\n/)).join("\n       ");
}
function getMeta(rec, colorize = true) {
	if (!rec) return "";
	let res = rec.module ? ` [${rec.module}]` : ``;
	const filteredMeta = metaFields.filter((elem) => rec[elem]);
	if (!filteredMeta.length) return res;
	res = ` (${filteredMeta.map((field) => `${field}=${String(rec[field])}`).join(", ")})${res}`;
	return colorize ? external_node_util_.styleText("gray", res) : res;
}
function getDetails(rec) {
	if (!rec) return "";
	const recFiltered = { ...rec };
	delete recFiltered.module;
	Object.keys(recFiltered).forEach((key) => {
		if (key === "logContext" || bunyanFields.includes(key) || metaFields.includes(key)) delete recFiltered[key];
	});
	const remainingKeys = Object.keys(recFiltered);
	if (remainingKeys.length === 0) return "";
	const err = recFiltered.err;
	if ((0,distribution/* isPlainObject */.QdQ)(err) && (0,distribution/* isString */.KgX)(err.stack)) {
		const { stack, ...errRest } = err;
		recFiltered.err = (0,distribution/* isNonEmptyObject */.u7p)(errRest) ? errRest : void 0;
		const parts = [];
		for (const key of remainingKeys) {
			if (key === "err" && recFiltered.err === void 0) continue;
			parts.push(indent(`"${key}": ${stringify(recFiltered[key])}`, true));
		}
		const jsonPart = parts.join(",\n");
		const stackPart = indent(stack, true);
		return jsonPart ? `${jsonPart}\n${stackPart}\n` : `${stackPart}\n`;
	}
	return `${remainingKeys.map((key) => `${indent(`"${key}": ${stringify(recFiltered[key])}`, true)}`).join(",\n")}\n`;
}
function formatRecord(rec, colorize = true) {
	const level = colorize ? colorizedLevels[rec.level] : levels[rec.level];
	const msg = `${indent(rec.msg)}`;
	const meta = getMeta(rec, colorize);
	const details = getDetails(rec);
	return external_node_util_.format("%s: %s%s\n%s", level, msg, meta, details);
}
var PrettyStdoutStream = class extends external_node_stream_.Writable {
	constructor() {
		super({ objectMode: true });
	}
	_write(data, _encoding, callback) {
		process.stdout.write(formatRecord(data));
		callback();
	}
};
//#endregion


//# sourceMappingURL=pretty-stdout.js.map
// EXTERNAL MODULE: ./node_modules/renovate/node_modules/fs-extra/lib/index.js
var lib = __webpack_require__(92196);
// EXTERNAL MODULE: ./node_modules/renovate/node_modules/upath/dist/index.js
var dist = __webpack_require__(83002);
;// CONCATENATED MODULE: ./node_modules/renovate/dist/logger/bunyan.js










//#region lib/logger/bunyan.ts
function createDefaultStreams(stdoutLevel, problems, logFile) {
	const stdout = {
		name: "stdout",
		level: stdoutLevel,
		stream: process.stdout
	};
	// v8 ignore else -- TODO: add test #40625
	if ((0,utils/* getEnv */._$)("LOG_FORMAT") !== "json") {
		stdout.stream = new PrettyStdoutStream();
		stdout.type = "raw";
	}
	return [
		stdout,
		{
			name: "problems",
			level: "warn",
			stream: problems,
			type: "raw"
		},
		(0,distribution/* isString */.KgX)(logFile) ? createLogFileStream(logFile) : void 0
	].filter(Boolean);
}
function createLogFileStream(logFile) {
	const directoryName = dist/* default.dirname */.Ay.dirname(logFile);
	lib.ensureDirSync(directoryName);
	const logFileLevel = validateLogLevel((0,utils/* getEnv */._$)("LOG_FILE_LEVEL"), "debug");
	const fd = lib.openSync(logFile, "a");
	if ((0,utils/* getEnv */._$)("LOG_FILE_FORMAT") === "pretty") return {
		name: "logfile",
		level: logFileLevel,
		type: "raw",
		stream: {
			writable: true,
			write: (rec) => {
				lib.writeSync(fd, formatRecord(rec, false));
			}
		}
	};
	return {
		name: "logfile",
		level: logFileLevel,
		stream: {
			writable: true,
			write: (data) => {
				lib.writeSync(fd, data);
			}
		}
	};
}
function serializedSanitizedLogger(streams) {
	return (0,expose/* bunyan */.wO)().createLogger({
		name: "renovate",
		serializers: {
			body: configSerializer,
			cmd: cmdSerializer,
			config: configSerializer,
			migratedConfig: configSerializer,
			originalConfig: configSerializer,
			presetConfig: configSerializer,
			oldConfig: configSerializer,
			newConfig: configSerializer,
			err: errSerializer
		},
		streams: streams.map(with_sanitizer/* withSanitizer */.M)
	});
}
function createLogger(stdoutLevel, problems) {
	return serializedSanitizedLogger(createDefaultStreams(stdoutLevel, problems, (0,utils/* getEnv */._$)("LOG_FILE")));
}
/**
* A function that terminates execution if the log level that was entered is
*  not a valid value for the Bunyan logger.
* @param logLevelToCheck
* @returns returns the logLevel when the logLevelToCheck is valid or the defaultLevel passed as argument when it is undefined. Else it stops execution.
*/
function validateLogLevel(logLevelToCheck, defaultLevel) {
	if ((0,distribution/* isUndefined */.b07)(logLevelToCheck) || (0,distribution/* isString */.KgX)(logLevelToCheck) && [
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal"
	].includes(logLevelToCheck)) return logLevelToCheck ?? defaultLevel;
	(0,expose/* bunyan */.wO)().createLogger({
		name: "renovate",
		streams: [{
			level: "fatal",
			stream: process.stdout
		}]
	}).fatal({ logLevel: logLevelToCheck }, "Invalid log level");
	process.exit(1);
}
//#endregion


//# sourceMappingURL=bunyan.js.map

/***/ })

};
