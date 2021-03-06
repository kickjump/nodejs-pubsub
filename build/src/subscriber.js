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
const projectify_1 = require("@google-cloud/projectify");
const promisify_1 = require("@google-cloud/promisify");
const events_1 = require("events");
const histogram_1 = require("./histogram");
const lease_manager_1 = require("./lease-manager");
const message_queues_1 = require("./message-queues");
const message_stream_1 = require("./message-stream");
/**
 * Message objects provide a simple interface for users to get message data and
 * acknowledge the message.
 *
 * @private
 * @class
 *
 * @param {Subscriber} sub The parent subscriber.
 * @param {object} message The raw message response.
 */
class Message {
    constructor(sub, { ackId, message }) {
        this.ackId = ackId;
        this.attributes = message.attributes || {};
        this.data = message.data;
        this.id = message.messageId;
        this.publishTime = Message.formatTimestamp(message.publishTime);
        this.received = Date.now();
        this._handled = false;
        this._length = this.data.length;
        this._subscriber = sub;
    }
    /**
     * The length of the message data.
     *
     * @type {number}
     * @private
     */
    get length() {
        return this._length;
    }
    /**
     * Acknowledges the message.
     * @private
     */
    ack() {
        if (!this._handled) {
            this._handled = true;
            this._subscriber.ack(this);
        }
    }
    /**
     * Modifies the ack deadline.
     *
     * @param {number} deadline The number of seconds to extend the deadline.
     * @private
     */
    modAck(deadline) {
        if (!this._handled) {
            this._subscriber.modAck(this, deadline);
        }
    }
    /**
     * Removes the message from our inventory and schedules it to be redelivered.
     * If the delay parameter is unset, it will be redelivered immediately.
     *
     * @param {number} [delay=0] The desired time to wait before the
     *     redelivery occurs.
     * @private
     */
    nack(delay) {
        if (!this._handled) {
            this._handled = true;
            this._subscriber.nack(this, delay);
        }
    }
    /**
     * Formats the protobuf timestamp into a JavaScript date.
     *
     * @private
     *
     * @param {object} timestamp The protobuf timestamp.
     * @return {date}
     */
    static formatTimestamp({ nanos = 0, seconds = 0 }) {
        const ms = Number(nanos) / 1e6;
        const s = Number(seconds) * 1000;
        return new Date(ms + s);
    }
}
exports.Message = Message;
/**
 * Subscriber class is used to manage all message related functionality.
 *
 * @private
 * @class
 *
 * @param {Subscription} subscription The corresponding subscription.
 * @param {SubscriberOptions} options The subscriber options.
 */
