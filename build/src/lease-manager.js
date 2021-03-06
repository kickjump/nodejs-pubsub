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
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const os_1 = require("os");
/**
 * Manages a Subscribers inventory while auto-magically extending the message
 * deadlines.
 *
 * @private
 * @class
 *
 * @param {Subscriber} sub The subscriber to manage leases for.
 * @param {FlowControlOptions} options Flow control options.
 */
class LeaseManager extends events_1.EventEmitter {
    constructor(sub, options = {}) {
        super();
        this.bytes = 0;
        this._isLeasing = false;
        this._messages = new Set();
        this._pending = [];
        this._subscriber = sub;
        this.setOptions(options);
    }
    /**
     * @type {number}
     * @private
     */
    get pending() {
        return this._pending.length;
    }
    /**
     * @type {number}
     * @private
     */
    get size() {
        return this._messages.size;
    }
    /**
     * Adds a message to the inventory, kicking off the deadline extender if it
     * isn't already running.
     *
     * @param {Message} message The message.
     * @private
     */
    add(message) {
        const { allowExcessMessages } = this._options;
        const wasFull = this.isFull();
        this._messages.add(message);
        this.bytes += message.length;
        if (allowExcessMessages || !wasFull) {
            this._dispense(message);
        }
        else {
            this._pending.push(message);
        }
        if (!this._isLeasing) {
            this._isLeasing = true;
            this._scheduleExtension();
        }
        if (!wasFull && this.isFull()) {
            this.emit('full');
        }
    }
    /**
     * Removes ALL messages from inventory.
     * @private
     */
    clear() {
        const wasFull = this.isFull();
        this._pending = [];
        this._messages.clear();
        this.bytes = 0;
        if (wasFull) {
            process.nextTick(() => this.emit('free'));
        }
        this._cancelExtension();
    }
    /**
     * Indicates if we're at or over capacity.
     *
     * @returns {boolean}
     * @private
     */
    isFull() {
        const { maxBytes, maxMessages } = this._options;
        return this.size >= maxMessages || this.bytes >= maxBytes;
    }
    /**
     * Removes a message from the inventory. Stopping the deadline extender if no
     * messages are left over.
     *
     * @fires LeaseManager#free
     *
     * @param {Message} message The message to remove.
     * @private
     */
    remove(message) {
        if (!this._messages.has(message)) {
            return;
        }
        const wasFull = this.isFull();
        this._messages.delete(message);
        this.bytes -= message.length;
        if (wasFull && !this.isFull()) {
            process.nextTick(() => this.emit('free'));
        }
        else if (this._pending.includes(message)) {
            const index = this._pending.indexOf(message);
            this._pending.splice(index, 1);
        }
        else if (this.pending > 0) {
            this._dispense(this._pending.shift());
        }
        if (this.size === 0 && this._isLeasing) {
            this._cancelExtension();
        }
    }
    /**
     * Sets options for the LeaseManager.
     *
     * @param {FlowControlOptions} [options] The options.
     * @private
     */
    setOptions(options) {
        const defaults = {
            allowExcessMessages: true,
            maxBytes: os_1.freemem() * 0.2,
            maxExtension: Infinity,
            maxMessages: 100
        };
        this._options = Object.assign(defaults, options);
    }
    /**
     * Stops extending message deadlines.
     *
     * @private
     */
    _cancelExtension() {
        this._isLeasing = false;
        if (this._timer) {
            clearTimeout(this._timer);
            delete this._timer;
        }
    }
    /**
     * Emits the message. Emitting messages is very slow, so to avoid it acting
     * as a bottleneck, we're wrapping it in nextTick.
     *
     * @private
     *
     * @fires Subscriber#message
     *
     * @param {Message} message The message to emit.
     */
    _dispense(message) {
        process.nextTick(() => this._subscriber.emit('message', message));
    }
    /**
     * Loops through inventory and extends the deadlines for any messages that
     * have not hit the max extension option.
     *
     * @private
     */
    _extendDeadlines() {
        const deadline = this._subscriber.ackDeadline;
        for (const message of this._messages) {
            const lifespan = (Date.now() - message.received) / 1000;
            if (lifespan < this._options.maxExtension) {
                message.modAck(deadline);
            }
            else {
                this.remove(message);
            }
        }
        if (this._isLeasing) {
            this._scheduleExtension();
        }
    }
    /**
     * Creates a timeout(ms) that should allow us to extend any message deadlines
     * before they would be redelivered.
     *
     * @private
     *
     * @returns {number}
     */
    _getNextExtensionTimeoutMs() {
        const jitter = Math.random();
        const deadline = this._subscriber.ackDeadline * 1000;
        const latency = this._subscriber.modAckLatency;
        return (deadline * 0.9 - latency) * jitter;
    }
    /**
     * Schedules an deadline extension for all messages.
     *
     * @private
     */
    _scheduleExtension() {
        const timeout = this._getNextExtensionTimeoutMs();
        this._timer = setTimeout(() => this._extendDeadlines(), timeout);
    }
}
exports.LeaseManager = LeaseManager;
//# sourceMappingURL=lease-manager.js.map