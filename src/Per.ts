export type Emitter<T> = (t:T)=>boolean
export type Transformer<T> = (p:(t:T)=>void, ...optional:any[])=>void;
export type Source<T> = Per<T>|Transformer<T>|T[]|T;

interface IMonitor<T> {
  limit?: number,
  count?: number,
  first?: T,
  last?: T,
}

export class Per<T> {
  forEach : Transformer<T>;

  constructor(valOrFunc:Source<T>, bindThis?:any) {
    this.forEach = Per.toFunc(valOrFunc, bindThis);
  }

  static create<T>(valOrFunc:Source<T>, bindThis?:any):Per<T> {
    if (arguments.length === 0) {
      return new Per(Per.blank);
    }
    if (valOrFunc && valOrFunc instanceof Per) {
      return valOrFunc;
    }
    return new Per<T>(<Source<T>>valOrFunc, bindThis)
  }

  static toFunc<T>(valOrFunc:Source<T>, bindThis:any):Transformer<T> {
    if (typeof valOrFunc !== 'function') {
      return Array.isArray(valOrFunc)
        ? function (emit:Emitter<T>) {
        return (<Array<T>>valOrFunc).some(emit);
      } : function (emit:Emitter<T>) {
        return emit(<T>valOrFunc);
      };
    }
    if (bindThis) {
      return function (emit:(t:T)=>void, value:T) {
        (<Transformer<T>>valOrFunc).call(bindThis, emit, value);
      }
    }
    return <Transformer<T>>valOrFunc;
  }

  static blank<T>(emit:Emitter<T>, value:T) {
    emit(value);
  }

  per<T_OUT>(valOrFunc:Source<T_OUT>, bindThis?:any):Per<T_OUT> {
    var first = this.forEach;
    var second:Transformer<T_OUT> = Per.toFunc(valOrFunc && (<Per<T_OUT>>valOrFunc).forEach || valOrFunc, bindThis);
    return Per.create(function (emit:Emitter<T_OUT>, value:T_OUT) {
      return first(function (firstVal:T) {
        return second(emit, firstVal);
      }, value);
    });
  }

  static lambda<T_IN,T_OUT>(expression:string|((t:T_IN)=>T_OUT)):(t:T_IN)=>T_OUT {
    return typeof expression === 'string'
      ? <(t:T_IN)=>T_OUT>(new Function('x', 'return ' + expression))
      : expression;
  }

  map<T_IN,T_OUT>(mapFunc:string|((t:T_IN)=>T_OUT)):Per<T_OUT> {
    var mapFunc_ = Per.lambda<T_IN,T_OUT>(mapFunc);
    return this.per<T_OUT>(function (emit:Emitter<T_OUT>, value:T_IN) {
      return emit(mapFunc_(value));
    });
  }

  filter<T_IN>(predicate:string|((t:T_IN)=>boolean)) {
    var predicate_ = Per.lambda<T_IN,boolean>(predicate);
    return this.per(function (emit:Emitter<T_IN>, value:T_IN) {
      if (predicate_(value)) {
        return emit(value);
      }
    });
  }

  concat<T_IN>(second:Source<T_IN>, secondThis?:any) {
    var second_:Transformer<T_IN> = null;
    if (second instanceof Per) {
      second_ = second.forEach;
    } else {
      second_ = Per.toFunc(second, secondThis);
    }
    var first = this.forEach;
    return Per.create(function (emit:Emitter<T_IN|T>, value:T_IN) {
      first(emit, value);
      second_(emit, value);
    });
  };

  skip(count:number) {
    return this.per(function (emit:Emitter<T>, value:T) {
      if (count > 0) {
        count--;
        return false;
      }
      return emit(value);
    });
  }

  take(count:number) {
    return this.per(function (emit:Emitter<T>, value:T) {
      if (count <= 0) {
        return true;
      }
      count--;
      return emit(value);
    });
  }

  listen(untilFunc:(t:T)=>boolean) {
    return this.per(function (emit:Emitter<T>, value:T) {
      if (untilFunc(value)) {
        return true;
      }
      return emit(value);
    });
  }

  flatten() {
    return this.per(function (emit:Emitter<T>, array:T[]|T) {
      return !Array.isArray(array)
        ? emit(array)
        : array.some(function (value:T) {
        return emit(value);
      });
    });
  }

  reduce(reducer:(l:T,r:T)=>T, seed?:T) {
    var result = seed;
    var started = arguments.length == 2;
    return this.per(function (emit:Emitter<T>, value:T) {
      result = started ? reducer(result, value) : value;
      emit(result);
      started = true;
    });
  };

