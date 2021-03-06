"use strict";
/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
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
const promisify_1 = require("@google-cloud/promisify");
const arrify = require("arrify");
const each = require('async-each');
const extend = require("extend");
const is = require("is");
/**
 * A Publisher object allows you to publish messages to a specific topic.
 *
 * @private
 * @class
 *
 * @see [Topics: publish API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/publish}
 *
 * @param {Topic} topic The topic associated with this publisher.
 * @param {PublishOptions} [options] Configuration object.
 *
 * @example
 * const {PubSub} = require('@google-cloud/pubsub');
 * const pubsub = new PubSub();
 *
 * const topic = pubsub.topic('my-topic');
 * const publisher = topic.publisher();
 */
class Publisher {
    constructor(topic, options) {
        if (topic.Promise) {
            this.Promise = topic.Promise;
        }
        this.setOptions(options);
        this.topic = topic;
        // this object keeps track of all messages scheduled to be published
        // queued is essentially the `messages` field for the publish rpc req opts
        // bytes is used to track the size of the combined payload
        // callbacks is an array of callbacks - each callback is associated with a
        // specific message.
        this.inventory_ = {
            callbacks: [],
            queued: [],
            bytes: 0,
        };
    }
    publish(data, attributes, callback) {
        if (!(data instanceof Buffer)) {
            throw new TypeError('Data must be in the form of a Buffer.');
        }
        if (is.fn(attributes)) {
            callback = attributes;
            attributes = {};
        }
        // Ensure the `attributes` object only has string values
        for (const key of Object.keys(attributes)) {
            const value = attributes[key];
            if (!is.string(value)) {
                throw new TypeError(`All attributes must be in the form of a string.
\nInvalid value of type "${typeof value}" provided for "${key}".`);
            }
        }
        const opts = this.settings.batching;
        // if this message puts us over the maxBytes option, then let's ship
        // what we have and add it to the next batch
        if (this.inventory_.bytes > 0 &&
            this.inventory_.bytes + data.length > opts.maxBytes) {
            this.publish_();
        }
        // add it to the queue!
        this.queue_(data, attributes, callback);
        // next lets check if this message brings us to the message cap or if we
        // hit the max byte limit
        const hasMaxMessages = this.inventory_.queued.length === opts.maxMessages;
        if (this.inventory_.bytes >= opts.maxBytes || hasMaxMessages) {
            this.publish_();
            return;
        }
        // otherwise let's set a timeout to send the next batch
        if (!this.timeoutHandle_) {
            this.timeoutHandle_ =
                setTimeout(this.publish_.bind(this), opts.maxMilliseconds);
        }
    }
    /**
     * Sets the Publisher options.
     *
     * @private
     *
     * @param {PublishOptions} options The publisher options.
     */
    setOptions(options = {}) {
        const defaults = {
            batching: {
                maxBytes: Math.pow(1024, 2) * 5,
                maxMessages: 1000,
                maxMilliseconds: 100,
            },
        };
        const { batching, gaxOpts } = extend(true, defaults, options);
        this.settings = {
            batching: {
                maxBytes: Math.min(batching.maxBytes, Math.pow(1024, 2) * 9),
                maxMessages: Math.min(batching.maxMessages, 1000),
                maxMilliseconds: batching.maxMilliseconds,
            },
            gaxOpts,
        };
    }
    /**
     * This publishes a batch of messages and should never be called directly.
     *
     * @private
     */
    publish_() {
        const callbacks = this.inventory_.callbacks;
        const messages = this.inventory_.queued;
        this.inventory_.callbacks = [];
        this.inventory_.queued = [];
        this.inventory_.bytes = 0;
        if (this.timeoutHandle_) {
            clearTimeout(this.timeoutHandle_);
            delete this.timeoutHandle_;
        }
        const reqOpts = {
            topic: this.topic.name,
            messages,
        };
        this.topic.request({
            client: 'PublisherClient',
            method: 'publish',
            reqOpts,
            gaxOpts: this.settings.gaxOpts,
        }, (err, resp) => {
            const messageIds = arrify(resp && resp.messageIds);
            each(callbacks, (callback, next) => {
                const messageId = messageIds[callbacks.indexOf(callback)];
                callback(err, messageId);
                next();
            });
        });
    }
    /**
     * Queues message to be sent to the server.
     *
     * @private
     *
     * @param {buffer} data The message data.
     * @param {object} attributes The message attributes.
     * @param {function} callback The callback function.
     */
    queue_(data, attrs, callback) {
        this.inventory_.queued.push({
            data,
            attributes: attrs,
        });
        this.inventory_.bytes += data.length;
        this.inventory_.callbacks.push(callback);
    }
}
exports.Publisher = Publisher;
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(Publisher, {
    singular: true,
    exclude: ['setOptions'],
});
//# sourceMappingURL=publisher.js.map