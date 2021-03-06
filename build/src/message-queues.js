"use strict";
/*!
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const defer = require("p-defer");
/**
 * Error class used to signal a batch failure.
 *
 * @class
 *
 * @param {string} message The error message.
 * @param {ServiceError} err The grpc service error.
 */
class BatchError extends Error {
    constructor(err, ackIds, rpc) {
        super(`Failed to "${rpc}" for ${ackIds.length} message(s). Reason: ${err.message}`);
        this.ackIds = ackIds;
        this.code = err.code;
        this.metadata = err.metadata;
    }
}
exports.BatchError = BatchError;
/**
 * Class for buffering ack/modAck requests.
 *
 * @private
 * @class
 *
 * @param {Subscriber} sub The subscriber we're queueing requests for.
 * @param {BatchOptions} options Batching options.
 */
class MessageQueue {
    constructor(sub, options = {}) {
        this.numPendingRequests = 0;
        this._requests = [];
        this._subscriber = sub;
        this.setOptions(options);
    }
    /**
     * Gets the default buffer time in ms.
     *
     * @returns {number}
     * @private
     */
    get maxMilliseconds() {
        return this._options.maxMilliseconds;
    }
    /**
     * Adds a message to the queue.
     *
     * @param {Message} message The message to add.
     * @param {number} [deadline] The deadline.
     * @private
     */
    add({ ackId }, deadline) {
        const { maxMessages, maxMilliseconds } = this._options;
        this._requests.push([ackId, deadline]);
        this.numPendingRequests += 1;
        if (this._requests.length >= maxMessages) {
            this.flush();
        }
        else if (!this._timer) {
            this._timer = setTimeout(() => this.flush(), maxMilliseconds);
        }
    }
    /**
     * Sends a batch of messages.
     * @private
     */
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._timer) {
                clearTimeout(this._timer);
                delete this._timer;
            }
            const batch = this._requests;
            const batchSize = batch.length;
            const deferred = this._onFlush;
            this._requests = [];
            this.numPendingRequests -= batchSize;
            delete this._onFlush;
            try {
                yield this._sendBatch(batch);
            }
            catch (e) {
                this._subscriber.emit('error', e);
            }
            if (deferred) {
                deferred.resolve();
            }
        });
    }
    /**
     * Returns a promise that resolves after the next flush occurs.
     *
     * @returns {Promise}
     * @private
     */
    onFlush() {
        if (!this._onFlush) {
            this._onFlush = defer();
        }
        return this._onFlush.promise;
    }
    /**
     * Set the batching options.
     *
     * @param {BatchOptions} options Batching options.
     * @private
     */
    setOptions(options) {
        const defaults = { maxMessages: 3000, maxMilliseconds: 100 };
        this._options = Object.assign(defaults, options);
    }
}
exports.MessageQueue = MessageQueue;
/**
 * Queues up Acknowledge (ack) requests.
 *
 * @private
 * @class
 */
class AckQueue extends MessageQueue {
    /**
     * Sends a batch of ack requests.
     *
     * @private
     *
     * @param {Array.<Array.<string|number>>} batch Array of ackIds and deadlines.
     * @return {Promise}
     */
    _sendBatch(batch) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._subscriber.getClient();
            const ackIds = batch.map(([ackId]) => ackId);
            const reqOpts = { subscription: this._subscriber.name, ackIds };
            try {
                yield client.acknowledge(reqOpts, this._options.callOptions);
            }
            catch (e) {
                throw new BatchError(e, ackIds, 'acknowledge');
            }
        });
    }
}
exports.AckQueue = AckQueue;
/**
 * Queues up ModifyAckDeadline requests and sends them out in batches.
 *
 * @private
 * @class
 */
class ModAckQueue extends MessageQueue {
    /**
     * Sends a batch of modAck requests. Each deadline requires its own request,
     * so we have to group all the ackIds by deadline and send multiple requests.
     *
     * @private
     *
     * @param {Array.<Array.<string|number>>} batch Array of ackIds and deadlines.
     * @return {Promise}
     */
    _sendBatch(batch) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this._subscriber.getClient();
            const subscription = this._subscriber.name;
            const modAckTable = batch.reduce((table, [ackId, deadline]) => {
                if (!table[deadline]) {
                    table[deadline] = [];
                }
                table[deadline].push(ackId);
                return table;
            }, {});
            const modAckRequests = Object.keys(modAckTable).map((deadline) => __awaiter(this, void 0, void 0, function* () {
                const ackIds = modAckTable[deadline];
                const ackDeadlineSeconds = Number(deadline);
                const reqOpts = { subscription, ackIds, ackDeadlineSeconds };
                try {
                    yield client.modifyAckDeadline(reqOpts, this._options.callOptions);
                }
                catch (e) {
                    throw new BatchError(e, ackIds, 'modifyAckDeadline');
                }
            }));
            yield Promise.all(modAckRequests);
        });
    }
}
exports.ModAckQueue = ModAckQueue;
//# sourceMappingURL=message-queues.js.map