  multicast(destinations:Per<T>|Transformer<T>|Array<Per<T>|Transformer<T>>, ...optional:Array<Per<T>|Transformer<T>>) {
    var destinations_:Array<Per<T>|Transformer<T>> = [];
    if (arguments.length !== 1) {
      destinations_ = Array.prototype.slice.call(arguments, 0);
    }
    var destinations__ = destinations_.map(function (destination:Per<T>|Transformer<T>) {
      return typeof destination === 'function' ? destination :
        destination instanceof Per ? destination.forEach :
          Per.ignore;
    });
    return this.listen(function (value:T) {
      var quit = true;
      destinations__.forEach(function (destination:Transformer<T>) {
        if (!destination(Per.ignore, value)) {
          quit = false;
        }
      });
      return quit;
    });
  }

  static optionalLimit(limit:number) {
    return typeof limit != 'number' ? Number.MAX_VALUE : limit;
  }

  /**
   * A passive observer - gathers results into the specified array, but
   * otherwise has no effect on the stream of values
   */
  into(ar:Array<T>, limit?:number) {
    if (!Array.isArray(ar)) {
      throw new Error("into expects an array");
    }
    limit = Per.optionalLimit(limit);
    return this.listen(function (value:T) {
      if (limit <= 0) {
        return true;
      }
      ar.push(value);
      limit--;
    });
  };

  static setOrCall(obj:{[s:string]:any}, name:string) {
    var prop = obj[name];
    if (typeof prop === 'function') {
      return prop;
    }
    return function (val:any) {
      obj[name] = val;
    }
  }

  /**
   * Tracks first, last and count for the values as they go past,
   * up to an optional limit (see 'first' and 'last' methods).
   */
  monitor(data:{[s:string]:any}) {
    var n = 0;
    var count = Per.setOrCall(data, 'count'),
      first = Per.setOrCall(data, 'first'),
      last = Per.setOrCall(data, 'last'),
      limit = data['limit'];
    if (typeof limit != 'number') {
      limit = Number.MAX_VALUE;
    }
    if (limit < 1) {
      return this;
    }
    return this.listen(function (value:T) {
      if (n === 0) {
        first(value);
      }
      n++;
      count(n);
      last(value);
      if (n >= limit) {
        return true;
      }
    });
  }

  /**
   * Send a value into the pipeline without caring what emerges
   * (only useful if you set up monitors and/or intos, or
   * similar stateful observers).
   */
  static ignore() {}

  submit(value?:T) {
    return this.forEach(Per.ignore, value);
  };

  all() {
    var results:Array<T> = [];
    this.into(results).submit();
    return results;
  };

  first() {
    var results:IMonitor<T> = {
      limit: 1,
      count: null,
      first: null,
      last: null,
    };
    this.monitor(results).submit();
    return results.count > 0 ? results.first : (void 0);
  };

  last() {
    var results:IMonitor<T> = {
      count: null,
      first: null,
      last: null,
    };
    this.monitor(results).submit();
    return results.count > 0 ? results.last : (void 0);
  };

  static truthy(value:boolean) {
    return !!value;
  }

  truthy() {
    return this.filter(Per.truthy);
  }


  static min(l:any, r:any):any {
    return Math.min(l, r);
  }

  min():Per<number> {
    return this.reduce(Per.min, <any>Number.MAX_VALUE) as any as Per<number>;
  }

  static max(l:any, r:any):any {
    return Math.max(l, r);
  }

  max():Per<number> {
    return this.reduce(Per.max, <any>Number.MIN_VALUE) as any as Per<number>;
  }

  static sum(l:any, r:any) {
    return l + r
  }

  sum():Per<number> {
    return this.reduce(Per.sum, <any>0) as any as Per<number>;
  }

  static and(l:any, r:any):any {
    return !!(l && r)
  }

  and():Per<boolean> {
    return this.reduce(Per.and, <any>true) as any as Per<boolean>;
  }

  static or(l:any, r:any):any {
    return !!(l || r)
  }

  or():Per<boolean> {
    return this.reduce(Per.or, <any>false) as any as Per<boolean>;
  };

  static not(v:boolean):any {
    return !v
  }

  not():Per<boolean> {
    return this.map(Per.not) as any as Per<boolean>;
  };

  /*
  per.create.pulse = function (ms) {
    var counter = 0;
    return create(function (emit) {
      function step() {
        if (emit(counter++) !== true) {
          setTimeout(step, ms);
        }
      }

      step();
    });
  };*/
  //exportFunction(create);
}

/*
})(function(per) {
  if (typeof exports === 'undefined') {
    this['per'] = per;
  } else {
    module.exports = per;
  }
});*/
