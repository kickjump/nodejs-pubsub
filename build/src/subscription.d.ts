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
import { EventEmitter } from 'events';
import { CallOptions } from 'google-gax';
import { google } from '../proto/pubsub';
import { CreateSnapshotCallback, CreateSnapshotResponse, CreateSubscriptionCallback, CreateSubscriptionResponse, ExistsCallback, GetCallOptions, GetSubscriptionMetadataCallback, Metadata, PubSub, PushConfig, RequestCallback, SubscriptionCallOptions } from '.';
import { IAM } from './iam';
import { Snapshot } from './snapshot';
import { SubscriberOptions } from './subscriber';
/**
 * @typedef {object} ExpirationPolicy
 * A policy that specifies the conditions for this subscription's expiration. A
 * subscription is considered active as long as any connected subscriber is
 * successfully consuming messages from the subscription or is issuing
 * operations on the subscription. If expirationPolicy is not set, a default
 * policy with ttl of 31 days will be used. The minimum allowed value for
 * expirationPolicy.ttl is 1 day. BETA: This feature is part of a beta release.
 * This API might be changed in backward-incompatible ways and is not
 * recommended for production use. It is not subject to any SLA or deprecation
 * policy.
 * @property {string} ttl Specifies the "time-to-live" duration for an associated
 * resource. The resource expires if it is not active for a period of ttl. The
 * eeedefinition of "activity" depends on the type of the associated resource.
 * The minimum and maximum allowed values for ttl depend on the type of the
 * associated resource, as well. If ttl is not set, the associated resource
 * never expires. A duration in seconds with up to nine fractional digits,
 * terminated by 's'. Example: "3.5s".
 */
/**
 * @see https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions#PushConfig
 */
export interface PushConfig {
    pushEndpoint: string;
    attributes?: {
        [key: string]: string;
    };
}
/**
 * @see https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#google.protobuf.Duration
 */
export interface Duration {
    seconds: number;
    nanos: number;
}
/**
 * @see https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
 */
