"use strict";
/*!
 * Copyright 2014 Google Inc. All Rights Reserved.
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
const events_1 = require("events");
const extend = require("extend");
const is = require("is");
const snakeCase = require("lodash.snakecase");
const iam_1 = require("./iam");
const snapshot_1 = require("./snapshot");
const subscriber_1 = require("./subscriber");
const util_1 = require("./util");
/**
 * A Subscription object will give you access to your Cloud Pub/Sub
 * subscription.
 *
 * Subscriptions are sometimes retrieved when using various methods:
 *
 * - {@link Pubsub#getSubscriptions}
 * - {@link Topic#getSubscriptions}
 * - {@link Topic#createSubscription}
 *
 * Subscription objects may be created directly with:
 *
 * - {@link Topic#subscription}
 *
 * All Subscription objects are instances of an
 * [EventEmitter](http://nodejs.org/api/events.html). The subscription will pull
 * for messages automatically as long as there is at least one listener assigned
 * for the `message` event.
 *
 * By default Subscription objects allow you to process 100 messages at the same
 * time. You can fine tune this value by adjusting the
 * `options.flowControl.maxMessages` option.
 *
 * If your subscription is seeing more re-deliveries than preferable, you might
 * try increasing your `options.ackDeadline` value or decreasing the
 * `options.streamingOptions.maxStreams` value.
 *
 * Subscription objects handle ack management, by automatically extending the
 * ack deadline while the message is being processed, to then issue the ack or
 * nack of such message when the processing is done. **Note:** message
 * redelivery is still possible.
 *
 * @class
 *
 * @param {PubSub} pubsub PubSub object.
 * @param {string} name The name of the subscription.
 * @param {SubscriberOptions} [options] Options for handling messages.
 *
 * @example
 * const {PubSub} = require('@google-cloud/pubsub');
 * const pubsub = new PubSub();
 *
 * //-
 * // From {@link PubSub#getSubscriptions}:
 * //-
 * pubsub.getSubscriptions((err, subscriptions) => {
 *   // `subscriptions` is an array of Subscription objects.
 * });
 *
 * //-
 * // From {@link Topic#getSubscriptions}:
 * //-
 * const topic = pubsub.topic('my-topic');
 * topic.getSubscriptions((err, subscriptions) => {
 *   // `subscriptions` is an array of Subscription objects.
 * });
 *
 * //-
 * // From {@link Topic#createSubscription}:
 * //-
 * const topic = pubsub.topic('my-topic');
 * topic.createSubscription('new-subscription', (err, subscription) => {
 *   // `subscription` is a Subscription object.
 * });
 *
 * //-
 * // From {@link Topic#subscription}:
 * //-
 * const topic = pubsub.topic('my-topic');
 * const subscription = topic.subscription('my-subscription');
 * // `subscription` is a Subscription object.
 *
 * //-
 * // Once you have obtained a subscription object, you may begin to register
 * // listeners. This will automatically trigger pulling for messages.
 * //-
 *
 * // Register an error handler.
 * subscription.on('error', (err) => {});
 *
 * // Register a close handler in case the subscriber closes unexpectedly
 * subscription.on('close', () => {});
 *
 * // Register a listener for `message` events.
 * function onMessage(message) {
 *   // Called every time a message is received.
 *
 *   // message.id = ID of the message.
 *   // message.ackId = ID used to acknowledge the message receival.
 *   // message.data = Contents of the message.
 *   // message.attributes = Attributes of the message.
 *   // message.publishTime = Date when Pub/Sub received the message.
 *
 *   // Ack the message:
 *   // message.ack();
 *
 *   // This doesn't ack the message, but allows more messages to be retrieved
 *   // if your limit was hit or if you don't want to ack the message.
 *   // message.nack();
 * }
 * subscription.on('message', onMessage);
 *
 * // Remove the listener from receiving `message` events.
 * subscription.removeListener('message', onMessage);
 */
