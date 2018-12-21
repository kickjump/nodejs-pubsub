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
const paginator_1 = require("@google-cloud/paginator");
const promisify_1 = require("@google-cloud/promisify");
const is = require("is");
const iam_1 = require("./iam");
const publisher_1 = require("./publisher");
const util = require("./util");
/**
 * A Topic object allows you to interact with a Cloud Pub/Sub topic.
 *
 * @class
 * @param {PubSub} pubsub PubSub object.
 * @param {string} name Name of the topic.
 *
 * @example
 * const {PubSub} = require('@google-cloud/pubsub');
 * const pubsub = new PubSub();
 *
 * const topic = pubsub.topic('my-topic');
 */
class Topic {
    constructor(pubsub, name, options) {
        this.getSubscriptionsStream = paginator_1.paginator.streamify('getSubscriptions');
        if (pubsub.Promise) {
            this.Promise = pubsub.Promise;
        }
        /**
         * The fully qualified name of this topic.
         * @name Topic#name
         * @type {string}
         */
        this.name = Topic.formatName_(pubsub.projectId, name);
        this.publisher = new publisher_1.Publisher(this, options);
        /**
         * The parent {@link PubSub} instance of this topic instance.
         * @name Topic#pubsub
         * @type {PubSub}
         */
        /**
         * The parent {@link PubSub} instance of this topic instance.
         * @name Topic#parent
         * @type {PubSub}
         */
        this.parent = this.pubsub = pubsub;
        // tslint:disable-next-line no-any
        this.request = pubsub.request.bind(pubsub);
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
         * @name Topic#iam
         * @mixes IAM
         *
         * @see [Access Control Overview]{@link https://cloud.google.com/pubsub/access_control}
         * @see [What is Cloud IAM?]{@link https://cloud.google.com/iam/}
         *
         * @example
         * const {PubSub} = require('@google-cloud/pubsub');
         * const pubsub = new PubSub();
         *
         * const topic = pubsub.topic('my-topic');
         *
         * //-
         * // Get the IAM policy for your topic.
         * //-
         * topic.iam.getPolicy((err, policy) => {
         *   console.log(policy);
         * });
         *
         * //-
         * // If the callback is omitted, we'll return a Promise.
         * //-
         * topic.iam.getPolicy().then((data) => {
         *   const policy = data[0];
         *   const apiResponse = data[1];
         * });
         */
        this.iam = new iam_1.IAM(pubsub, this.name);
    }
    create(gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        this.pubsub.createTopic(this.name, gaxOpts, callback);
    }
    createSubscription(name, optionsOrCallback, callback) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        this.pubsub.createSubscription(this, name, options, callback);
    }
    delete(gaxOptsOrCallback, callback) {
        const gaxOpts = typeof gaxOptsOrCallback === 'object' ? gaxOptsOrCallback : {};
        callback =
            typeof gaxOptsOrCallback === 'function' ? gaxOptsOrCallback : callback;
        callback = callback || util.noop;
        const reqOpts = {
            topic: this.name,
        };
        this.request({
            client: 'PublisherClient',
            method: 'deleteTopic',
            reqOpts,
            gaxOpts: gaxOpts,
        }, callback);
    }
    /**
     * @typedef {array} TopicExistsResponse
     * @property {boolean} 0 Whether the topic exists
     */
    /**
     * @callback TopicExistsCallback
     * @param {?Error} err Request error, if any.
     * @param {boolean} exists Whether the topic exists.
     */
    /**
     * Check if a topic exists.
     *
     * @param {TopicExistsCallback} [callback] Callback function.
     * @returns {Promise<TopicExistsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.exists((err, exists) => {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.exists().then((data) => {
     *   const exists = data[0];
     * });
     */
    exists(callback) {
        this.getMetadata((err) => {
            if (!err) {
                callback(null, true);
                return;
            }
            let code = 0;
            if (err.hasOwnProperty('code')) {
                code =
                    Object.getOwnPropertyDescriptor(err, 'code')
                        .value;
            }
            if (code === 5) {
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
        const autoCreate = !!gaxOpts.autoCreate;
        delete gaxOpts.autoCreate;
        this.getMetadata(gaxOpts, (err, apiResponse) => {
            if (!err) {
                callback(null, this, apiResponse);
                return;
            }
            let code = 0;
            if (err.hasOwnProperty('code')) {
                code =
                    Object.getOwnPropertyDescriptor(err, 'code')
                        .value;
            }
            if (code !== 5 || !autoCreate) {
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
            topic: this.name,
        };
        this.request({
            client: 'PublisherClient',
            method: 'getTopic',
            reqOpts,
            gaxOpts: gaxOpts,
        }, (err, apiResponse) => {
            if (!err) {
                this.metadata = apiResponse;
            }
            callback(err, apiResponse);
        });
    }
    getSubscriptions(optionsOrCallback, callback) {
        const self = this;
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        callback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        const reqOpts = Object.assign({
            topic: this.name,
        }, options);
        delete reqOpts.gaxOpts;
        delete reqOpts.autoPaginate;
        const gaxOpts = Object.assign({
            autoPaginate: options.autoPaginate,
        }, options.gaxOpts);
        this.request({
            client: 'PublisherClient',
            method: 'listTopicSubscriptions',
            reqOpts,
            gaxOpts,
        }, 
        // tslint:disable-next-line no-any
        (...args) => {
            const subscriptions = args[1];
            if (subscriptions) {
                args[1] = subscriptions.map((sub) => {
                    // ListTopicSubscriptions only returns sub names
                    return self.subscription(sub);
                });
            }
            callback(...args);
        });
    }
    publish(data, attributes, callback) {
        return this.publisher.publish(data, attributes, callback);
    }
    publishJSON(json, attributes, callback) {
        if (!is.object(json)) {
            throw new Error('First parameter should be an object.');
        }
        const data = Buffer.from(JSON.stringify(json));
        return this.publish(data, attributes, callback);
    }
    /**
     * Set the publisher options.
     *
     * @param {PublishOptions} options The publisher options.
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.setPublishOptions({
     *   batching: {
     *     maxMilliseconds: 10
     *   }
     * });
     */
    setPublishOptions(options) {
        this.publisher.setOptions(options);
    }
    /**
     * Create a Subscription object. This command by itself will not run any API
     * requests. You will receive a {module:pubsub/subscription} object,
     * which will allow you to interact with a subscription.
     *
     * @throws {Error} If subscription name is omitted.
     *
     * @param {string} name Name of the subscription.
     * @param {object} [options] Configuration object.
     * @param {object} [options.flowControl] Flow control configurations for
     *     receiving messages. Note that these options do not persist across
     *     subscription instances.
     * @param {number} [options.flowControl.maxBytes] The maximum number of bytes
     *     in un-acked messages to allow before the subscription pauses incoming
     *     messages. Defaults to 20% of free memory.
     * @param {number} [options.flowControl.maxMessages=Infinity] The maximum number
     *     of un-acked messages to allow before the subscription pauses incoming
     *     messages.
     * @param {number} [options.maxConnections=5] Use this to limit the number of
     *     connections to be used when sending and receiving messages.
     * @return {Subscription}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * // Register a listener for `message` events.
     * subscription.on('message', (message) => {
     *   // Called every time a message is received.
     *   // message.id = ID of the message.
     *   // message.ackId = ID used to acknowledge the message receival.
     *   // message.data = Contents of the message.
     *   // message.attributes = Attributes of the message.
     *   // message.publishTime = Timestamp when Pub/Sub received the message.
     * });
     */
    subscription(name, options) {
        options = options || {};
        options.topic = this;
        return this.pubsub.subscription(name, options);
    }
    /**
     * Format the name of a topic. A Topic's full name is in the format of
     * 'projects/{projectId}/topics/{topicName}'.
     *
     * @private
     *
     * @return {string}
     */
    static formatName_(projectId, name) {
        // Simple check if the name is already formatted.
        if (name.indexOf('/') > -1) {
            return name;
        }
        return 'projects/' + projectId + '/topics/' + name;
    }
}
exports.Topic = Topic;
/**
 * Get a list of the {module:pubsub/subscription} objects registered to this
 * topic as a readable object stream.
 *
 * @method PubSub#getSubscriptionsStream
 * @param {GetSubscriptionsRequest} [options] Configuration object. See
 *     {@link PubSub#getSubscriptions} for a complete list of options.
 * @returns {ReadableStream} A readable stream of {@link Subscription} instances.
 *
 * @example
 * const {PubSub} = require('@google-cloud/pubsub');
 * const pubsub = new PubSub();
 *
 * const topic = pubsub.topic('my-topic');
 *
 * topic.getSubscriptionsStream()
 *   .on('error', console.error)
 *   .on('data', (subscription) => {
 *     // subscription is a Subscription object.
 *   })
 *   .on('end', () => {
 *     // All subscriptions retrieved.
 *   });
 *
 * //-
 * // If you anticipate many results, you can end a stream early to prevent
 * // unnecessary processing and API requests.
 * //-
 * topic.getSubscriptionsStream()
 *   .on('data', function(subscription) {
 *     this.end();
 *   });
 */
/*! Developer Documentation
 *
 * These methods can be agto-paginated.
 */
paginator_1.paginator.extend(Topic, ['getSubscriptions']);
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(Topic, {
    exclude: ['publish', 'publishJSON', 'setPublishOptions', 'subscription'],
});
//# sourceMappingURL=topic.js.map