export interface TSubscriptionMetadata {
    name: string;
    topic: string;
    pushConfig?: PushConfig;
    ackDeadlineSeconds?: number;
    retainAckedMessages?: boolean;
    labels?: {
        [key: string]: string;
    };
    expirationPolicy?: {
        ttl: string;
    };
}
export interface SubscriptionMetadataRaw extends TSubscriptionMetadata {
    /**
     * Duration in seconds.
     */
    messageRetentionDuration?: number;
    pushEndpoint?: string;
}
export interface SubscriptionMetadata extends TSubscriptionMetadata {
    messageRetentionDuration?: Duration;
}
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
export declare class Subscription extends EventEmitter {
    pubsub: PubSub;
    create: Function;
    iam: IAM;
    name: string;
    metadata: Metadata;
    request: Function;
    private _subscriber;
    constructor(pubsub: PubSub, name: string, options?: SubscriptionCallOptions);
    /**
     * Indicates if the Subscription is open and receiving messages.
     *
     * @type {boolean}
     */
    readonly isOpen: boolean;
    /**
     * @type {string}
     */
    readonly projectId: string;
    /**
     * Closes the Subscription, once this is called you will no longer receive
     * message events unless you call {Subscription#open} or add new message
     * listeners.
     *
     * @param {function} [callback] The callback function.
     * @param {?error} callback.err An error returned while closing the
     *     Subscription.
     *
     * @example
     * subscription.close(err => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * });
     *
     * // If the callback is omitted a Promise will be returned.
     * subscription.close().then(() => {});
     */
    close(): Promise<void>;
    close(callback: RequestCallback<void>): void;
    /**
     * @typedef {array} CreateSnapshotResponse
     * @property {Snapshot} 0 The new {@link Snapshot}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback CreateSnapshotCallback
     * @param {?Error} err Request error, if any.
     * @param {Snapshot} snapshot The new {@link Snapshot}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Create a snapshot with the given name.
     *
     * @param {string} name Name of the snapshot.
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {CreateSnapshotCallback} [callback] Callback function.
     * @returns {Promise<CreateSnapshotResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * const callback = (err, snapshot, apiResponse) => {
     *   if (!err) {
     *     // The snapshot was created successfully.
     *   }
     * };
     *
     * subscription.createSnapshot('my-snapshot', callback);
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.createSnapshot('my-snapshot').then((data) => {
     *   const snapshot = data[0];
     *   const apiResponse = data[1];
     * });
     */
    createSnapshot(name: string, callback: CreateSnapshotCallback): void;
    createSnapshot(name: string, gaxOpts?: CallOptions): Promise<CreateSnapshotResponse>;
    createSnapshot(name: string, gaxOpts: CallOptions, callback: CreateSnapshotCallback): void;
    /**
     * Delete the subscription. Pull requests from the current subscription will
     * be errored once unsubscription is complete.
     *
     * @see [Subscriptions: delete API Documentation]{@link https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/delete}
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
     * const subscription = topic.subscription('my-subscription');
     *
     * subscription.delete((err, apiResponse) => {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.delete().then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    delete(callback: RequestCallback<google.protobuf.Empty>): void;
    delete(gaxOpts?: CallOptions): Promise<google.protobuf.Empty>;
    delete(gaxOpts: CallOptions, callback: RequestCallback<google.protobuf.Empty>): void;
    /**
     * @typedef {array} SubscriptionExistsResponse
     * @property {boolean} 0 Whether the subscription exists
     */
    /**
     * @callback SubscriptionExistsCallback
     * @param {?Error} err Request error, if any.
     * @param {boolean} exists Whether the subscription exists.
     */
    /**
     * Check if a subscription exists.
     *
     * @param {SubscriptionExistsCallback} [callback] Callback function.
     * @returns {Promise<SubscriptionExistsResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * subscription.exists((err, exists) => {});
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.exists().then((data) => {
     *   const exists = data[0];
     * });
     */
    exists(): Promise<boolean>;
    exists(callback: ExistsCallback): void;
    /**
     * @typedef {array} GetSubscriptionResponse
     * @property {Subscription} 0 The {@link Subscription}.
     * @property {object} 1 The full API response.
     */
    /**
     * @callback GetSubscriptionCallback
     * @param {?Error} err Request error, if any.
     * @param {Subscription} subscription The {@link Subscription}.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Get a subscription if it exists.
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {boolean} [gaxOpts.autoCreate=false] Automatically create the
     *     subscription if it does not already exist.
     * @param {GetSubscriptionCallback} [callback] Callback function.
     * @returns {Promise<GetSubscriptionResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * subscription.get((err, subscription, apiResponse) => {
     *   // The `subscription` data has been populated.
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.get().then((data) => {
     *   const subscription = data[0];
     *   const apiResponse = data[1];
     * });
     */
    get(callback: CreateSubscriptionCallback): void;
    get(gaxOpts?: GetCallOptions): Promise<CreateSubscriptionResponse>;
    get(gaxOpts: GetCallOptions, callback: CreateSubscriptionCallback): void;
    /**
     * @typedef {array} GetSubscriptionMetadataResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback GetSubscriptionMetadataCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Fetches the subscriptions metadata.
     *
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {GetSubscriptionMetadataCallback} [callback] Callback function.
     * @returns {Promise<GetSubscriptionMetadataResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * subscription.getMetadata((err, apiResponse) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.getMetadata().then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    getMetadata(gaxOpts?: CallOptions): Promise<google.pubsub.v1.Subscription>;
    getMetadata(callback: GetSubscriptionMetadataCallback): void;
    getMetadata(gaxOpts: CallOptions, callback: GetSubscriptionMetadataCallback): void;
    /**
     * @typedef {array} ModifyPushConfigResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback ModifyPushConfigCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Modify the push config for the subscription.
     *
     * @param {object} config The push config.
     * @param {string} config.pushEndpoint A URL locating the endpoint to which
     *     messages should be published.
     * @param {object} config.attributes [PushConfig attributes](https://cloud.google.com/pubsub/docs/reference/rpc/google.pubsub.v1#google.pubsub.v1.PushConfig).
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {ModifyPushConfigCallback} [callback] Callback function.
     * @returns {Promise<ModifyPushConfigResponse>}
     *
     * @example
     * const {PubSub} = require('@google-cloud/pubsub');
     * const pubsub = new PubSub();
     *
     * const topic = pubsub.topic('my-topic');
     * const subscription = topic.subscription('my-subscription');
     *
     * const pushConfig = {
     *   pushEndpoint: 'https://mydomain.com/push',
     *   attributes: {
     *     key: 'value'
     *   }
     * };
     *
     * subscription.modifyPushConfig(pushConfig, (err, apiResponse) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.modifyPushConfig(pushConfig).then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    modifyPushConfig(config: PushConfig, gaxOpts?: CallOptions): Promise<google.protobuf.Empty>;
    modifyPushConfig(config: PushConfig, callback: RequestCallback<google.protobuf.Empty>): void;
    modifyPushConfig(config: PushConfig, gaxOpts: CallOptions, callback: RequestCallback<google.protobuf.Empty>): void;
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
    open(): void;
    /**
     * @typedef {array} SeekResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback SeekCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Seeks an existing subscription to a point in time or a given snapshot.
     *
     * @param {string|date} snapshot The point to seek to. This will accept the
     *     name of the snapshot or a Date object.
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {SeekCallback} [callback] Callback function.
     * @returns {Promise<SeekResponse>}
     *
     * @example
     * const callback = (err, resp) => {
     *   if (!err) {
     *     // Seek was successful.
     *   }
     * };
     *
     * subscription.seek('my-snapshot', callback);
     *
     * //-
     * // Alternatively, to specify a certain point in time, you can provide a
     * Date
     * // object.
     * //-
     * const date = new Date('October 21 2015');
     *
     * subscription.seek(date, callback);
     */
    seek(snapshot: string | Date, gaxOpts?: CallOptions): Promise<google.pubsub.v1.ISeekResponse>;
    seek(snapshot: string | Date, callback: google.pubsub.v1.ISeekResponse): void;
    seek(snapshot: string | Date, gaxOpts: CallOptions, callback: google.pubsub.v1.ISeekResponse): void;
    /**
     * @typedef {array} SetSubscriptionMetadataResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback SetSubscriptionMetadataCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Update the subscription object.
     *
     * @param {object} metadata The subscription metadata.
     * @param {object} [gaxOpts] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/CallSettings.html.
     * @param {SetSubscriptionMetadataCallback} [callback] Callback function.
     * @returns {Promise<SetSubscriptionMetadataResponse>}
     *
     * @example
     * const metadata = {
     *   key: 'value'
     * };
     *
     * subscription.setMetadata(metadata, (err, apiResponse) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * subscription.setMetadata(metadata).then((data) => {
     *   const apiResponse = data[0];
     * });
     */
    setMetadata(metadata: Metadata, gaxOpts?: CallOptions): Promise<google.pubsub.v1.Subscription>;
    setMetadata(metadata: Metadata, callback: RequestCallback<google.pubsub.v1.Subscription>): void;
    setMetadata(metadata: Metadata, gaxOpts: CallOptions, callback: RequestCallback<google.pubsub.v1.Subscription>): void;
    /**
     * Sets the Subscription options.
     *
     * @param {SubscriberOptions} options The options.
     */
    setOptions(options: SubscriberOptions): void;
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
    snapshot(name: string): Snapshot;
    /**
     * Watches for incoming message event handlers and open/closes the
     * subscriber as needed.
     *
     * @private
     */
    private _listen;
    /*!
     * Formats Subscription metadata.
     *
     * @private
     */
    static formatMetadata_(metadata: SubscriptionMetadataRaw): SubscriptionMetadata;
    /*!
     * Format the name of a subscription. A subscription's full name is in the
     * format of projects/{projectId}/subscriptions/{subName}.
     *
     * @private
     */
    static formatName_(projectId: string, name: string): string;
}
