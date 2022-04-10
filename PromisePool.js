var PromisePool = function (source, concurrency) {
	this._concurrency = concurrency
	this._iterator = source
	this._done = false
	this._size = 0
	this._promise = null
	this._callbacks = null
}

PromisePool.prototype.active = function () {
	return !!this._promise
}

PromisePool.prototype.start = function () {
	var that = this
	this._promise = new Promise(function (resolve, reject) {
		that._callbacks = {
			reject: reject,
			resolve: resolve
		}
		that._proceed()
	})
	return this._promise
}

PromisePool.prototype._settle = function (error) {
	if (error) {
		this._callbacks.reject(error)
	} else {
		this._callbacks.resolve()
	}
	this._promise = null
	this._callbacks = null
}

PromisePool.prototype._onPooledPromiseFulfilled = function (promise, result) {
	this._size--
	if (this.active()) {
		this._proceed()
	}
}

// My strategy is to log errors in a catch clause in the promise itself, and allow the promise pool to ignore failed promises and
// proceed until the end.
PromisePool.prototype._onPooledPromiseRejected = function (promise, error) {
	this._size--
	if (this.active()) {
		this._proceed()
	}
	// if (this.active()) {
	// 	this._settle(error || new Error('Unknown error'))
	// }
}

PromisePool.prototype._trackPromise = function (promise) {
	var that = this
	promise
		.then(function (result) {
			that._onPooledPromiseFulfilled(promise, result)
		}, function (error) {
			that._onPooledPromiseRejected(promise, error)
		})['catch'](function (err) {
			that._settle(new Error('Promise processing failed: ' + err))
		})
}

PromisePool.prototype._proceed = function () {
	if (!this._done) {
		var result = { done: false }
		while (this._size < this._concurrency && !(result = this._iterator.next()).done) {
			this._size++
			this._trackPromise(result.value)
		}
		this._done = (result === null || !!result.done)
	}
	if (this._done && this._size === 0) {
		this._settle()
	}
}

exports.PromisePool = PromisePool
