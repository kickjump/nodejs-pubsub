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
import { ServiceError } from 'grpc';
import { Topic } from './topic';
export interface PublishCallback {
    (err: null | ServiceError, messageId: string): void;
}
/**
 * @typedef BatchPublishOptions
 * @property {number} [maxBytes=1024^2 * 5] The maximum number of bytes to
 *     buffer before sending a payload.
 * @property {number} [maxMessages=1000] The maximum number of messages to
 *     buffer before sending a payload.
 * @property {number} [maxMilliseconds=100] The maximum duration to wait before
 *     sending a payload.
 */
interface BatchPublishOptions {
    maxBytes?: number;
    maxMessages?: number;
    maxMilliseconds?: number;
}
/**
 * @typedef PublishOptions
 * @property {BatchPublishOptions} [batching] Batching settings.
 * @property {object} [gaxOpts] Request configuration options, outlined
 *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
 */
export interface PublishOptions {
    batching?: BatchPublishOptions;
    gaxOpts?: CallOptions;
}
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
export declare class Publisher {
    Promise?: PromiseConstructor;
    topic: Topic;
    inventory_: any;
    settings: PublishOptions;
    timeoutHandle_?: NodeJS.Timer;
    constructor(topic: Topic, options?: PublishOptions);
    /**
     * @typedef {array} PublishResponse
     * @property {string} 0 The id for the message.
     */
    /**
     * @callback PublishCallback
     * @param {?Error} err Request error, if any.
     * @param {string} messageId The id for the message.
     */
    /**
     * Publish the provided message.
     *
     * @private
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
     * const publisher = topic.publisher();
     *
     * const data = Buffer.from('Hello, world!');
     *
     * const callback = (err, messageId) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * };
     *
     * publisher.publish(data, callback);
     *
     * //-
     * // Optionally you can provide an object containing attributes for the
     * // message. Note that all values in the object must be strings.
     * //-
     * const attributes = {
     *   key: 'value'
     * };
     *
     * publisher.publish(data, attributes, callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * publisher.publish(data).then((messageId) => {});
     */
    publish(data: Buffer, attributes?: object): Promise<string>;
    publish(data: Buffer, callback: PublishCallback): void;
    publish(data: Buffer, attributes: object, callback: PublishCallback): void;
    /**
     * Sets the Publisher options.
     *
     * @private
     *
     * @param {PublishOptions} options The publisher options.
     */
    setOptions(options?: PublishOptions): void;
    /**
     * This publishes a batch of messages and should never be called directly.
     *
     * @private
     */
    publish_(): void;
    /**
     * Queues message to be sent to the server.
     *
     * @private
     *
     * @param {buffer} data The message data.
     * @param {object} attributes The message attributes.
     * @param {function} callback The callback function.
     */
    queue_(data: any, attrs: any, callback: any): void;
}
export {};
