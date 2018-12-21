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
/// <reference types="node" />
import { GoogleAuth } from 'google-auth-library';
import * as gax from 'google-gax';
import { Snapshot } from './snapshot';
import { Subscription } from './subscription';
import { Topic, PublishOptions } from './topic';
import { CallOptions } from 'google-gax';
import { Readable } from 'stream';
import { google } from '../proto/pubsub';
import { ServiceError } from 'grpc';
export interface GetSubscriptionMetadataCallback {
    (err: ServiceError | null, res?: google.pubsub.v1.Subscription | null): void;
}
export interface ExistsCallback {
    (err: Error | null, res?: boolean): void;
}
export interface GetCallOptions extends CallOptions {
    autoCreate?: boolean;
}
export interface PushConfig {
    pushEndpoint: string;
    attibutes?: Map<string, string>;
}
export interface SubscriptionCallOptions {
    flowControl?: {
        maxBytes?: number;
        maxMessages?: number;
        allowExcessMessages: boolean;
    };
    maxConnections?: number;
    topic?: Topic;
    ackDeadline?: number;
    autoPaginate?: boolean;
    gaxOpts?: CallOptions;
    batching?: {
        maxBytes?: number;
        maxMessages?: number;
        maxMilliseconds?: number;
    };
}
export interface PublisherCallOptions {
    batching?: {
        maxBytes?: number;
        maxMessages?: number;
        maxMilliseconds?: number;
    };
}
/**
 * @callback CreateTopicCallback
 * @param {?Error} err Request error, if any.
 * @param {Snapshot} snapshot
 * @param {object} apiResponse The full API response.
 */
export interface CreateSnapshotCallback {
    (err: Error | null, snapshot?: Snapshot | null, apiResponse?: google.pubsub.v1.Snapshot): void;
}
/**
 * @typedef {array} CreateSnapshotResponse
 * @property {Snapshot}.
 * @property {object} 1 The full API response.
 */
export declare type CreateSnapshotResponse = [Snapshot, google.pubsub.v1.Snapshot];
export declare type Metadata = any;
/**
 * @typedef {array} CreateTopicResponse
 * @property {Topic} 0 The new {@link Topic}.
 * @property {object} 1 The full API response.
 */
export declare type CreateTopicResponse = [Topic, google.pubsub.v1.Topic];
/**
 * @callback CreateTopicCallback
 * @param {?Error} err Request error, if any.
 * @param {Topic} topic The new {@link Topic}.
 * @param {object} apiResponse The full API response.
 */
export interface CreateTopicCallback {
    (err?: Error | null, topic?: Topic | null, apiResponse?: google.pubsub.v1.Topic): void;
}
/**
 * @callback CreateSubscriptionCallback
 * @param {?Error} err Request error, if any.
 * @param {Subscription} Subscription
 * @param {object} apiResponse The full API response.
 */
export interface CreateSubscriptionCallback {
    (err?: Error | null, subscription?: Subscription | null, apiResponse?: google.pubsub.v1.Subscription): void;
}
export declare type Client = 'PublisherClient' | 'SubscriberClient';
export interface RequestConfig {
    client: Client;
    method: string;
    reqOpts?: object;
    gaxOpts?: CallOptions;
}
export interface GetClientConfig {
    client: Client;
    method?: string;
}
export interface RequestCallback<TResponse> {
    (err?: Error | null, res?: TResponse | null): void;
}
/**
 * @typedef {array} CreateSubscriptionResponse
 * @property {Subscription} 0 The new {@link Subscription}.
 * @property {object} 1 The full API response.
 */
export declare type CreateSubscriptionResponse = [Subscription, google.pubsub.v1.Subscription];
export interface CreateSubscriptionOptions {
    flowControl?: {
        maxBytes?: number;
        maxMessages?: number;
    };
    gaxOpts?: CallOptions;
    /**
     * Duration in seconds.
     */
    messageRetentionDuration?: number;
    pushEndpoint?: string;
}
/**
 * Callback function to PubSub.getClient_().
 * @internal
 */
interface GetClientCallback {
    /**
     * @param err - Error, if any.
     * @param gaxClient - The gax client specified in RequestConfig.client.
     *                    Typed any since it's importing Javascript source.
     */
    (err: Error | null, gaxClient?: gax.ClientStub): void;
}
/**
 * @typedef {object} ClientConfig
 * @property {string} [projectId] The project ID from the Google Developer's
 *     Console, e.g. 'grape-spaceship-123'. We will also check the environment
 *     variable `GCLOUD_PROJECT` for your project ID. If your app is running in
 *     an environment which supports {@link
 * https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
 * Application Default Credentials}, your project ID will be detected
 * automatically.
 * @property {string} [keyFilename] Full path to the a .json, .pem, or .p12 key
 *     downloaded from the Google Developers Console. If you provide a path to a
 *     JSON file, the `projectId` option above is not necessary. NOTE: .pem and
 *     .p12 require you to specify the `email` option as well.
 * @property {string} [apiEndpoint] The `apiEndpoint` from options will set the
 *     host. If not set, the `PUBSUB_EMULATOR_HOST` environment variable from
 *     the gcloud SDK is honored, otherwise the actual API endpoint will be
 *     used.
 * @property {string} [email] Account email address. Required when using a .pem
 *     or .p12 keyFilename.
 * @property {object} [credentials] Credentials object.
 * @property {string} [credentials.client_email]
 * @property {string} [credentials.private_key]
 * @property {boolean} [autoRetry=true] Automatically retry requests if the
 *     response is related to rate limits or certain intermittent server errors.
 *     We will exponentially backoff subsequent requests by default.
 * @property {number} [maxRetries=3] Maximum number of automatic retries
 *     attempted before returning the error.
 * @property {Constructor} [promise] Custom promise module to use instead of
 *     native Promises.
 */