class Subscriber extends events_1.EventEmitter {
    constructor(subscription, options = {}) {
        super();
        this.ackDeadline = 10;
        this.isOpen = false;
        this._isUserSetDeadline = false;
        this._histogram = new histogram_1.Histogram({ min: 10, max: 600 });
        this._latencies = new histogram_1.Histogram();
        this._subscription = subscription;
        this.setOptions(options);
    }
    /**
     * The 99th percentile of request latencies.
     *
     * @type {number}
     * @private
     */
    get modAckLatency() {
        const latency = this._latencies.percentile(99);
        let bufferTime = 0;
        if (this._modAcks) {
            bufferTime = this._modAcks.maxMilliseconds;
        }
        return latency * 1000 + bufferTime;
    }
    /**
     * The full name of the Subscription.
     *
     * @type {string}
     * @private
     */
    get name() {
        if (!this._name) {
            const { name, projectId } = this._subscription;
            this._name = projectify_1.replaceProjectIdToken(name, projectId);
        }
        return this._name;
    }
    /**
     * Acknowledges the supplied message.
     *
     * @param {Message} message The message to acknowledge.
     * @returns {Promise}
     * @private
     */
    ack(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._isUserSetDeadline) {
                const ackTimeSeconds = (Date.now() - message.received) / 1000;
                this._histogram.add(ackTimeSeconds);
                this.ackDeadline = this._histogram.percentile(99);
            }
            this._acks.add(message);
            yield this._acks.onFlush();
            this._inventory.remove(message);
        });
    }
    /**
     * Closes the subscriber. The returned promise will resolve once any pending
     * acks/modAcks are finished.
     *
     * @returns {Promise}
     * @private
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isOpen) {
                return;
            }
            this.isOpen = false;
            this._stream.destroy();
            this._inventory.clear();
            yield this._waitForFlush();
            this.emit('close');
        });
    }
    /**
     * Gets the subscriber client instance.
     *
     * @returns {Promise<object>}
     * @private
     */
    getClient() {
        return __awaiter(this, void 0, void 0, function* () {
            const pubsub = this._subscription.pubsub;
            const [client] = yield promisify_1.promisify(pubsub.getClient_).call(pubsub, {
                client: 'SubscriberClient'
            });
            return client;
        });
    }
    /**
     * Modifies the acknowledge deadline for the provided message.
     *
     * @param {Message} message The message to modify.
     * @param {number} deadline The deadline.
     * @returns {Promise}
     * @private
     */
    modAck(message, deadline) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            this._modAcks.add(message, deadline);
            yield this._modAcks.onFlush();
            const latency = (Date.now() - startTime) / 1000;
            this._latencies.add(latency);
        });
    }
    /**
     * Modfies the acknowledge deadline for the provided message and then removes
     * it from our inventory.
     *
     * @param {Message} message The message.
     * @param {number} [delay=0] Delay to wait before redelivery.
     * @return {Promise}
     * @private
     */
    nack(message, delay = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modAck(message, delay);
            this._inventory.remove(message);
        });
    }
    /**
     * Starts pulling messages.
     * @private
     */
    open() {
        const { batching, flowControl, streamingOptions } = this._options;
        this._acks = new message_queues_1.AckQueue(this, batching);
        this._modAcks = new message_queues_1.ModAckQueue(this, batching);
        this._inventory = new lease_manager_1.LeaseManager(this, flowControl);
        this._stream = new message_stream_1.MessageStream(this, streamingOptions);
        this._stream.on('error', err => this.emit('error', err))
            .on('data', (data) => this._onData(data))
            .once('close', () => this.close());
        this._inventory.on('full', () => this._stream.pause())
            .on('free', () => this._stream.resume());
        this.isOpen = true;
    }
    /**
     * Sets subscriber options.
     *
     * @param {SubscriberOptions} options The options.
     * @private
     */
    setOptions(options) {
        this._options = options;
        if (options.ackDeadline) {
            this.ackDeadline = options.ackDeadline;
            this._isUserSetDeadline = true;
        }
        // in the event that the user has specified the maxMessages option, we want
        // to make sure that the maxStreams option isn't higher
        // it doesn't really make sense to open 5 streams if the user only wants
        // 1 message at a time.
        if (options.flowControl) {
            const { maxMessages = 100 } = options.flowControl;
            if (!options.streamingOptions) {
                options.streamingOptions = {};
            }
            const { maxStreams = 5 } = options.streamingOptions;
            options.streamingOptions.maxStreams = Math.min(maxStreams, maxMessages);
        }
    }
    /**
     * Callback to be invoked when a new message is available.
     *
     * New messages will be added to the subscribers inventory, which in turn will
     * automatically extend the messages ack deadline until either:
     *   a. the user acks/nacks it
     *   b. the maxExtension option is hit
     *
     * If the message puts us at/over capacity, then we'll pause our message
     * stream until we've freed up some inventory space.
     *
     * New messages must immediately issue a ModifyAckDeadline request
     * (aka receipt) to confirm with the backend that we did infact receive the
     * message and its ok to start ticking down on the deadline.
     *
     * @private
     */
    _onData(response) {
        response.receivedMessages.forEach((data) => {
            const message = new Message(this, data);
            message.modAck(this.ackDeadline);
            this._inventory.add(message);
        });
    }
    /**
     * Returns a promise that will resolve once all pending requests have settled.
     *
     * @private
     *
     * @returns {Promise}
     */
    _waitForFlush() {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            if (this._acks.numPendingRequests) {
                promises.push(this._acks.onFlush());
                this._acks.flush();
            }
            if (this._modAcks.numPendingRequests) {
                promises.push(this._modAcks.onFlush());
                this._modAcks.flush();
            }
            yield Promise.all(promises);
        });
    }
}
exports.Subscriber = Subscriber;
//# sourceMappingURL=subscriber.js.map