class Subscription extends events_1.EventEmitter {
    constructor(pubsub, name, options) {
        super();
        options = options || {};
        this.pubsub = pubsub;
        this.request = pubsub.request.bind(pubsub);
        this.name = Subscription.formatName_(this.projectId, name);
        if (options.topic) {
            this.create = pubsub.createSubscription.bind(pubsub, options.topic, name);
        }
        /**
         * [IAM (Identity and Access
         * Management)](https://cloud.google.com/pubsub/access_control) allows you
         * to set permissions on individual resources and offers a wider range of
         * roles: editor, owner, publisher, subscriber, and viewer. This gives you
         * greater flexibility and allows you to set more fine-grained access
         * control.
         *
         * *The IAM access control features described in this document are Beta,
         * including the API methods to get and set IAM policies, and to test IAM
         * permissions. Cloud Pub/Sub's use of IAM features is not covered by
         * any SLA or deprecation policy, and may be subject to
         * backward-incompatible changes.*
         *
         * @name Subscription#iam
         * @mixes IAM
         *
         * @see [Access Control Overview]{@link https://cloud.google.com/pubsub/access_control}
         * @see [What is Cloud IAM?]{@link https://cloud.google.com/iam/}
         *
         * @example
         * //-
         * // Get the IAM policy for your subscription.
         * //-
         * subscription.iam.getPolicy((err, policy) => {
         *   console.log(policy);
         * });
         *
         * //-
         * // If the callback is omitted, we'll return a Promise.
         * //-
         * subscription.iam.getPolicy().then((data) => {
         *   const policy = data[0];
         *   const apiResponse = data[1];
         * });
         */
        this.iam = new iam_1.IAM(pubsub, this.name);
        this._subscriber = new subscriber_1.Subscriber(this, options);
        this._subscriber.on('error', err => this.emit('error', err))
            .on('message', message => this.emit('message', message))
            .on('close', () => this.emit('close'));
        this._listen();
    }
    /**
     * Indicates if the Subscription is open and receiving messages.
     *
     * @type {boolean}
     */
    get isOpen() {
        return !!(this._subscriber && this._subscriber.isOpen);
    }
    /**
     * @type {string}
     */
    get projectId() {
        return this.pubsub && this.pubsub.projectId || '{{projectId}}';
    }
    close(callback) {
        this._subscriber.close().then(() => callback(), callback);
    }
    createSnapshot(name, gaxOptsOrCallback, callback) {
        if (!is.string(name)) {
            throw new Error('A name is required to create a snapshot.');
        }
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const snapshot = this.snapshot(name);
        const reqOpts = {
            name: snapshot.name,
            subscription: this.name,
        };
        this.request({
            client: 'SubscriberClient',
            method: 'createSnapshot',
            reqOpts,
            gaxOpts,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            snapshot.metadata = resp;
            callback(null, snapshot, resp);
        });
    }
    delete(gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        callback = callback || util_1.noop;
        const reqOpts = {
            subscription: this.name,
        };
        if (this.isOpen) {
            this._subscriber.close();
        }
        this.request({
            client: 'SubscriberClient',
            method: 'deleteSubscription',
            reqOpts,
            gaxOpts,
        }, callback);
    }
    exists(callback) {
        this.getMetadata(err => {
            if (!err) {
                callback(null, true);
                return;
            }
            if (err.code === 5) {
                callback(null, false);
                return;
            }
            callback(err);
        });
    }
    get(gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const autoCreate = !!gaxOpts.autoCreate && is.fn(this.create);
        delete gaxOpts.autoCreate;
        this.getMetadata(gaxOpts, (err, apiResponse) => {
            if (!err) {
                callback(null, this, apiResponse);
                return;
            }
            if (err.code !== 5 || !autoCreate) {
                callback(err, null, apiResponse);
                return;
            }
            this.create(gaxOpts, callback);
        });
    }
    getMetadata(gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const reqOpts = {
            subscription: this.name,
        };
        this.request({
            client: 'SubscriberClient',
            method: 'getSubscription',
            reqOpts,
            gaxOpts,
        }, (err, apiResponse) => {
            if (!err) {
                this.metadata = apiResponse;
            }
            callback(err, apiResponse);
        });
    }
    modifyPushConfig(config, gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const reqOpts = {
            subscription: this.name,
            pushConfig: config,
        };
        this.request({
            client: 'SubscriberClient',
            method: 'modifyPushConfig',
            reqOpts,
            gaxOpts,
        }, callback);
    }
    /**
     * Opens the Subscription to receive messages. In general this method
     * shouldn't need to be called, unless you wish to receive messages after
     * calling {@link Subscription#close}. Alternatively one could just assign a
     * new `message` event listener which will also re-open the Subscription.
     *
     * @example
     * subscription.on('message', message => message.ack());
     *
     * // Close the subscription.
     * subscription.close(err => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   The subscription has been closed and messages will no longer be received.
     * });
     *
     * // Resume receiving messages.
     * subscription.open();
     */
    open() {
        if (!this._subscriber.isOpen) {
            this._subscriber.open();
        }
    }
    seek(snapshot, gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const reqOpts = {
            subscription: this.name,
        };
        if (typeof snapshot === 'string') {
            reqOpts.snapshot = snapshot_1.Snapshot.formatName_(this.pubsub.projectId, snapshot);
        }
        else if (is.date(snapshot)) {
            reqOpts.time = snapshot;
        }
        else {
            throw new Error('Either a snapshot name or Date is needed to seek to.');
        }
        this.request({
            client: 'SubscriberClient',
            method: 'seek',
            reqOpts,
            gaxOpts,
        }, callback);
    }
    setMetadata(metadata, gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        const subscription = Subscription.formatMetadata_(metadata);
        const fields = Object.keys(subscription).map(snakeCase);
        subscription.name = this.name;
        const reqOpts = {
            subscription,
            updateMask: {
                paths: fields,
            },
        };
        this.request({
            client: 'SubscriberClient',
            method: 'updateSubscription',
            reqOpts,
            gaxOpts,
        }, callback);
    }
    /**
     * Sets the Subscription options.
     *
     * @param {SubscriberOptions} options The options.
     */
    setOptions(options) {
        this._subscriber.setOptions(options);
    }
    /**
     * Create a Snapshot object. See {@link Subscription#createSnapshot} to
     * create a snapshot.
     *
     * @throws {Error} If a name is not provided.
     *
     * @param {string} name The name of the snapshot.
     * @returns {Snapshot}
     *
     * @example
     * const snapshot = subscription.snapshot('my-snapshot');
     */
    snapshot(name) {
        return this.pubsub.snapshot.call(this, name);
    }
    /**
     * Watches for incoming message event handlers and open/closes the
     * subscriber as needed.
     *
     * @private
     */
    _listen() {
        this.on('newListener', event => {
            if (!this.isOpen && event === 'message') {
                this._subscriber.open();
            }
        });
        this.on('removeListener', event => {
            if (this.isOpen && this.listenerCount('message') === 0) {
                this._subscriber.close();
            }
        });
    }
    /*!
     * Formats Subscription metadata.
     *
     * @private
     */
    static formatMetadata_(metadata) {
        let formatted = {};
        if (metadata.messageRetentionDuration) {
            formatted.retainAckedMessages = true;
            formatted.messageRetentionDuration = {
                seconds: metadata.messageRetentionDuration,
                nanos: 0,
            };
            delete metadata.messageRetentionDuration;
            delete metadata.retainAckedMessages;
        }
        if (metadata.pushEndpoint) {
            formatted.pushConfig = {
                pushEndpoint: metadata.pushEndpoint,
            };
            delete metadata.pushEndpoint;
        }
        formatted = extend(true, formatted, metadata);
        return formatted;
    }
    /*!
     * Format the name of a subscription. A subscription's full name is in the
     * format of projects/{projectId}/subscriptions/{subName}.
     *
     * @private
     */
    static formatName_(projectId, name) {
        // Simple check if the name is already formatted.
        if (name.indexOf('/') > -1) {
            return name;
        }
        return 'projects/' + projectId + '/subscriptions/' + name;
    }
}
exports.Subscription = Subscription;
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(Subscription, {
    exclude: ['open', 'snapshot'],
});
//# sourceMappingURL=subscription.js.map