/**
 * [Cloud Pub/Sub](https://developers.google.com/pubsub/overview) is a
 * reliable, many-to-many, asynchronous messaging service from Cloud
 * Platform.
 *
 * @class
 *
 * @see [Cloud Pub/Sub overview]{@link https://developers.google.com/pubsub/overview}
 *
 * @param {ClientConfig} [options] Configuration options.
 *
 * @example <caption>Import the client library</caption>
 * const {PubSub} = require('@google-cloud/pubsub');
 *
 * @example <caption>Create a client that uses <a
 * href="https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application">Application
 * Default Credentials (ADC)</a>:</caption> const pubsub = new PubSub();
 *
 * @example <caption>Create a client with <a
 * href="https://cloud.google.com/docs/authentication/production#obtaining_and_providing_service_account_credentials_manually">explicit
 * credentials</a>:</caption> const pubsub = new PubSub({ projectId:
 * 'your-project-id', keyFilename: '/path/to/keyfile.json'
 * });
 *
 * @example <caption>include:samples/quickstart.js</caption>
 * region_tag:pubsub_quickstart_create_topic
 * Full quickstart example:
 */
export declare class PubSub {
    options: any;
    isEmulator: boolean;
    api: {
        [key: string]: gax.ClientStub;
    };
    auth: GoogleAuth;
    projectId: string;
    Promise?: PromiseConstructor;
    getSubscriptionsStream: () => Readable;
    getSnapshotsStream: () => Readable;
    getTopicsStream: () => Readable;
    constructor(options?: any);
    createSubscription(topic: Topic | string, name: string, options?: CreateSubscriptionOptions): Promise<CreateSubscriptionResponse>;
    createSubscription(topic: Topic | string, name: string, options: CreateSubscriptionOptions, callback: CreateSubscriptionCallback): void;
    createSubscription(topic: Topic | string, name: string, callback: CreateSubscriptionCallback): void;
    createTopic(name: string, gaxOpts: CallOptions): Promise<CreateTopicResponse>;
    createTopic(name: string, gaxOpts: CallOptions, callback?: CreateTopicCallback): void;
    createTopic(name: string, callback: CreateTopicCallback): void;
    /**
     * Determine the appropriate endpoint to use for API requests, first trying
     * the local `apiEndpoint` parameter. If the `apiEndpoint` parameter is null
     * we try Pub/Sub emulator environment variable (PUBSUB_EMULATOR_HOST),
     * otherwise the default JSON API.
     *
     * @private
     */
    determineBaseUrl_(): void;
    /**
     * Query object for listing snapshots.
     *
     * @typedef {object} GetSnapshotsRequest
     * @property {boolean} [autoPaginate=true] Have pagination handled
     *     automatically.
     * @property {object} [options.gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @property {number} [options.pageSize] Maximum number of results to return.
     * @property {string} [options.pageToken] Page token.
     */
    /**
     * @typedef {array} GetSnapshotsResponse
     * @property {Snapshot[]} 0 Array of {@link Snapshot} instances.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetSnapshotsCallback
     * @param {?Error} err Request error, if any.
     * @param {Snapshot[]} snapshots Array of {@link Snapshot} instances.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get a list of snapshots.
     *
     * @param {GetSnapshotsRequest} [query] Query object for listing snapshots.
     * @param {GetSnapshotsCallback} [callback] Callback function.
     * @returns {Promise<GetSnapshotsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * pubsub.getSnapshots(function(err, snapshots) {
     *   if (!err) {
     *     // snapshots is an array of Snapshot objects.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * pubsub.getSnapshots().then(function(data) {
     *   const snapshots = data[0];
     * });
     */
    getSnapshots(options?: any, callback?: any): void;
    /**
     * Query object for listing subscriptions.
     *
     * @typedef {object} GetSubscriptionsRequest
     * @property {boolean} [autoPaginate=true] Have pagination handled
     *     automatically.
     * @property {object} [options.gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @property {number} [options.pageSize] Maximum number of results to return.
     * @property {string} [options.pageToken] Page token.
     * @param {string|Topic} options.topic - The name of the topic to
     *     list subscriptions from.
     */
    /**
     * @typedef {array} GetSubscriptionsResponse
     * @property {Subscription[]} 0 Array of {@link Subscription} instances.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetSubscriptionsCallback
     * @param {?Error} err Request error, if any.
     * @param {Subscription[]} subscriptions Array of {@link Subscription} instances.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get a list of the subscriptions registered to all of your project's topics.
     * You may optionally provide a query object as the first argument to
     * customize the response.
     *
     * Your provided callback will be invoked with an error object if an API error
     * occurred or an array of {@link Subscription} objects.
     *
     * To get subscriptions for a topic, see {@link Topic}.
     *
     * @see [Subscriptions: list API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/list}
     *
     * @param {GetSubscriptionsRequest} [query] Query object for listing subscriptions.
     * @param {GetSubscriptionsCallback} [callback] Callback function.
     * @returns {Promise<GetSubscriptionsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * pubsub.getSubscriptions(function(err, subscriptions) {
     *   if (!err) {
     *     // subscriptions is an array of Subscription objects.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * pubsub.getSubscriptions().then(function(data) {
     *   const subscriptions = data[0];
     * });
     */
    getSubscriptions(options: any, callback?: any): any;
    /**
     * Query object for listing topics.
     *
     * @typedef {object} GetTopicsRequest
     * @property {boolean} [autoPaginate=true] Have pagination handled
     *     automatically.
     * @property {object} [options.gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @property {number} [options.pageSize] Maximum number of results to return.
     * @property {string} [options.pageToken] Page token.
     */
    /**
     * @typedef {array} GetTopicsResponse
     * @property {Topic[]} 0 Array of {@link Topic} instances.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetTopicsCallback
     * @param {?Error} err Request error, if any.
     * @param {Topic[]} topics Array of {@link Topic} instances.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get a list of the topics registered to your project. You may optionally
     * provide a query object as the first argument to customize the response.
     *
     * @see [Topics: list API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics/list}
     *
     * @param {GetTopicsRequest} [query] Query object for listing topics.
     * @param {GetTopicsCallback} [callback] Callback function.
     * @returns {Promise<GetTopicsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * pubsub.getTopics(function(err, topics) {
     *   if (!err) {
     *     // topics is an array of Topic objects.
     *   }
     * });
     *
     * //-
     * // Customize the query.
     * //-
     * pubsub.getTopics({
     *   pageSize: 3
     * }, function(err, topics) {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * pubsub.getTopics().then(function(data) {
     *   const topics = data[0];
     * });
     */
    getTopics(options: any, callback?: any): void;
    /**
     * Get the PubSub client object.
     *
     * @private
     *
     * @param {object} config Configuration object.
     * @param {object} config.gaxOpts GAX options.
     * @param {function} config.method The gax method to call.
     * @param {object} config.reqOpts Request options.
     * @param {function} [callback] The callback function.
     */
    getClient_(config: GetClientConfig, callback: GetClientCallback): void;
    /**
     * Funnel all API requests through this method, to be sure we have a project
     * ID.
     *
     * @private
     *
     * @param {object} config Configuration object.
     * @param {object} config.gaxOpts GAX options.
     * @param {function} config.method The gax method to call.
     * @param {object} config.reqOpts Request options.
     * @param {function} [callback] The callback function.
     */
    request<TResponse = any>(config: RequestConfig, callback: RequestCallback<TResponse>): void;
    /**
     * Create a Snapshot object. See {@link Subscription#createSnapshot} to
     * create a snapshot.
     *
     * @throws {Error} If a name is not provided.
     *
     * @param {string} name The name of the snapshot.
     * @returns {Snapshot} A {@link Snapshot} instance.
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const snapshot = pubsub.snapshot('my-snapshot');
     */
    snapshot(name: string): Snapshot;
    /**
     * Create a Subscription object. This command by itself will not run any API
     * requests. You will receive a {@link Subscription} object,
     * which will allow you to interact with a subscription.
     *
     * @throws {Error} If subscription name is omitted.
     *
     * @param {string} name Name of the subscription.
     * @param {SubscriberOptions} [options] Subscription options.
     * @returns {Subscription} A {@link Subscription} instance.
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const subscription = pubsub.subscription('my-subscription');
     *
     * // Register a listener for `message` events.
     * subscription.on('message', function(message) {
     *   // Called every time a message is received.
     *   // message.id = ID of the message.
     *   // message.ackId = ID used to acknowledge the message receival.
     *   // message.data = Contents of the message.
     *   // message.attributes = Attributes of the message.
     *   // message.publishTime = Date when Pub/Sub received the message.
     * });
     */
    subscription(name: string, options?: any): Subscription;
    /**
     * Create a Topic object. See {@link PubSub#createTopic} to create a topic.
     *
     * @throws {Error} If a name is not provided.
     *
     * @param {string} name The name of the topic.
     * @returns {Topic} A {@link Topic} instance.
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     */
    topic(name: string, options?: PublishOptions): Topic;
}
export { Subscription, Topic, PublishOptions };
