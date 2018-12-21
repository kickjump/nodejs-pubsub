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
/// <reference types="node" />
import { CallOptions } from 'google-gax';
import { Readable } from 'stream';
import { google } from '../proto/pubsub';
import { CreateSubscriptionCallback, CreateSubscriptionOptions, CreateSubscriptionResponse, CreateTopicCallback, CreateTopicResponse, ExistsCallback, GetCallOptions, Metadata, PubSub, RequestCallback, SubscriptionCallOptions } from '.';
import { IAM } from './iam';
import { PublishCallback, Publisher, PublishOptions } from './publisher';
import { Subscription } from './subscription';
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
export declare class Topic {
    Promise?: PromiseConstructor;
    name: string;
    parent: PubSub;
    pubsub: PubSub;
    request: typeof PubSub.prototype.request;
    iam: IAM;
    metadata: Metadata;
    publisher: Publisher;
    getSubscriptionsStream: () => Readable;
    constructor(pubsub: PubSub, name: string, options?: PublishOptions);
    /**
     * Create a topic.
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {CreateTopicCallback} [callback] Callback function.
     * @returns {Promise<CreateTopicResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.create((err, topic, apiResponse) => {
     *   if (!err) {
     *     // The topic was created successfully.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.create().then((data) => {
     *   const topic = data[0];
     *   const apiResponse = data[1];
     * });
     */
    create(gaxOpts?: CallOptions): Promise<CreateTopicResponse>;
    create(callback: CreateTopicCallback): void;
    create(gaxOpts: CallOptions, callback: CreateTopicCallback): void;
    /**
     * Create a subscription to this topic.
     *
     * @see [Subscriptions: create API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/create}
     *
     * @throws {Error} If subscription name is omitted.
     *
     * @param {string} name The name of the subscription.
     * @param {CreateSubscriptionRequest} [options] See a
     *     [Subscription
     * resource](https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions).
     * @param {CreateSubscriptionCallback} [callback] Callback function.
     * @returns {Promise<CreateSubscriptionResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const callback = function(err, subscription, apiResponse) {};
     *
     * // Without specifying any options.
     * topic.createSubscription('newMessages', callback);
     *
     * // With options.
     * topic.createSubscription('newMessages', {
     *   ackDeadlineSeconds: 90
     * }, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.createSubscription('newMessages').then((data) => {
     *   const subscription = data[0];
     *   const apiResponse = data[1];
     * });
     */
    createSubscription(name: string, callback: CreateSubscriptionCallback): void;
    createSubscription(name: string, options?: CreateSubscriptionOptions): Promise<CreateSubscriptionResponse>;
    createSubscription(name: string, options: CreateSubscriptionOptions, callback: CreateSubscriptionCallback): void;
    /**
     * Delete the topic. This will not delete subscriptions to this topic.
     *
     * @see [Topics: delete API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/delete}
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {function} [callback] The callback function.
     * @param {?error} callback.err An error returned while making this
     *     request.
     * @param {object} callback.apiResponse Raw API response.
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.delete((err, apiResponse) => {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.delete().then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    delete(callback: RequestCallback<google.protobuf.Empty>): void;
    delete(gaxOpts?: CallOptions): Promise<google.protobuf.Empty>;
    delete(gaxOpts: CallOptions, callback: RequestCallback<google.protobuf.Empty>): void;
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
    exists(callback: ExistsCallback): void;
    /**
     * @typedef {array} GetTopicResponse
     * @property {Topic} 0 The {@link Topic}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetTopicCallback
     * @param {?Error} err Request error, if any.
     * @param {Topic} topic The {@link Topic}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get a topic if it exists.
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {boolean} [gaxOpts.autoCreate=false] Automatically create the topic
     *     does not already exist.
     * @param {GetTopicCallback} [callback] Callback function.
     * @returns {Promise<GetTopicResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.get((err, topic, apiResponse) => {
     *   // The `topic` data has been populated.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.get().then((data) => {
     *   const topic = data[0];
     *   const apiResponse = data[1];
     * });
     */
    get(callback: CreateTopicCallback): void;
    get(gaxOpts?: CallOptions & GetCallOptions): Promise<Topic>;
    get(gaxOpts: CallOptions & GetCallOptions, callback: CreateTopicCallback): void;
    /**
     * @typedef {array} GetTopicMetadataResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback GetTopicMetadataCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get the official representation of this topic from the API.
     *
     * @see [Topics: get API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/get}
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {GetTopicMetadataCallback} [callback] Callback function.
     * @returns {Promise<GetTopicMetadataResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.getMetadata((err, apiResponse) => {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.getMetadata().then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    getMetadata(callback: RequestCallback<google.pubsub.v1.Topic>): void;
    getMetadata(gaxOpts: CallOptions, callback: RequestCallback<google.pubsub.v1.Topic>): void;
    getMetadata(gaxOpts?: CallOptions): Promise<google.pubsub.v1.Topic>;
    /**
     * Get a list of the subscriptions registered to this topic. You may
     * optionally provide a query object as the first argument to customize the
     * response.
     *
     * Your provided callback will be invoked with an error object if an API error
     * occurred or an array of {module:pubsub/subscription} objects.
     *
     * @see [Subscriptions: list API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics.subscriptions/list}
     *
     * @param {GetSubscriptionsRequest} [query] Query object for listing subscriptions.
     * @param {GetSubscriptionsCallback} [callback] Callback function.
     * @returns {Promise<GetSubscriptionsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     *
     * topic.getSubscriptions((err, subscriptions) => {
     *   // subscriptions is an array of `Subscription` objects.
     * });
     *
     * // Customize the query.
     * topic.getSubscriptions({
     *   pageSize: 3
     * }, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.getSubscriptions().then((data) => {
     *   const subscriptions = data[0];
     * });
     */
    getSubscriptions(callback: RequestCallback<Subscription[]>): void;
    getSubscriptions(options: SubscriptionCallOptions, callback: RequestCallback<Subscription[]>): void;
    getSubscriptions(options?: SubscriptionCallOptions): Promise<Subscription[]>;
    /**
     * Publish the provided message.
     *
     * @throws {TypeError} If data is not a Buffer object.
     * @throws {TypeError} If any value in `attributes` object is not a string.
     *
     * @param {buffer} data The message data. This must come in the form of a
     *     Buffer object.
     * @param {object.<string, string>} [attributes] Attributes for this message.
     * @param {PublishCallback} [callback] Callback function.
     * @returns {Promise<PublishResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const data = Buffer.from('Hello, world!');
     *
     * const callback = (err, messageId) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * };
     *
     * topic.publish(data, callback);
     *
     * //-
     * // Optionally you can provide an object containing attributes for the
     * // message. Note that all values in the object must be strings.
     * //-
     * const attributes = {
     *   key: 'value'
     * };
     *
     * topic.publish(data, attributes, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.publish(data).then((messageId) => {});
     */
    publish(data: Buffer, attributes?: object): Promise<string>;
    publish(data: Buffer, callback: PublishCallback): void;
    publish(data: Buffer, attributes: object, callback: PublishCallback): void;
    /**
     * Publish the provided JSON. It should be noted that all messages published
     * are done so in the form of a Buffer. This is simply a convenience method
     * that will transform JSON into a Buffer before publishing.
     * {@link Subscription} objects will always return message data in the form of
     * a Buffer, so any JSON published will require manual deserialization.
     *
     * @see Topic#publish
     *
     * @throws {Error} If non-object data is provided.
     *
     * @param {object} json The JSON data to publish.
     * @param {object} [attributes] Attributes for this message.
     * @param {PublishCallback} [callback] Callback function.
     * @returns {Promise<PublishResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     * const topic = pubsub.topic('my-topic');
     *
     * const data = {
     *   foo: 'bar'
     * };
     *
     * const callback = (err, messageId) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * };
     *
     * topic.publishJSON(data, callback);
     *
     * //-
     * // Optionally you can provide an object containing attributes for the
     * // message. Note that all values in the object must be strings.
     * //-
     * const attributes = {
     *   key: 'value'
     * };
     *
     * topic.publishJSON(data, attributes, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * topic.publishJSON(data).then((messageId) => {});
     */
    publishJSON(json: object, attributes?: object): Promise<string>;
    publishJSON(json: object, callback: PublishCallback): void;
    publishJSON(json: object, attributes: object, callback: PublishCallback): void;
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
    setPublishOptions(options: PublishOptions): void;
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
    subscription(name: string, options?: SubscriptionCallOptions): Subscription;
    /**
     * Format the name of a topic. A Topic's full name is in the format of
     * 'projects/{projectId}/topics/{topicName}'.
     *
     * @private
     *
     * @return {string}
     */
    static formatName_(projectId: string, name: string): string;
}
export { PublishOptions };
